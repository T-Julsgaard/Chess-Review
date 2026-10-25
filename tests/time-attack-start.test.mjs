import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {createRunStartSound} from '../lib/learning/run-start-sound.js';

const before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
const puzzle={id:'ready',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:450,themes:[]};
const settle=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
async function setup(t,{motion=true,reduced=false}={}) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={},sounds=[],timers=new Map();
  dom.window.matchMedia=()=>({matches:reduced});
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:motion}),makePiece:()=>dom.window.document.createElement('span')});
  w.runStartSound={prime(){},play:step=>sounds.push(step),stop(){},close(){}};
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  let id=0;
  t.mock.method(dom.window,'setTimeout',(fn,delay)=>{timers.set(++id,{fn,delay});return id;});
  t.mock.method(dom.window,'clearTimeout',id=>timers.delete(id));
  const advance=async delay=>{
    const [id,timer]=[...timers].find(([,timer])=>timer.delay===delay)||[];
    assert.ok(timer,`Expected a ${delay}ms countdown timer`);timers.delete(id);timer.fn();await settle();
  };
  t.after(async()=>{await w.close();dom.window.close();});await w.open();
  return {w,dom,data,sounds,timers,advance};
}

for(const options of [{motion:true},{motion:false},{motion:true,reduced:true}])test(`Time attack gives three seconds to prepare with motion ${JSON.stringify(options)}`,async t=>{
  const {w,sounds,advance}=await setup(t,options),moves=[];
  w.onPuzzleMove=san=>moves.push(san);
  const starting=w.startPuzzleRun('timeAttack');await settle();
  const run=w.run;let now=0;run.clock.now=()=>now;
  const overlay=w.root.querySelector('.puzzle-run-start');
  assert.ok(overlay);assert.equal(overlay.parentElement.classList.contains('learn-board'),true);
  assert.equal(overlay.dataset.motion,options.motion&&!options.reduced?'on':'off');
  assert.equal(overlay.querySelector('.puzzle-run-start-title').textContent,'Time attack');
  assert.equal(w.currentFen(),puzzle.setup.fen,'The opponent waits for the countdown');
  assert.equal(w.busy,true);assert.equal(run.clock.started,false);assert.equal(w.puzzleThinkingAt==null,true);
  for(const step of [3,2,1]){
    assert.equal(overlay.querySelector('strong').textContent,String(step));
    assert.equal(w.puzzleRunStarting(),true);assert.equal(w.clockText(),'3:00');
    assert.equal(w.currentFen(),puzzle.setup.fen);assert.equal(w.opponentPlaying,false);
    assert.deepEqual(moves,[],'No opening move or sound before Go');
    await w.submitPuzzle('e4d5');await w.queuePuzzlePremove('e4d5');
    assert.equal(run.correctMoves,0);assert.equal(w.premove==null,true);
    w.render();assert.equal(w.root.querySelector('.puzzle-run-start'),overlay,'Renders preserve the live countdown');
    now+=1000;await advance(1000);
  }
  await starting;
  assert.equal(w.currentFen(),puzzle.fen);assert.deepEqual(moves,['d5']);
  assert.equal(overlay.querySelector('strong').textContent,'Go!');
  assert.deepEqual(sounds,['3','2','1','Go!']);
  assert.equal(w.puzzleRunStarting(),false);assert.equal(w.busy,false);
  assert.equal(run.clock.started,true);assert.equal(run.clock.remaining(),180000);
  assert.notEqual(w.puzzleThinkingAt,null);
  await advance(300);assert.equal(overlay.isConnected,false);assert.equal(w.cancelRunStart,null);
  await w.submitPuzzle('e4d5');assert.equal(run.correctMoves,1);
  assert.equal(w.root.querySelector('.puzzle-run-start'),null,'Later moves do not repeat the introduction');
});

for(const action of ['overview','navigation','close'])test(`leaving through ${action} cancels the countdown without a late Go`,async t=>{
  const {w,sounds,timers,data}=await setup(t);
  const starting=w.startPuzzleRun('timeAttack');await settle();
  const run=w.run;
  if(action==='overview')w.root.querySelector('[data-focus=puzzle-overview]').click();
  else if(action==='navigation')await w.navigate('openings');
  else await w.close();
  await settle();await starting;
  assert.equal(run.clock.started,false);assert.equal(w.run,null);assert.equal(w.runStartOverlay,null);
  assert.equal(w.root.querySelector('.puzzle-run-start'),null);assert.equal(w.cancelRunStart,null);
  assert.equal(timers.size,0);assert.deepEqual(sounds,['3']);assert.equal(w.puzzleThinkingAt==null,true);
  assert.equal(data['learning:v1'].challenges.at(-1).solved,0);
});

test('Play again gets a fresh countdown and Knockout starts directly',async t=>{
  const {w,advance,sounds}=await setup(t);
  for(let attempt=0;attempt<2;attempt++){
    const starting=w.startPuzzleRun('timeAttack',{again:!!attempt});await settle();
    assert.equal(w.root.querySelector('.puzzle-run-start strong').textContent,'3');
    for(let i=0;i<3;i++)await advance(1000);
    await starting;await advance(300);await w.finishChallenge('Time is up');
  }
  assert.deepEqual(sounds,['3','2','1','Go!','3','2','1','Go!']);
  await w.startPuzzleRun('knockout');
  assert.equal(w.root.querySelector('.puzzle-run-start'),null);assert.equal(w.busy,false);
  assert.equal(sounds.length,8);
});

function audioFixture() {
  const notes=[],contexts=[],settings={sound:true,soundVolume:50};
  class AudioContext {
    constructor(){this.state='running';this.currentTime=4;this.destination={};contexts.push(this);}
    createOscillator(){const note={frequency:{},type:'',connect(){},disconnect(){note.disconnected=true;},start(at){note.started=at;},stop(at){note.stopped=at;}};notes.push(note);return note;}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(value){notes.at(-1).volume=value;},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
    close(){this.state='closed';return Promise.resolve();}
  }
  return {notes,contexts,settings,sound:createRunStartSound({AudioContext},()=>settings)};
}

test('synthesized ticks and Go chord obey live mute/volume and release audio resources',()=>{
  const {sound,settings,notes,contexts}=audioFixture();
  sound.prime();sound.play('3');assert.equal(notes.length,1);assert.equal(notes[0].frequency.value,440);assert.equal(notes[0].volume,.09);
  sound.play('Go!');assert.equal(notes[0].disconnected,true);
  assert.deepEqual(notes.slice(1).map(n=>n.frequency.value),[660,880]);
  settings.sound=false;sound.play('2');assert.equal(notes.length,3);assert.ok(notes.every(n=>n.disconnected));
  settings.sound=true;settings.soundVolume=0;sound.play('1');assert.equal(notes.length,3);
  settings.soundVolume=100;sound.play('1');assert.equal(notes.at(-1).volume,.18);
  sound.close();assert.equal(notes.at(-1).disconnected,true);assert.equal(contexts[0].state,'closed');
});

test('muted or unavailable audio never prevents the intro',()=>{
  const {sound,settings,contexts}=audioFixture();settings.sound=false;sound.prime();sound.play('3');assert.equal(contexts.length,0);
  const unavailable=createRunStartSound({},()=>({sound:true}));
  assert.doesNotThrow(()=>{unavailable.prime();unavailable.play('Go!');unavailable.close();});
});

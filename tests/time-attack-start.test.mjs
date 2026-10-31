import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {createRunStartSound} from '../lib/learning/run-start-sound.js';
import {knockoutCue} from '../lib/learning/knockout-sound.js';
import {runStartOverlay,updateRunStartStep} from '../lib/learning/run-animations.js';
import {app,loadGame} from './helpers/app.mjs';

const before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
const puzzle={id:'ready',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:450,themes:[]};
const settle=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
async function setup(t,{motion=true,reduced=false,style}={}) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={},sounds=[],cues=[],timers=new Map();
  dom.window.matchMedia=()=>({matches:reduced});
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const settings={moveAnim:motion,uiAnim:motion,puzzleStartAnimation:style};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>settings,makePiece:()=>dom.window.document.createElement('span')});
  w.runStartSound={prime(){},play(step,mode){sounds.push(step);cues.push([step,mode]);},stop(){},close(){}};
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  let id=0;
  t.mock.method(dom.window,'setTimeout',(fn,delay)=>{timers.set(++id,{fn,delay});return id;});
  t.mock.method(dom.window,'clearTimeout',id=>timers.delete(id));
  const advance=async delay=>{
    const [id,timer]=[...timers].find(([,timer])=>timer.delay===delay)||[];
    assert.ok(timer,`Expected a ${delay}ms countdown timer`);timers.delete(id);timer.fn();await settle();
  };
  t.after(async()=>{await w.close();dom.window.close();});await w.open();
  return {w,dom,data,sounds,cues,timers,advance,settings};
}

for(const options of [{motion:true},{motion:false},{motion:true,reduced:true},...['pulse','rings','still'].map(style=>({motion:true,style}))])test(`Time attack gives three seconds to prepare with motion ${JSON.stringify(options)}`,async t=>{
  const {w,sounds,advance}=await setup(t,options),moves=[];
  w.onPuzzleMove=san=>moves.push(san);
  const starting=w.startPuzzleRun('timeAttack');await settle();
  const run=w.run;let now=0;run.clock.now=()=>now;
  const overlay=w.root.querySelector('.puzzle-run-start');
  assert.ok(overlay);assert.equal(overlay.parentElement.classList.contains('learn-board'),true);
  assert.equal(overlay.dataset.motion,options.motion&&!options.reduced?'on':'off');
  assert.equal(overlay.dataset.style,'flip','Flip also replaces saved animation choices');
  assert.equal(overlay.querySelector('.puzzle-run-start-title').textContent,'Get ready');
  assert.equal(overlay.querySelector('.puzzle-run-start-copy'),null);
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
  await advance(600);assert.equal(overlay.isConnected,false);assert.equal(w.cancelRunStart,null);
  await w.submitPuzzle('e4d5');assert.equal(run.correctMoves,1);
  assert.equal(w.root.querySelector('.puzzle-run-start'),null,'Later moves do not repeat the introduction');
});

for(const mode of ['timeAttack','knockout'])for(const action of ['overview','navigation','close'])test(`${mode} leaving through ${action} cancels the intro without a late Go`,async t=>{
  const {w,sounds,timers,data}=await setup(t);
  const starting=w.startPuzzleRun(mode);await settle();
  const run=w.run;
  if(action==='overview')w.root.querySelector('[data-focus=puzzle-overview]').click();
  else if(action==='navigation')await w.navigate('openings');
  else await w.close();
  await settle();await starting;
  assert.equal(run.clock?.started||false,false);assert.equal(w.run,null);assert.equal(w.runStartOverlay,null);
  assert.equal(w.root.querySelector('.puzzle-run-start'),null);assert.equal(w.cancelRunStart,null);
  assert.equal(timers.size,0);assert.deepEqual(sounds,[mode==='knockout'?'Ready':'3']);assert.equal(w.puzzleThinkingAt==null,true);
  assert.equal(data['learning:v1'].challenges.at(-1).solved,0);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} Play again gets a fresh intro`,async t=>{
  const {w,advance,sounds}=await setup(t);
  for(let attempt=0;attempt<2;attempt++){
    const starting=w.startPuzzleRun(mode,{again:!!attempt});await settle();
    assert.equal(w.root.querySelector('.puzzle-run-start strong').textContent,mode==='knockout'?'Ready':'3');
    for(let i=0;i<(mode==='knockout'?1:3);i++)await advance(1000);
    await starting;await advance(mode==='knockout'?900:600);await w.finishChallenge('Ended early');
  }
  assert.deepEqual(sounds,mode==='knockout'?['Ready','Go!','Ready','Go!']:['3','2','1','Go!','3','2','1','Go!']);
});

for(const options of [{motion:true},{motion:false},{motion:true,reduced:true}])test(`Knockout prepares one life before the bell ${JSON.stringify(options)}`,async t=>{
  const {w,advance,cues}=await setup(t,options),moves=[];
  w.onPuzzleMove=san=>moves.push(san);
  const starting=w.startPuzzleRun('knockout');await settle();
  const overlay=w.runStartOverlay;
  assert.equal(overlay.dataset.mode,'knockout');assert.equal(overlay.dataset.step,'Ready');
  assert.equal(overlay.querySelector('strong').textContent,'Ready');
  assert.ok([...overlay.querySelectorAll('.puzzle-flip > span')].every(p=>p.dataset.value==='Ready'));
  assert.equal(overlay.dataset.motion,options.motion&&!options.reduced?'on':'off');
  assert.equal(overlay.querySelector('.puzzle-run-start-title').textContent,'One life');
  assert.equal(overlay.querySelector('.puzzle-run-ticket-note').textContent,'Sudden death');
  assert.match(overlay.querySelector('[role=status]').textContent,/Knockout\. One life/);
  assert.equal(w.run.lives,1);assert.equal(w.run.clock,null);assert.equal(w.busy,true);
  assert.equal(w.currentFen(),puzzle.setup.fen);assert.deepEqual(moves,[]);
  await w.submitPuzzle('e4d5');await w.queuePuzzlePremove('e4d5');
  assert.equal(w.run.correctMoves,0);assert.equal(w.premove==null,true);
  w.render();assert.equal(w.runStartOverlay,overlay);assert.equal(overlay.isConnected,true);
  await advance(1000);await starting;
  assert.equal(overlay.dataset.step,'Go!');assert.equal(w.busy,false);assert.deepEqual(moves,['d5']);
  assert.deepEqual(cues,[['Ready','knockout'],['Go!','knockout']]);
  assert.ok([...overlay.querySelectorAll('.puzzle-flip > span')].every(p=>p.dataset.value==='Go!'));
  await advance(900);assert.equal(overlay.isConnected,false);
  await w.submitPuzzle('e4d5');assert.equal(w.run.correctMoves,1);
});

test('flip panels carry the old and new digits and settle on a complete Go',async t=>{
  const {w,advance}=await setup(t);
  const starting=w.startPuzzleRun('timeAttack');await settle();
  const overlay=w.runStartOverlay;
  for(const [previous,next] of [['3','2'],['2','1']]){
    await advance(1000);
    assert.equal(overlay.querySelector('.puzzle-flip-top').dataset.value,next);
    assert.equal(overlay.querySelector('.puzzle-flip-in').dataset.value,next);
    assert.equal(overlay.querySelector('.puzzle-flip-out').dataset.value,previous);
    assert.equal(overlay.querySelector('.puzzle-flip-bottom').dataset.value,previous);
  }
  await advance(1000);await starting;
  assert.ok([...overlay.querySelectorAll('.puzzle-flip > span')].every(part=>part.dataset.value==='Go!'));
  await advance(600);assert.equal(overlay.isConnected,false);
});

test('embedded board redraws keep the countdown connected through Go',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace'),board=w.boardElement;
  const overlay=runStartOverlay(w.h);w.runStartOverlay=overlay;board.append(overlay);
  const observer=new a.dom.window.MutationObserver(()=>{});observer.observe(board,{childList:true});
  for(const label of ['3','2','1','Go!']){
    updateRunStartStep(overlay,label);w.render();
    assert.equal(overlay.parentElement,board);
    assert.equal(observer.takeRecords().some(record=>[...record.removedNodes,...record.addedNodes].includes(overlay)),false,'The overlay must never be detached or moved');
  }
  observer.disconnect();w.runStartOverlay=null;overlay.remove();await w.close();
});

test('the ending brings the board into view when narrow-screen results are below it',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');
  w.result={mode:'knockout',solved:7,reason:'Out of lives'};
  w.root.classList.add('learn-stacked');w.root.style.setProperty('--learn-panel-y','400px');w.root.scrollTop=400;
  w.showPuzzleRunEnd();assert.equal(w.root.scrollTop,0);
  assert.equal(w.boardElement.querySelector('.puzzle-end-score').getAttribute('aria-label'),'7 puzzles solved');
  await w.close();
});

for(const mode of ['timeAttack','knockout'])for(const style of [undefined,'classic','ribbon','spotlight','still'])test(`${mode} uses Flip with saved style ${style} and refreshes its motion setting`,async t=>{
  const {w,settings,advance,timers}=await setup(t);
  settings.puzzleEndAnimation=style;
  const starting=w.startPuzzleRun(mode);await settle();
  for(let i=0;i<(mode==='knockout'?1:3);i++)await advance(1000);
  await starting;w.run.solved=12;await w.finishChallenge('Out of lives');
  const overlay=w.root.querySelector('.puzzle-run-end');
  assert.equal(overlay.dataset.style,'flip');assert.equal(overlay.dataset.motion,'on');
  assert.equal(overlay.querySelector('.puzzle-run-end-title').textContent,'Puzzles solved');
  assert.equal(overlay.querySelector('.puzzle-run-end-reason'),null);
  assert.equal(overlay.querySelector('.puzzle-end-score-caption'),null);
  assert.equal(overlay.querySelector('.puzzle-end-score').getAttribute('aria-label'),'12 puzzles solved');
  assert.equal(overlay.querySelector('.puzzle-flip-in').dataset.value,'12');
  assert.equal(overlay.querySelector('.puzzle-flip-out').dataset.value,'—');
  assert.ok(overlay.querySelector('.puzzle-run-end-best'));
  settings.uiAnim=false;w.refreshSettings();assert.equal(overlay.dataset.motion,'off');
  assert.equal(timers.size,0,'The final screen has no expiry timer');
  w.render();assert.equal(w.root.querySelector('.puzzle-run-end'),overlay);
  await w.navigate('puzzles');assert.equal(overlay.isConnected,false);
});

function audioFixture() {
  const notes=[],contexts=[],settings={sound:true,soundVolume:50};
  class AudioContext {
    constructor(){this.state='running';this.currentTime=4;this.sampleRate=48000;this.destination={};contexts.push(this);}
    createBuffer(channels,length,sampleRate){return {duration:length/sampleRate,copyToChannel(samples){this.samples=samples;}};}
    createBufferSource(){const note={connect(gain){this.gain=gain.gain;},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};notes.push(note);return note;}
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

test('Knockout synthesis has headroom and silent boundaries at device sample rates',()=>{
  for(const rate of [44100,48000])for(const step of ['Ready','Go!']){
    const samples=knockoutCue(step,rate);
    let peak=0,energy=0;
    for(const v of samples){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));energy+=v*v;}
    assert.ok(peak>.4&&peak<.7);assert.ok(energy>0);
    assert.equal(samples[0],0);assert.equal(samples.at(-1),0);
    assert.ok(samples.length/rate<.9,'The bell ends before intro cleanup');
  }
});

test('Knockout playback obeys intro/master volume, reuses synthesis and stops on mute/close',()=>{
  const {sound,settings,notes,contexts}=audioFixture();
  settings.soundFx={runStart:{volume:40}};
  sound.play('Ready','knockout');const tap=notes[0];
  assert.equal(tap.buffer.duration,.16);assert.equal(tap.gain.value,.5*.4*.45);
  sound.play('Go!','knockout');assert.equal(tap.disconnected,true);
  assert.equal(notes[1].buffer.duration,.84);assert.equal(notes[1].started,true);
  sound.play('Ready','knockout');assert.equal(notes[2].buffer,tap.buffer);
  settings.soundFx.runStart.volume=0;sound.play('Go!','knockout');
  assert.equal(notes.length,3);assert.ok(notes.every(n=>n.disconnected));
  settings.soundFx.runStart.volume=100;sound.play('Go!','knockout');
  sound.stop();assert.equal(notes.at(-1).disconnected,true);
  sound.play('Go!','knockout');sound.close();
  assert.equal(notes.at(-1).disconnected,true);assert.equal(contexts[0].state,'closed');
});

test('muted or unavailable audio never prevents the intro',()=>{
  const {sound,settings,contexts}=audioFixture();settings.sound=false;sound.prime();sound.play('3');assert.equal(contexts.length,0);
  const unavailable=createRunStartSound({},()=>({sound:true}));
  assert.doesNotThrow(()=>{unavailable.prime();unavailable.play('Go!');unavailable.close();});
});

test('countdown volume multiplies master volume, clamps invalid levels and can mute just the countdown',()=>{
  const {sound,settings,notes}=audioFixture();
  settings.soundFx={runStart:{volume:40}};
  sound.play('3');assert.equal(notes.at(-1).volume,.5*.4*.18);
  sound.play('Go!');assert.equal(notes.at(-1).volume,.5*.4*.13);
  settings.soundFx.runStart.volume=0;sound.play('2');assert.equal(notes.length,3);
  for(const value of [null,undefined,'broken',Infinity,200]){
    settings.soundFx.runStart.volume=value;sound.play('1');assert.equal(notes.at(-1).volume,.09);
  }
  settings.soundFx.runStart.volume=-20;const count=notes.length;sound.play('1');assert.equal(notes.length,count);
  sound.close();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';

const before=new Chess();before.move('e4');
const after=new Chess(before.fen());after.move('d5');
const puzzle={id:'solved',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:450,themes:[]};
const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(release=>{resolve=release;});return {promise,resolve};};

async function setup(t,mode) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={},sounds=[],settings={moveAnim:false};
  const puzzles=[puzzle,{...puzzle,id:'missed',rating:3000}];
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>settings,onPuzzleMove:san=>sounds.push(san),makePiece:()=>dom.window.document.createElement('img')});
  t.mock.method(w,'showPuzzleRunStart',async()=>true);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  t.after(async()=>{await w.close();dom.window.close();});
  await w.open();await w.startPuzzleRun(mode);
  await w.submitPuzzle('e4d5');await w.submitPuzzle('b1c3');
  await w.submitPuzzle('b1c3');
  if(w.run)await w.finishChallenge('Ended early');
  sounds.length=0;
  return {w,dom,data,sounds,settings};
}

for(const mode of ['timeAttack','knockout'])for(const id of ['solved','missed'])test(`${mode} reviewing a ${id} puzzle assembles its setup then plays the opponent opening move`,async t=>{
  const {w,dom,data,sounds,settings}=await setup(t,mode);
  const result=w.result,saved=structuredClone(data['learning:v1']);
  const assembly=deferred(),pause=deferred(),animation=deferred(),destinations=[];
  t.after(()=>{assembly.resolve();pause.resolve(true);animation.resolve();});
  settings.moveAnim=true;
  t.mock.method(w,'arrangePuzzlePieces',(from,to)=>{assert.equal(to.fen,puzzle.setup.fen);return assembly.promise;});
  t.mock.method(w,'waitForPuzzleReply',delay=>{assert.equal(delay,450);return pause.promise;});
  dom.window.HTMLImageElement.prototype.animate=function(){
    destinations.push(this.closest('[data-square]').dataset.square);
    return {finished:animation.promise,cancel:()=>animation.resolve()};
  };
  const replay=w.replayRunPuzzle(id);await settle();
  assert.equal(w.currentFen(),puzzle.setup.fen);assert.equal(w.busy,true);assert.equal(w.activity.replay,true);
  assert.equal(w.activity.rated,false);assert.equal(w.activity.step,0);assert.equal(w.puzzleThinkingAt,null);
  assert.equal(w.pendingOpponent==null,true);assert.deepEqual(sounds,[]);
  await w.submitPuzzle('e4d5');assert.equal(w.activity.step,0);
  assembly.resolve();await settle();
  assert.equal(w.opponentPlaying,true);assert.equal(w.currentFen(),puzzle.setup.fen);assert.deepEqual(sounds,[]);
  pause.resolve(true);await settle();
  assert.equal(w.currentFen(),puzzle.fen);assert.equal(w.busy,true);
  assert.deepEqual(sounds,['d5']);assert.deepEqual(destinations,['d5']);
  animation.resolve();await replay;
  assert.equal(w.busy,false);assert.equal(w.puzzleIntroducing,false);assert.equal(w.opponentPlaying,false);
  assert.equal(w.pendingOpponent,null);assert.equal(w.lastMove,'d7d5');assert.equal(w.activity.step,0);
  assert.deepEqual(w.puzzleMoves,[]);assert.equal(w.runReplay,result);assert.equal(w.puzzleThinkingAt,null);
  assert.deepEqual(data['learning:v1'],saved);assert.deepEqual(w.store.value,saved);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} switching result puzzles cancels the previous opening move`,async t=>{
  const {w,data,sounds,settings}=await setup(t,mode),saved=structuredClone(data['learning:v1']);
  settings.moveAnim=true;
  await w.replayRunPuzzle('solved');sounds.length=0;
  // Hold the actual opponent pause so switching must release it through cancellation.
  t.mock.method(w,'waitForPuzzleReply',LearningWorkspace.prototype.waitForPuzzleReply);
  const paused=w.replayRunPuzzle('missed');await settle();
  assert.equal(w.currentFen(),puzzle.setup.fen);assert.equal(w.replyPending,true);
  assert.equal(w.root.querySelector('[data-focus=replay-1]').disabled,false);
  const latest=w.replayRunPuzzle('solved');await paused;await settle();
  assert.equal(w.activity.id,'solved');assert.equal(w.currentFen(),puzzle.setup.fen);
  assert.equal(w.replyPending,true);
  w.root.querySelector('[data-focus=puzzle-overview]').click();await latest;await settle();
  assert.equal(w.activity,null);assert.equal(w.busy,false);assert.equal(w.pendingOpponent,null);
  assert.deepEqual(data['learning:v1'],saved);
  assert.deepEqual(sounds,[]);
});

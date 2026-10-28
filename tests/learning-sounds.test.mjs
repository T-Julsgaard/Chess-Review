import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app, loadGame} from './helpers/app.mjs';

function puzzle(fen,solution) {
  return {id:'sound-test',fen,solution,rating:1200,difficulty:'Introductory',phase:'Middlegame',theme:'hangingPiece',themes:[],source:{url:'https://lichess.org/training'}};
}
async function setup(t,p) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const sounds=[];let wrong=0;
  a.state.settings.sound=true;a.state.settings.learningTransition='morph4';
  a.replace('playEvent',event=>sounds.push(event));a.replace('playWrongSound',()=>wrong++);
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[p]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');
  t.after(()=>w.close());await w.startPuzzleSelection([p]);
  return {a,w,sounds,wrong:()=>wrong};
}

for(const [name,fen,move,event] of [
  ['quiet move',new Chess().fen(),'e2e4','move'],
  ['capture','4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1','e4d5','capture'],
  ['castling','r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1','castle'],
  ['check','4k3/8/8/8/8/8/3R4/4K3 w - - 0 1','d2e2','check'],
  ['promotion with check','4k3/P7/8/8/8/8/8/4K3 w - - 0 1','a7a8q','check'],
  ['en passant','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1','e5d6','capture'],
])test(`a correct puzzle ${name} uses the existing ${event} sound`,async t=>{
  const p=puzzle(fen,[move]),{w,sounds,wrong}=await setup(t,p);
  await w.submitPuzzle(move);assert.deepEqual(sounds,[event]);assert.equal(wrong(),0);
});

test('wrong captures and castles play only the wrong-answer cue; illegal moves stay silent',async t=>{
  const p=puzzle('r3k2r/8/8/3p4/4P3/8/8/R3K2R w KQkq - 0 1',['a1a2']);
  const {w,sounds,wrong}=await setup(t,p);
  await w.submitPuzzle('e4d5');await w.submitPuzzle('e1g1');
  assert.deepEqual(sounds,[]);assert.equal(wrong(),2);
  await w.submitPuzzle('a1b8');assert.equal(w.feedback.status,'illegal');assert.deepEqual(sounds,[]);assert.equal(wrong(),2);
});

test('puzzle move sounds follow the existing mute setting',async t=>{
  const {a,w,sounds}=await setup(t,puzzle(new Chess().fen(),['e2e4']));
  a.state.settings.sound=false;await w.submitPuzzle('e2e4');assert.deepEqual(sounds,[]);
});

function replyPuzzle() {
  const c=new Chess();c.move('e4');c.move('d5');return puzzle(c.fen(),['e4d5','d8d5','b1c3']);
}
test('queueing a premove immediately plays the configured move effect, including captures',async t=>{
  const {a,w,sounds,wrong}=await setup(t,puzzle(new Chess().fen(),['e2e4','d7d5','e4d5'])),queued=[];
  a.replace('triggerFx',event=>queued.push(event));
  t.mock.method(w,'waitForPuzzleReply',function(){return new Promise(resolve=>{this.releaseReply=resolve;});});
  const playing=w.submitPuzzle('e2e4');
  const premoving=w.queuePuzzlePremove('e4d5');
  assert.deepEqual(queued,['move']);assert.deepEqual(sounds,['move']);
  assert.equal(w.activity.step,1);assert.equal(wrong(),0);
  await w.queuePuzzlePremove('a1a8');assert.deepEqual(queued,['move']);
  w.releaseReply(true);await playing;await premoving;
  assert.equal(w.feedback.status,'completed');assert.deepEqual(queued,['move','puzzleSuccess']);
  assert.deepEqual(sounds,['move','move','capture']);
});

test('premove placement obeys live mute and stays silent on cancellation',async t=>{
  const {a,w}=await setup(t,replyPuzzle()),queued=[];
  a.replace('triggerFx',event=>queued.push(event));
  t.mock.method(w,'waitForPuzzleReply',function(){return new Promise(resolve=>{this.releaseReply=resolve;});});
  const playing=w.submitPuzzle('e4d5');
  a.state.settings.sound=false;
  const premoving=w.queuePuzzlePremove('b1c3');
  assert.deepEqual(queued,[]);
  a.state.settings.sound=true;
  a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.deepEqual(queued,[]);
  w.releaseReply(true);await playing;await premoving;
  assert.equal(w.activity.step,2);assert.equal(w.premove,null);
});

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('accepted moves stay on the board before a delayed opponent reply and its sound',async t=>{
  const {w,sounds}=await setup(t,replyPuzzle());const pending=w.submitPuzzle('e4d5');
  const accepted=w.currentFen();assert.equal(w.activity.step,1);assert.equal(w.busy,true);assert.deepEqual(sounds,['capture']);
  await sleep(150);assert.equal(w.currentFen(),accepted);assert.deepEqual(sounds,['capture']);
  await w.submitPuzzle('b1a3');assert.equal(w.activity.mistakes,0);
  await pending;assert.equal(w.activity.step,2);assert.equal(w.busy,false);assert.deepEqual(sounds,['capture','capture']);
});

test('closing during the reply pause cancels motion and sound while preserving a resumable accepted move',async t=>{
  const {a,w,sounds}=await setup(t,replyPuzzle());const pending=w.submitPuzzle('e4d5');
  await w.close();await pending;assert.deepEqual(sounds,['capture']);assert.equal(w.replyTimer,null);
  assert.equal(a.store['learning:v1'].resume.step,2);assert.equal(w.activity.step,1);
});

test('muting during the reply pause suppresses the reply sound without skipping its move',async t=>{
  const {a,w,sounds}=await setup(t,replyPuzzle());const pending=w.submitPuzzle('e4d5');
  a.state.settings.sound=false;await pending;
  assert.deepEqual(sounds,['capture']);assert.equal(w.activity.step,2);
});

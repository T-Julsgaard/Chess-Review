import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {pieceRoutes} from '../lib/learning/piece-transition.js';
import {app,loadGame,branch} from './helpers/app.mjs';

const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const sparse='7k/8/8/8/8/8/8/K7 w - - 0 1';

async function setup(t,{flipped=false,analysis=false}={}) {
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[
    {id:'review-return',fen:sparse,solution:['a1b1'],rating:450,themes:[]},
  ]})}));
  const a=app(t);loadGame(a,'1. e4 d5 2. exd5 Qxd5');
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');a.call('go',4);
  if(flipped)a.call('toggleFlip');
  const target={fen:a.call('activePos').fen,flipped:a.state.flipped,idx:a.state.idx};
  // The saved game position, rather than a discarded analysis branch, is the destination.
  if(analysis){
    a.replace('requestLiveEval',async()=>{});branch(a,0,1);
    a.call('paintBoard');
  }
  await a.call('openLearning');const w=a.run('learningWorkspace'),board=w.boardElement;
  t.after(async()=>{w.cancelPieceTransition?.();await w.close();});
  return {a,w,board,target};
}

function track(a,w,board) {
  const pending=[],motions=[];
  board.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,width:800,height:800});
  a.state.settings.moveAnim=true;
  a.dom.window.Element.prototype.animate=function(frames,options){
    let resolve;const animation={finished:new Promise(r=>{resolve=r;}),cancel(){resolve();}};
    const sample={node:this,frames,options,resolve};motions.push(sample);
    if(this.classList.contains('puzzle-transition-piece'))pending.push(sample);else resolve();
    return animation;
  };
  return {pending,motions};
}

for(const source of ['home','puzzle','opening','history','timeAttack','knockout'])for(const flipped of [false,true])
test(`${source} returns assemble into the saved ${flipped?'black':'white'} review position`,async t=>{
  const {a,w,board,target}=await setup(t,{flipped});
  if(source==='puzzle')await w.startRatedPuzzles();
  else if(source==='opening'){await w.startOpening('italian');w.stepOpening(3);}
  else if(source==='timeAttack'||source==='knockout'){
    t.mock.method(w,'showPuzzleRunStart',async()=>true);
    await w.startPuzzleRun(source);await w.finishChallenge('Out of lives');
    assert.ok(board.querySelector('.puzzle-run-end'));
  }
  else {w.submitMove('d2d4');w.submitMove('d7d5');if(source==='history')w.stepHomePosition(1);}
  w.flipBoard();
  const from={...w.displayedBoard},{pending,motions}=track(a,w,board);
  const closing=w.close();await settle();
  const routes=pieceRoutes(from.fen,target.fen,{fromFlipped:from.flipped,toFlipped:target.flipped});
  assert.equal(w.embedded.reviewFen,target.fen);
  assert.equal(board.classList.contains('learn-board'),false);
  assert.equal(board.classList.contains('puzzle-arranging'),true);
  assert.equal(board.inert,true);
  assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,routes.length);
  assert.equal(pending.length,routes.filter(r=>r.from.x!==r.to.x||r.from.y!==r.to.y).length);
  assert.deepEqual(pending.map(p=>p.frames),routes.filter(r=>r.from.x!==r.to.x||r.from.y!==r.to.y).map(({from,to})=>[
    {transform:`translate(${(from.x-to.x)*100}%,${(from.y-to.y)*100}%)`},
    {transform:'translate(0,0)'},
  ]));
  assert.ok(motions.some(m=>m.node===board),'Board return and piece assembly run together');
  assert.equal(w.root.isConnected,false,'The outgoing puzzle UI must be removed when its fade ends, even while pieces are still assembling');
  assert.equal(a.state.idx,target.idx);assert.equal(a.state.flipped,target.flipped);
  let done=false;closing.then(()=>{done=true;});await settle();assert.equal(done,false);
  pending.forEach(p=>p.resolve());await closing;
  assert.equal(a.run('learningWorkspace'),null);assert.equal(a.call('activePos').fen,target.fen);
  assert.equal(board.inert,false);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.classList.contains('puzzle-arranging'),false);
  assert.equal(w.cancelPieceTransition,null);
});

test('returning after analysis targets the original game position',async t=>{
  const {a,w,board,target}=await setup(t,{analysis:true});
  w.homePosition=new Chess(sparse);w.render();const {pending}=track(a,w,board);
  const closing=w.close();await settle();
  assert.equal(w.embedded.reviewFen,target.fen);assert.ok(pending.length);
  pending.forEach(p=>p.resolve());await closing;
  assert.equal(a.state.analysisMode,false);assert.equal(a.call('activePos').fen,target.fen);
});

for(const interruption of ['resize','reduced'])test(`${interruption} cancels a return assembly cleanly`,async t=>{
  const {a,w,board}=await setup(t);w.homePosition=new Chess(sparse);w.render();
  let change;
  if(interruption==='reduced')a.dom.window.matchMedia=()=>({matches:false,addEventListener(type,fn){change=fn;},removeEventListener(){}});
  const {pending}=track(a,w,board),closing=w.close();await settle();assert.ok(pending.length);
  if(interruption==='resize')a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));else change();
  await closing;assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.inert,false);assert.equal(a.run('learningWorkspace'),null);
});

for(const reduced of [false,true])test(`review returns respect ${reduced?'reduced motion':'disabled move animation'}`,async t=>{
  const {a,w,board,target}=await setup(t);w.homePosition=new Chess(sparse);w.render();
  const {pending}=track(a,w,board);
  if(reduced)a.dom.window.matchMedia=()=>({matches:true});else a.state.settings.moveAnim=false;
  await w.close();assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(a.call('activePos').fen,target.fen);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {pieceRoutes,slidePuzzlePieces} from '../lib/learning/piece-transition.js';
import {app,loadGame} from './helpers/app.mjs';

const start=new Chess().fen(),sparse='7k/8/8/8/8/8/8/K7 w - - 0 1';
const onBoard=p=>p.x>0&&p.x<8&&p.y>0&&p.y<8;
test('rearranging preserves identical pieces and slides surplus pieces fully beyond an edge',()=>{
  const routes=pieceRoutes(start,sparse);
  assert.equal(routes.filter(r=>onBoard(r.from)).length,32);assert.equal(routes.filter(r=>onBoard(r.to)).length,2);
  assert.equal(routes.filter(r=>r.kind==='leave').length,30);
  assert.deepEqual(routes.filter(r=>r.kind==='move').map(r=>r.type),['k','k']);
  for(const r of routes.filter(r=>r.kind==='leave'))assert.ok(r.to.x<=-.5||r.to.x>=8.5||r.to.y<=-.5||r.to.y>=8.5);
  const moved=new Chess(start);moved.move('e4');const simple=pieceRoutes(start,moved.fen());
  assert.equal(simple.filter(r=>r.from.x!==r.to.x||r.from.y!==r.to.y).length,1);
});

test('new and promoted pieces enter from outside the board and respect a changed orientation',()=>{
  const promoted='7k/8/8/8/8/QQ6/8/K7 w - - 0 1';
  const routes=pieceRoutes(sparse,promoted,{fromFlipped:false,toFlipped:true});
  assert.equal(routes.filter(r=>r.kind==='enter').length,2);
  assert.ok(routes.filter(r=>r.kind==='enter').every(r=>!onBoard(r.from)&&onBoard(r.to)&&r.type==='q'));
  assert.deepEqual(routes.find(r=>r.type==='k'&&r.color==='w'),{type:'k',color:'w',from:{x:.5,y:7.5},to:{x:7.5,y:.5},kind:'move'});
});

for(const cancel of [false,true])test(`piece slides ${cancel?'cancel':'finish'} without leaving hidden pieces or overlays`,async()=>{
  const dom=new JSDOM('<div class="learn-board"></div>'),board=dom.window.document.querySelector('div'),pending=[];
  dom.window.HTMLElement.prototype.animate=function(frames,options){
    let resolve;const animation={finished:new Promise(r=>{resolve=r;}),cancel(){resolve();}};
    pending.push({frames,options,animation,resolve});return animation;
  };
  const transition=slidePuzzlePieces(board,pieceRoutes(sparse,start),()=>dom.window.document.createElement('img'));
  assert.ok(board.classList.contains('puzzle-arranging'));assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,32);
  assert.ok(pending.some(p=>p.options.delay>0));
  assert.ok(pending.every(p=>p.options.duration>=680&&p.options.duration<=900&&p.options.easing==='cubic-bezier(.4,0,.2,1)'&&p.options.fill==='both'));
  if(cancel)transition.cancel();else pending.forEach(p=>p.resolve());await transition.finished;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);assert.equal(board.classList.contains('puzzle-arranging'),false);
  transition.cancel();dom.window.close();
});

async function returningWorkspace(t,mode) {
  const puzzle={id:'return-transition',fen:sparse.replace(' w ',' b '),solution:['h8g8'],rating:450,themes:[]};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  await a.call('openLearning');const w=a.run('learningWorkspace');
  t.after(()=>w.close());
  // Return to the user's scratch position and orientation, including any moves
  // made before entering the puzzle.
  w.homePosition.move('e4');w.homeBoardFlipped=true;w.render();
  t.mock.method(w,'showPuzzleRunStart',async()=>true);
  if(mode)await w.startPuzzleRun(mode);else await w.startRatedPuzzles();
  const from={...w.displayedBoard},pending=[],board=w.boardElement;
  board.getBoundingClientRect=()=>({left:0,top:0,width:800,height:800});
  a.state.settings.moveAnim=true;
  a.dom.window.HTMLElement.prototype.animate=function(frames,options){
    let resolve;const animation={finished:new Promise(r=>{resolve=r;}),cancel(){resolve();}};
    if(this.classList.contains('puzzle-transition-piece')&&!w.closing)pending.push({frames,options,resolve});else resolve();
    return animation;
  };
  return {a,w,board,from,pending};
}

for(const page of ['puzzles','concepts','openings'])test(`leaving a puzzle for ${page} assembles pieces into the saved library board`,async t=>{
  const {w,board,from,pending}=await returningWorkspace(t);
  await w.navigate(page);
  const routes=pieceRoutes(from.fen,w.homePosition.fen(),{fromFlipped:from.flipped,toFlipped:true});
  assert.equal(w.page,page);assert.equal(w.activity,null);
  assert.deepEqual(w.displayedBoard,{fen:w.homePosition.fen(),flipped:true});
  assert.ok(board.classList.contains('puzzle-arranging'));
  assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,routes.length);
  assert.equal(pending.length,routes.filter(r=>r.from.x!==r.to.x||r.from.y!==r.to.y).length);
  assert.ok(pending.every(p=>p.options.duration>=680&&p.options.fill==='both'));
  pending.forEach(p=>p.resolve());
  for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.classList.contains('puzzle-arranging'),false);
  assert.equal(board.querySelectorAll('.sq img').length,32);
});

for(const mode of ['timeAttack','knockout'])for(const showResults of [false,true])test(`${mode} ${showResults?'retains the final board in results':'assembles pieces when returning to puzzles'}`,async t=>{
  const {w,board,pending}=await returningWorkspace(t,mode);
  const lastBoard={...w.displayedBoard};
  await w.finishChallenge('Ended early',showResults);
  if(!showResults)await w.navigate('puzzles');
  assert.equal(w.run,null);assert.equal(w.activity,null);
  if(showResults){
    assert.equal(board.classList.contains('puzzle-arranging'),false);assert.equal(pending.length,0);
    assert.equal(w.result.board.fen,lastBoard.fen);assert.deepEqual(w.displayedBoard,lastBoard);
  }else{assert.ok(board.classList.contains('puzzle-arranging'));assert.ok(pending.length>0);}
  await w.close();
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.classList.contains('puzzle-arranging'),false);
});

async function replayWorkspace(t,mode) {
  const workspace=await returningWorkspace(t,mode),{w}=workspace;
  w.puzzles.push({id:'replay-transition',fen:start,solution:['e2e4'],rating:3000,themes:[]});
  w.run.results=w.puzzles.map((p,i)=>({id:p.id,number:i+1,correct:true,rating:p.rating}));
  w.run.solved=2;
  await w.finishChallenge('Ended early');
  return workspace;
}

for(const mode of ['timeAttack','knockout'])for(const page of ['puzzles','concepts','openings'])test(`leaving ${mode} results for ${page} assembles the final puzzle into the library board`,async t=>{
  const {w,board,pending}=await replayWorkspace(t,mode),from={...w.displayedBoard};
  // Redraws on the result screen must retain the final puzzle without animating it.
  w.render();w.render();
  assert.equal(pending.length,0);assert.deepEqual(w.displayedBoard,from);
  assert.ok(board.querySelector('.puzzle-run-end'));
  if(page==='puzzles'){
    w.root.querySelector('[data-focus=puzzle-overview]').click();
    for(let i=0;i<80;i++)await Promise.resolve();
  }else await w.navigate(page);
  const routes=pieceRoutes(from.fen,w.homePosition.fen(),{fromFlipped:from.flipped,toFlipped:true});
  assert.equal(w.page,page);assert.equal(w.result,null);assert.equal(w.activity,null);
  assert.deepEqual(w.displayedBoard,{fen:w.homePosition.fen(),flipped:true});
  assert.equal(board.querySelector('.puzzle-run-end'),null);
  assert.ok(board.classList.contains('puzzle-arranging'));
  assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,routes.length);
  assert.equal(pending.length,routes.filter(r=>r.from.x!==r.to.x||r.from.y!==r.to.y).length);
  pending.forEach(p=>p.resolve());
  for(let i=0;i<20;i++)await Promise.resolve();
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.classList.contains('puzzle-arranging'),false);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} result selections assemble pieces and cancel unfinished assemblies when switching or closing`,async t=>{
  const {w,board,pending}=await replayWorkspace(t,mode);
  const result=w.result,saved=structuredClone(w.store.value);
  const checkAssembly=from=>{
    const routes=pieceRoutes(from.fen,w.currentFen(),{fromFlipped:from.flipped,toFlipped:w.flipped});
    assert.ok(board.classList.contains('puzzle-arranging'));
    assert.equal(board.querySelectorAll('.puzzle-piece-transition').length,1);
    assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,routes.length);
    assert.equal(w.root.querySelectorAll('.puzzle-run-history [aria-current=true]').length,1);
    assert.equal(w.runReplay,result);assert.equal(w.activity.replay,true);assert.equal(w.busy,true);
    assert.equal(w.root.querySelector('.puzzle-run-replay').disabled,false);
    assert.deepEqual(w.store.value,saved);
  };
  const from={...w.displayedBoard},first=w.replayRunPuzzle('replay-transition');
  checkAssembly(from);assert.equal(w.flipped,false);
  assert.ok(pending.some(p=>p.options.delay>0));
  pending.forEach(p=>p.resolve());await first;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);

  const secondFrom={...w.displayedBoard},second=w.replayRunPuzzle('return-transition');
  checkAssembly(secondFrom);assert.equal(w.flipped,true);
  const cancelled=board.querySelector('.puzzle-piece-transition'),thirdFrom={...w.displayedBoard};
  const third=w.replayRunPuzzle('replay-transition');
  checkAssembly(thirdFrom);assert.equal(cancelled.isConnected,false);
  await second;
  assert.equal(typeof w.cancelPieceTransition,'function');
  await w.close();await third;
  assert.equal(w.cancelPieceTransition,null);
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.classList.contains('puzzle-arranging'),false);
});

for(const mode of ['timeAttack','knockout'])for(const reduced of [false,true])test(`${mode} result selections respect ${reduced?'system reduced motion':'disabled move animations'}`,async t=>{
  const {a,w,board,pending}=await replayWorkspace(t,mode);
  if(reduced)a.dom.window.matchMedia=()=>({matches:true});else a.state.settings.moveAnim=false;
  await w.replayRunPuzzle('replay-transition');
  await w.replayRunPuzzle('return-transition');
  assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(w.currentFen(),w.puzzleById('return-transition').fen);
});

for(const mode of ['timeAttack','knockout'])for(const reduced of [false,true])test(`leaving ${mode} results respects ${reduced?'system reduced motion':'disabled move animations'}`,async t=>{
  const {a,w,board,pending}=await replayWorkspace(t,mode);
  if(reduced)a.dom.window.matchMedia=()=>({matches:true});else a.state.settings.moveAnim=false;
  await w.navigate('puzzles');
  assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.querySelector('.puzzle-run-end'),null);
  assert.equal(w.currentFen(),w.homePosition.fen());
});

for(const reduced of [false,true])test(`returning from a puzzle respects ${reduced?'system reduced motion':'disabled move animations'}`,async t=>{
  const {a,w,board,pending}=await returningWorkspace(t);
  if(reduced)a.dom.window.matchMedia=()=>({matches:true});else a.state.settings.moveAnim=false;
  await w.navigate('concepts');
  assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(w.currentFen(),w.homePosition.fen());
});

test('starting another puzzle cancels the return assembly without cancelling the new transition',async t=>{
  const {w,board,pending}=await returningWorkspace(t);
  await w.navigate('concepts');assert.ok(board.classList.contains('puzzle-arranging'));
  const previous=pending.length,starting=w.startPuzzleSelection(w.puzzles);
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.ok(pending.length>previous);assert.equal(board.querySelectorAll('.puzzle-piece-transition').length,1);
  assert.equal(typeof w.cancelPieceTransition,'function');
  w.cancelPieceTransition();await starting;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(w.cancelPieceTransition,null);assert.equal(w.busy,false);
});

async function openingWorkspace(t) {
  const setup=await returningWorkspace(t),{w,pending}=setup;
  await w.navigate('openings');
  w.homePosition=new Chess(sparse);w.render();pending.length=0;
  return setup;
}
const settle=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

for(const [id,color,ply] of [['italian','w',0],['sicilian','b',0],['french','b',6]])test(`opening ${id} assembles the displayed pieces into its ${ply?'resumed':'starting'} position`,async t=>{
  const {w,board,pending}=await openingWorkspace(t),from={...w.displayedBoard};
  const starting=w.startOpening(id,{ply});await settle();
  const routes=pieceRoutes(from.fen,w.currentFen(),{fromFlipped:from.flipped,toFlipped:color==='b'});
  assert.equal(w.activity.ply,ply);assert.equal(w.flipped,color==='b');
  assert.ok(board.classList.contains('puzzle-arranging'));
  assert.equal(board.querySelectorAll('.puzzle-transition-piece').length,routes.length);
  assert.ok(pending.length>0);assert.ok(routes.some(r=>r.kind==='enter'));
  pending.forEach(p=>p.resolve());await starting;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(board.querySelectorAll('.sq img').length,32);
});

test('changing opening variations assembles pieces back to the starting position',async t=>{
  const {w,board,pending}=await openingWorkspace(t);
  const starting=w.startOpening('italian');await settle();pending.forEach(p=>p.resolve());await starting;
  w.stepOpening(8);pending.length=0;
  w.root.querySelector('[data-focus="opening-variation"]').click();
  w.dropdown.field.querySelectorAll('[role="option"]')[1].click();
  assert.equal(w.activity.line,1);assert.equal(w.activity.ply,0);
  assert.ok(board.classList.contains('puzzle-arranging'));assert.ok(pending.length>0);
  pending.forEach(p=>p.resolve());await settle();
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);
});

test('opening assemblies cancel when stepping, switching openings or closing',async t=>{
  const {w,board}=await openingWorkspace(t);
  const first=w.startOpening('italian');await settle();
  const cancelled=board.querySelector('.puzzle-piece-transition');assert.ok(cancelled);
  const second=w.startOpening('sicilian');await settle();await first;
  assert.equal(cancelled.isConnected,false);assert.equal(w.activity.id,'sicilian');
  assert.equal(board.querySelectorAll('.puzzle-piece-transition').length,1);
  w.stepOpening(1);await second;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);assert.equal(w.activity.ply,1);
  const third=w.startOpening('french');await settle();
  assert.ok(board.classList.contains('puzzle-arranging'));
  await w.close();await third;
  assert.equal(board.querySelector('.puzzle-piece-transition'),null);assert.equal(w.cancelPieceTransition,null);
});

for(const setting of ['disabled','reduced','unchanged'])test(`opening entry skips assembly when motion is ${setting}`,async t=>{
  const {a,w,board,pending}=await openingWorkspace(t);
  if(setting==='disabled')a.state.settings.moveAnim=false;
  else if(setting==='reduced')a.dom.window.matchMedia=()=>({matches:true});
  else {w.homePosition=new Chess();w.homeBoardFlipped=false;w.render();}
  await w.startOpening('italian');
  assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  assert.equal(w.currentFen(),start);
});

test('leaving the library while an opening saves does not render or assemble the stale opening',async t=>{
  const {w,board,pending}=await openingWorkspace(t);
  const persist=w.persist;let release;
  w.persist=change=>new Promise(resolve=>{release=async()=>resolve(await persist.call(w,change));});
  const starting=w.startOpening('french');await settle();
  assert.ok(w.root.querySelector('.learn-library'));
  await w.navigate('concepts');release();await starting;
  assert.equal(w.page,'concepts');assert.equal(w.activity,null);
  assert.equal(pending.length,0);assert.equal(board.querySelector('.puzzle-piece-transition'),null);
  w.persist=persist;
});

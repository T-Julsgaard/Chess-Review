import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app, loadGame, settle, deferred} from './helpers/app.mjs';

function review(t) {
  const a=app(t);loadGame(a,'1. e4 e5');
  a.state.bests[0]={bestmove:'e2e4',score:{cp:40},lines:[{score:{cp:40},pv:'e2e4'},{score:{cp:-400},pv:'d2d4'}]};
  a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  return a;
}

function badge(board, result, square) {
  const nodes=board.querySelectorAll('.puzzle-result-badge');assert.equal(nodes.length,1);
  const node=nodes[0],label=result==='correct'?'Correct':'Incorrect';
  if(square)assert.equal(node.parentElement.dataset.square,square);
  assert.equal(node.dataset.result,result);assert.equal(node.getAttribute('aria-label'),label);assert.equal(node.title,label);
  assert.ok(node.classList.contains('sq-badge'));assert.ok(node.classList.contains('grade-badge'));
  assert.equal(node.querySelector('circle').getAttribute('fill'),result==='correct'?'#81b64c':'#ee4a2f');
  assert.equal(node.querySelector('text'),null);assert.equal(node.dataset.category,undefined);
}

test('puzzle outcomes label legal attempts, clear on replies and retries, and persist on completion',async t=>{
  const a=review(t),p={id:'badge-line',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[p]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  await w.startPuzzleSelection([p]);const board=w.boardElement;
  assert.equal(board.querySelector('.sq-badge'),null);
  await w.submitPuzzle('e2e5');assert.equal(board.querySelector('.sq-badge'),null);
  await w.submitPuzzle('d2d4');badge(board,'incorrect','d2');assert.equal(w.currentFen(),p.fen);
  assert.ok(board.querySelector('[data-square=d2] .piece-img'));
  w.flipBoard();badge(board,'incorrect','d2');
  board.querySelector('[data-square=e2]').click();assert.equal(board.querySelector('.sq-badge'),null);
  const reply=deferred();t.mock.method(w,'waitForPuzzleReply',()=>reply.promise);
  const accepted=w.submitPuzzle('e2e4');await settle();badge(board,'correct','e4');
  assert.deepEqual([...board.querySelectorAll('.puzzle-correct')].map(n=>n.dataset.square).sort(),['e2','e4']);
  reply.resolve(true);await accepted;assert.equal(board.querySelector('.sq-badge'),null);
  assert.equal(board.querySelector('.puzzle-correct'),null);
  await w.submitPuzzle('g1f3');badge(board,'correct','f3');assert.equal(w.feedback.status,'completed');
  assert.equal(board.querySelectorAll('.puzzle-correct').length,2);
  w.flipBoard();badge(board,'correct','f3');
  await w.preparePuzzle(p);assert.equal(board.querySelector('.sq-badge'),null);
  await w.submitPuzzle('d2d4');await w.revealPuzzle();assert.equal(board.querySelector('.sq-badge'),null);
  await w.navigate('puzzles');assert.equal(board.querySelector('.sq-badge'),null);
});

test('review practice uses outcome badges instead of review categories and keeps wrong attempts across repaints',async t=>{
  const a=review(t);a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  let board=a.dom.window.document.querySelector('.board');
  await a.call('practiceAttempt','d2','d4');badge(board,'incorrect');assert.ok(a.run('sqByName.d2').querySelector('.puzzle-result-badge'));
  assert.ok(a.run('sqByName.d2').querySelector('.piece-img'));
  a.state.flipped=true;a.call('buildBoard');a.call('paintBoard');
  board=a.dom.window.document.querySelector('.board');
  badge(board,'incorrect');assert.ok(a.run('sqByName.d2').querySelector('.puzzle-result-badge'));
  await a.call('practiceAttempt','e2','e4');badge(board,'correct');assert.ok(a.run('sqByName.e4').querySelector('.puzzle-result-badge'));
  assert.equal(board.querySelector('.sq-badge[data-category]'),null);
});

test('promotion outcomes use the destination square and remain inside the visible board edge when flipped',async t=>{
  const a=review(t),p={id:'badge-promotion',fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',solution:['a7a8r'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[p]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());await w.startPuzzleSelection([p]);
  await w.submitPuzzle('a7a8r');badge(w.boardElement,'correct','a8');
  assert.ok(w.boardElement.querySelector('[data-square=a8]').classList.contains('top-row'));
  w.flipBoard();badge(w.boardElement,'correct','a8');
  assert.ok(w.boardElement.querySelector('[data-square=a8]').classList.contains('right-col'));
});

test('review practice clears an incorrect badge on pickup and keeps it cleared after cancellation and repaint',async t=>{
  const a=review(t);a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  const board=a.dom.window.document.querySelector('.board');
  board.getBoundingClientRect=()=>({left:0,top:0,width:800,height:800});
  await a.call('practiceAttempt','d2','d4');badge(board,'incorrect');
  const event=new a.dom.window.MouseEvent('pointerdown',{bubbles:true,cancelable:true,button:0,clientX:450,clientY:650});
  Object.defineProperty(event,'pointerId',{value:1});
  a.run('sqByName.e2').dispatchEvent(event);
  assert.ok(a.dom.window.document.querySelector('.drag-piece'));
  assert.equal(board.querySelector('.puzzle-result-badge'),null);assert.equal(a.state.practice.resultBadge,null);
  a.dom.window.dispatchEvent(new a.dom.window.Event('blur'));a.call('paintBoard');
  assert.equal(board.querySelector('.puzzle-result-badge'),null);assert.equal(board.querySelector('.has-badge'),null);
  assert.equal(a.state.practice.fails,1);assert.equal(a.state.practice.solving,true);
});

test('review practice expires incorrect badges after two seconds and restarts the delay on another mistake',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=review(t);a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  const board=a.dom.window.document.querySelector('.board');
  await a.call('practiceAttempt','d2','d4');
  t.mock.timers.tick(1500);a.call('paintBoard');badge(board,'incorrect');
  await a.call('practiceAttempt','g1','f3');
  t.mock.timers.tick(500);badge(board,'incorrect');
  assert.ok(a.run('sqByName.g1').querySelector('.puzzle-result-badge'));
  t.mock.timers.tick(1499);badge(board,'incorrect');
  t.mock.timers.tick(1);
  assert.equal(a.state.practice.resultBadge,null);
  assert.equal(board.querySelector('.puzzle-result-badge'),null);
  assert.equal(board.querySelector('.has-badge'),null);
  a.call('paintBoard');assert.equal(board.querySelector('.puzzle-result-badge'),null);
  assert.equal(a.state.practice.fails,2);assert.equal(a.state.practice.solving,true);
});

test('an expired incorrect attempt does not clear the correct badge or a new practice session',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=review(t);a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  const board=a.dom.window.document.querySelector('.board');
  await a.call('practiceAttempt','d2','d4');t.mock.timers.tick(1500);
  await a.call('practiceAttempt','e2','e4');
  t.mock.timers.tick(500);badge(board,'correct');
  assert.ok(a.run('sqByName.e4').querySelector('.puzzle-result-badge'));
  a.call('exitPractice');
  a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  await a.call('practiceAttempt','d2','d4');t.mock.timers.tick(1000);
  a.call('exitPractice');
  a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  await a.call('practiceAttempt','g1','f3');t.mock.timers.tick(1000);
  badge(board,'incorrect');
  assert.ok(a.run('sqByName.g1').querySelector('.puzzle-result-badge'));
});

test('practice badge expiry clears the saved review square while learning owns the visible board',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const a=review(t);a.state.practice={spots:[1],i:0,solving:true,busy:false};a.state.idx=0;a.call('paintBoard');
  const board=a.dom.window.document.querySelector('.board');
  await a.call('practiceAttempt','d2','d4');
  const reviewSquares=[...board.childNodes],learningSquare=a.dom.window.document.createElement('div');
  const learningBadge=board.querySelector('.puzzle-result-badge').cloneNode(true);
  learningSquare.classList.add('has-badge');learningSquare.append(learningBadge);
  board.replaceChildren(learningSquare);
  t.mock.timers.tick(2000);
  assert.equal(a.state.practice.resultBadge,null);
  assert.equal(learningBadge.parentElement,learningSquare);
  assert.ok(learningSquare.classList.contains('has-badge'));
  board.replaceChildren(...reviewSquares);
  assert.equal(board.querySelector('.puzzle-result-badge'),null);
  assert.equal(board.querySelector('.has-badge'),null);
});

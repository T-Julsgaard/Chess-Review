import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app,loadGame,deferred,settle} from './helpers/app.mjs';

test('learning tabs and scrollable content fill the side panel across libraries and Statistics',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const doc=a.dom.window.document,toggle=doc.querySelector('#learningToggle');
  assert.equal(toggle.textContent,'Learn with Chess review');
  assert.equal(toggle.nextElementSibling.getAttribute('aria-label'),'Flip board');
  assert.equal(doc.querySelector('.learn-entry-button').textContent,'Solve Puzzles');
  a.call('go',1);const fen=a.state.positions[1].fen;
  const puzzles=[{id:'layout',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:['fork'],source:{url:'https://lichess.org/training'}}];
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles})}));
  await a.call('toggleLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  const check=()=>{
    assert.equal(w.shell.firstElementChild,w.root.querySelector('.learn-nav'));
    assert.ok(w.shell.lastElementChild.matches('main.learn-main'));
    assert.equal(w.root.querySelector('.learn-footer, [data-focus=review]'),null);
    assert.equal(a.dom.window.document.querySelector('#learningToggle').textContent,'Return to Game review');
  };
  check();assert.ok(w.root.querySelector('[data-focus=puzzle-statistics]'));
  w.showPuzzleStatistics(true);check();
  w.root.querySelector('[data-focus=puzzle-statistics]').click();check();assert.equal(w.page,'puzzles');
  await w.navigate('concepts');check();await w.navigate('openings');check();
  // On a short viewport the former opening-only 64px reservation shrank the board.
  Object.defineProperty(a.dom.window,'innerHeight',{value:700,configurable:true});
  w.reviewBoardRect={x:100,y:100,width:600,height:600};w.positionCentered();
  const boardSize=w.root.style.getPropertyValue('--learn-board-size');
  await w.startOpening('italian');check();
  assert.equal(w.root.style.getPropertyValue('--learn-board-size'),boardSize);
  assert.ok(w.shell.querySelector('.learn-opening-controls'));
  assert.equal(w.boardInfo.querySelector('.learn-opening-controls'),null);
  await w.navigate('openings');
  const main=w.shell.querySelector('.learn-main');main.scrollTop=100;w.render();
  assert.equal(w.shell.querySelector('.learn-main').scrollTop,100);
  toggle.click();await w.close();
  assert.equal(a.run('learningWorkspace'),null);assert.equal(a.state.idx,1);
  assert.equal(a.state.positions[a.state.idx].fen,fen);
  assert.equal(toggle.textContent,'Learn with Chess review');
  assert.equal(doc.querySelector('.learn-entry-button').textContent,'Solve Puzzles');
});

for(const exit of ['button','Escape'])test(`learning toggle updates immediately on ${exit}, before the exit animation finishes`,async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[{id:'toggle',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:['fork']}]})}));
  await a.call('openLearning');
  const w=a.run('learningWorkspace'),doc=a.dom.window.document,toggle=doc.querySelector('#learningToggle'),animation=deferred();
  t.mock.method(w,'transitionPanels',()=>animation.promise);
  assert.equal(toggle.dataset.mode,'learning');
  if(exit==='button')toggle.click();
  else doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.closing,true);
  assert.equal(toggle.textContent,'Learn with Chess review');
  assert.equal(toggle.dataset.mode,'review');
  await settle();
  assert.equal(a.run('learningWorkspace'),w,'Workspace remains mounted until the animation finishes');
  toggle.click(); // A second activation during exit must not open another workspace.
  assert.equal(a.run('learningWorkspace'),w);
  animation.resolve();await w.close();
  assert.equal(a.run('learningWorkspace'),null);
});

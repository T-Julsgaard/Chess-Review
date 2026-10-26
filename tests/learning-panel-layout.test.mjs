import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app,loadGame,deferred,settle} from './helpers/app.mjs';

test('learning follows the live review square through resizing without restarting its activity',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const puzzle={id:'resize',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:[]};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  await w.startPuzzleSelection([puzzle]);
  const activity=w.activity,board=w.boardElement,history=w.puzzleHistory,settings=structuredClone(a.state.layout);
  const openingRect=w.reviewBoardRect;
  for(const [width,height,rect]of [
    [1920,960,{x:309,y:108,width:734,height:734}],
    [1366,648,{x:213,y:103,width:470,height:470}],
    [390,844,{x:57,y:110,width:318,height:318}],
    [1366,648,{x:213,y:103,width:470,height:470}],
  ]){
    Object.defineProperties(a.dom.window,{innerWidth:{value:width,configurable:true},innerHeight:{value:height,configurable:true}});
    t.mock.method(w.boardAnchor,'getBoundingClientRect',()=>rect);
    a.dom.window.dispatchEvent(new a.dom.window.Event('resize'));
    const value=key=>parseFloat(w.root.style.getPropertyValue('--learn-'+key));
    assert.ok(value('board-x')>=0&&value('board-x')+value('board-size')<=width);
    assert.ok(value('panel-x')+value('panel-width')<=width);
    if(width>=980){assert.ok(value('panel-width')>=340);assert.equal(value('board-x')+value('board-size'),rect.x+rect.width);}
    assert.equal(w.activity,activity);assert.equal(w.boardElement,board);assert.equal(w.puzzleHistory,history);
    assert.deepEqual(a.state.layout,settings);
  }
  assert.equal(w.reviewBoardRect,openingRect,'The original rectangle remains available for the opening transition');
  assert.equal(w.placeholder.style.width,'');assert.equal(w.placeholder.style.height,'');
  assert.equal(a.dom.window.document.querySelectorAll('.board').length,1,'The anchor must not create a second interactive board');
});

test('compact puzzle status mirrors the live countdown and score without duplicate timer IDs or announcements',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.state.settings.moveAnim=false;a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const puzzle={id:'compact-clock',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7f8'],rating:1200,themes:[]};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  t.mock.method(w,'showPuzzleRunStart',async()=>true);
  await w.startPuzzleRun('timeAttack');w.run.clock.pause();w.run.clock.remainingMs=23000;w.updateClock();
  const compact=()=>w.boardInfo.querySelector('.puzzle-board-status');
  assert.equal(compact().getAttribute('aria-hidden'),'true');
  assert.equal(compact().querySelector('[data-board-status]').textContent,'White to move');
  assert.equal(compact().querySelector('[data-board-clock]').textContent,'0:23');
  assert.equal(w.root.querySelector('#learn-clock').textContent,'0:23');
  assert.equal(w.root.querySelectorAll('#learn-clock').length,1);
  assert.ok([...w.root.querySelectorAll('#learn-clock, [data-board-clock]')].every(n=>n.classList.contains('running-low')));
  const clock=w.run.clock;w.run.solved=2;w.render();
  assert.equal(w.run.clock,clock);assert.equal(compact().querySelector('[data-board-score]').textContent,'2 solved');
  w.run.clock.remainingMs=61000;w.updateClock();
  assert.equal(compact().querySelector('[data-board-clock]').textContent,'1:01');
  assert.ok([...w.root.querySelectorAll('#learn-clock, [data-board-clock]')].every(n=>!n.classList.contains('running-low')));
  await w.finishChallenge('Time is up');assert.equal(compact(),null);
  await w.startPuzzleRun('knockout');
  assert.ok(compact().querySelector('[data-board-status]'));assert.equal(compact().querySelector('[data-board-clock]'),null);
  await w.navigate('puzzles');assert.equal(compact(),null);
});

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

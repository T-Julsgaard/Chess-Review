import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {app,loadGame} from './helpers/app.mjs';

const before=new Chess();for(const move of ['e4','d5','exd5'])before.move(move);
const after=new Chess(before.fen());after.move('Qxd5');
const puzzle={id:'capture-history',setup:{fen:before.fen(),move:'d8d5'},fen:after.fen(),solution:['b1c3','d5a5','d2d4'],rating:450,themes:[]};

async function setup(t,mode='practice',p=puzzle) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data={},sounds=[];
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[p]})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),onPuzzleMove:san=>sounds.push(san),makePiece:(piece,color)=>{
    const img=dom.window.document.createElement('img');img.dataset.piece=color+piece.toUpperCase();return img;
  }});
  t.mock.method(w,'showPuzzleRunStart',async()=>true);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  t.after(async()=>{await w.close();dom.window.close();});
  await w.open();
  if(mode==='practice')await w.startPuzzleSelection([p]);
  else if(mode==='challenge')await w.startChallenge(60);
  else await w.startPuzzleRun(mode);
  const key=(key,options={})=>{
    const event=new dom.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...options});
    (options.target||dom.window.document.activeElement).dispatchEvent(event);return event;
  };
  return {w,dom,data,sounds,key};
}

for(const mode of ['practice','timeAttack','knockout','challenge'])test(`${mode} arrows review the opening capture and each accepted ply without changing the solve`,async t=>{
  const {w,data,sounds,key}=await setup(t,mode),run=w.run;
  const saved=structuredClone(data['learning:v1']),activity=structuredClone(w.activity),thinking=w.puzzleThinkingAt;
  const cue=w.root.querySelector('.puzzle-turn-cue');
  w.root.querySelector('[data-square=d5]').focus();
  assert.equal(key('ArrowLeft').defaultPrevented,true);
  assert.equal(w.currentFen(),before.fen());
  assert.equal(w.root.querySelector('[data-square=d5] img').dataset.piece,'wP');
  assert.equal(w.root.querySelector('[data-square=d8] img').dataset.piece,'bQ');
  assert.equal(w.root.querySelector('.last-move, .puzzle-result-badge, .puzzle-hint-arrow'),null);
  assert.equal(w.root.querySelector('.puzzle-turn-cue'),cue);assert.equal(cue.textContent,'White to move');
  assert.equal(w.doc.activeElement,w.root);
  assert.deepEqual(w.activity,activity);assert.deepEqual(data['learning:v1'],saved);
  assert.equal(w.puzzleThinkingAt,thinking);assert.equal(w.run,run);
  await w.submitPuzzle('b1c3');await w.hintPuzzle();
  w.root.querySelector('[data-square=b1]').click();w.root.querySelector('[data-square=c3]').click();
  assert.deepEqual(w.activity,activity);assert.equal(w.selected,null);
  key('ArrowLeft');assert.equal(w.currentFen(),before.fen());
  key('ArrowUp');key('ArrowDown');assert.equal(w.currentFen(),before.fen());
  key('ArrowRight');assert.equal(w.currentFen(),puzzle.fen);assert.equal(w.puzzleHistoryIndex,null);
  assert.equal(w.root.querySelector('[data-square=d5] img').dataset.piece,'bQ');
  assert.deepEqual(sounds,['Qxd5','Qxd5','Qxd5']);

  await w.submitPuzzle('b1c3');
  assert.equal(w.activity.step,2);
  const latest=w.currentFen(),progress=structuredClone(w.store.value),moves=[...w.puzzleMoves],last=w.lastMove;
  const afterPlayer=new Chess(puzzle.fen);afterPlayer.move('Nc3');
  sounds.length=0;
  key('ArrowLeft');assert.equal(w.currentFen(),afterPlayer.fen());
  assert.equal(w.root.querySelector('[data-square=c3]').classList.contains('last-move'),true);
  key('ArrowLeft');assert.equal(w.currentFen(),puzzle.fen);
  key('Home');assert.equal(w.currentFen(),before.fen());
  key('End');assert.equal(w.currentFen(),latest);
  key('ArrowRight');assert.equal(w.currentFen(),latest);
  assert.deepEqual(sounds,['Qa5','Nc3','Qxd5','Qa5']);
  assert.equal(w.root.querySelector('.puzzle-turn-cue'),cue);assert.equal(cue.textContent,'White to move');
  assert.deepEqual(w.store.value,progress);assert.deepEqual(w.puzzleMoves,moves);
  assert.equal(w.lastMove,last);assert.equal(w.activity.step,2);
  assert.equal(w.run?.correctMoves,mode==='practice'?undefined:1);
  assert.equal(w.attemptRecorded,false);
  w.flipBoard();key('ArrowLeft');assert.equal(w.currentFen(),afterPlayer.fen());
  key('End');await w.submitPuzzle('d2d4');
  if(mode==='timeAttack'||mode==='knockout')assert.equal(w.result.solved,1);
  else {
    assert.equal(w.feedback.status,'completed');
    key('ArrowLeft');assert.equal(w.currentFen(),latest);
    key('End');assert.equal(new Chess(w.currentFen()).get('d4').type,'p');
    assert.equal(w.attemptRecorded,true);
  }
});

test('history keys respect inputs, settings, modifier keys and an open dropdown',async t=>{
  const {w,key}=await setup(t);
  const input=w.doc.createElement('input');w.root.append(input);input.focus();
  assert.equal(key('ArrowLeft').defaultPrevented,false);assert.equal(w.currentFen(),puzzle.fen);
  w.root.focus();
  for(const modifier of ['ctrlKey','metaKey','altKey'])assert.equal(key('ArrowLeft',{[modifier]:true}).defaultPrevented,false);
  const settings=w.doc.createElement('div');settings.id='settings';const button=w.doc.createElement('button');settings.append(button);w.root.append(settings);button.focus();
  assert.equal(key('ArrowLeft').defaultPrevented,false);assert.equal(w.currentFen(),puzzle.fen);
  w.root.focus();w.dropdown={};key('ArrowLeft');assert.equal(w.currentFen(),puzzle.fen);w.dropdown=null;
});

for(const mode of ['practice','timeAttack','knockout','challenge'])test(`${mode} keeps the Black solver cue while viewing the opponent opening move`,async t=>{
  const c=new Chess(),fen=c.fen();c.move('e4');
  const p={...puzzle,fen:c.fen(),setup:{fen,move:'e2e4'},solution:['e7e5','g1f3','b8c6']};
  const {w,key}=await setup(t,mode,p),cue=w.root.querySelector('.puzzle-turn-cue');
  key('ArrowLeft');assert.equal(w.currentFen(),fen);
  assert.equal(w.root.querySelector('.puzzle-turn-cue'),cue);assert.equal(cue.textContent,'Black to move');
  key('ArrowRight');assert.equal(w.root.querySelector('.puzzle-turn-cue'),cue);assert.equal(cue.textContent,'Black to move');
});

test('pending opponent replies finish before history navigation, and a new puzzle resets history',async t=>{
  const {w,key}=await setup(t);
  let release;const waiting=new Promise(resolve=>{release=resolve;});
  t.mock.method(w,'waitForPuzzleReply',()=>waiting);
  const reply=w.submitPuzzle('b1c3');
  assert.equal(w.busy,true);const fen=w.currentFen();
  key('ArrowLeft');key('Home');assert.equal(w.currentFen(),fen);assert.equal(w.puzzleHistoryIndex,null);
  release(true);await reply;
  key('Home');assert.equal(w.currentFen(),before.fen());
  const next={...puzzle,id:'next',setup:null};w.puzzles.push(next);await w.preparePuzzle(next);
  assert.equal(w.puzzleHistoryIndex,null);key('ArrowLeft');assert.equal(w.currentFen(),next.fen);
  assert.equal(w.puzzleHistory.length,1);assert.deepEqual(w.puzzleMoves,[]);
});

test('Time attack expires from the live position while reviewing earlier moves',async t=>{
  const {w,key}=await setup(t,'timeAttack');
  await w.submitPuzzle('b1c3');const live=w.currentFen(),last=w.lastMove;
  key('Home');assert.equal(w.currentFen(),before.fen());
  await w.finishChallenge('Time is up');
  assert.equal(w.result.board.fen,live);assert.equal(w.result.board.lastMove,last);
  assert.equal(w.result.solved,0);assert.equal(w.puzzleHistoryIndex,null);
});

test('history excludes rejected moves and never exposes unplayed solution moves',async t=>{
  const {w,key}=await setup(t);
  await w.submitPuzzle('d2d4');
  assert.equal(w.activity.mistakes,1);assert.equal(w.puzzleHistory.length,2);
  key('End');key('ArrowRight');assert.equal(w.currentFen(),puzzle.fen);
  key('Home');assert.equal(w.currentFen(),before.fen());
  assert.equal(w.root.querySelector('.puzzle-wrong, .puzzle-result-badge'),null);
  key('End');assert.ok(w.root.querySelector('.puzzle-result-badge[data-result=incorrect]'));
  assert.equal(w.activity.mistakes,1);assert.deepEqual(w.puzzleMoves,[]);
});

test('puzzles without a valid opening setup stop history at their initial position',async t=>{
  const p={...puzzle,setup:{fen:before.fen(),move:'d8d6'}};
  const {w,key}=await setup(t,'practice',p);
  key('Home');key('ArrowLeft');assert.equal(w.currentFen(),p.fen);
  assert.equal(w.puzzleHistory.length,1);
  await w.submitPuzzle('b1c3');key('Home');assert.equal(w.currentFen(),p.fen);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} result replays support opening capture history without changing recorded results`,async t=>{
  const {w,key,data}=await setup(t,mode);await w.submitPuzzle('d2d4');
  if(w.run)await w.finishChallenge('Ended early');
  const result=w.result,saved=structuredClone(data['learning:v1']);
  await w.replayRunPuzzle(puzzle.id);key('ArrowLeft');assert.equal(w.currentFen(),before.fen());
  key('End');await w.submitPuzzle('b1c3');const live=w.currentFen();
  key('Home');assert.equal(w.currentFen(),before.fen());key('End');assert.equal(w.currentFen(),live);
  assert.equal(w.runReplay,result);assert.deepEqual(data['learning:v1'],saved);
});

for(const [name,fen,move,answer] of [
  ['castling','r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1','e8g8','e1c1'],
  ['promotion','7k/8/8/8/8/7K/p7/1R6 b - - 0 1','a2a1q','b1a1'],
  ['en passant','7k/8/8/8/3pP3/8/8/7K b - e3 0 1','d4e3','h1g1'],
])test(`opening ${name} restores the exact position and all pieces when stepping back`,async t=>{
  const c=new Chess(fen);c.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
  const p={...puzzle,setup:{fen,move},fen:c.fen(),solution:[answer]};
  const {w,key,sounds}=await setup(t,'practice',p);
  key('ArrowLeft');assert.equal(w.currentFen(),fen);
  key('ArrowRight');assert.equal(w.currentFen(),p.fen);
  assert.deepEqual(sounds,[c.history()[0],c.history()[0],c.history()[0]]);
});

test('embedded puzzle history updates the shared board without changing game review',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const sounds=[];a.state.settings.sound=true;a.replace('playEvent',event=>sounds.push(event));
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[puzzle]})}));
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  await w.startPuzzleSelection([puzzle]);
  sounds.length=0;
  const board=w.boardElement,positions=JSON.stringify(a.state.positions),idx=a.state.idx;
  board.querySelector('[data-square=d5]').focus();
  a.dom.window.document.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  assert.equal(w.currentFen(),before.fen());assert.equal(board.querySelector('[data-square=d5] img').dataset.piece,'wP');
  assert.equal(w.boardElement,board);assert.equal(a.state.idx,idx);assert.equal(JSON.stringify(a.state.positions),positions);
  assert.equal(a.dom.window.document.activeElement,w.root);assert.equal(a.state.analysisMode,false);
  assert.deepEqual(sounds,['capture']);
  w.stepPuzzleHistory(1);assert.deepEqual(sounds,['capture','capture']);
  a.state.settings.sound=false;
  w.stepPuzzleHistory(0);w.stepPuzzleHistory(1);assert.deepEqual(sounds,['capture','capture']);
});

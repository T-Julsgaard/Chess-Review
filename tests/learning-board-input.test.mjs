import test from 'node:test';
import assert from 'node:assert/strict';
import {app,loadGame,settle} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';

async function setup(t) {
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.state.settings.learningTransition='morph3';
  const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({schema:1,puzzles:[{}]})});
  t.after(()=>{globalThis.fetch=original;});
  await a.call('openLearning');const w=a.run('learningWorkspace'),doc=a.dom.window.document;
  t.mock.method(w,'showPuzzleRunStart',async()=>true); // Exercise input after the ready countdown.
  const puzzle={id:'board-input',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3','b8c6','f1c4'],rating:1200,themes:[]};
  w.puzzles=[puzzle];await w.startPuzzleSelection([puzzle]);
  const board=doc.querySelector('.board');board.getBoundingClientRect=()=>({left:0,top:0,width:800,height:800});
  const point=sq=>({clientX:(sq.charCodeAt(0)-97)*100+50,clientY:(8-Number(sq[1]))*100+50});
  const event=(type,sq,button=0)=>{const e=new a.dom.window.MouseEvent(type,{bubbles:true,cancelable:true,button,...point(sq)});Object.defineProperty(e,'pointerId',{value:1});return e;};
  const down=(sq,button=0)=>board.querySelector(`[data-square=${sq}]`).dispatchEvent(event('pointerdown',sq,button));
  const up=(sq,button=0)=>a.dom.window.dispatchEvent(event('pointerup',sq,button));
  return {a,w,doc,board,down,up,event};
}

for(const mode of ['timeAttack','knockout'])test(`${mode} results retain the embedded puzzle board and its wrong-move badge`,async t=>{
  const {a,w,doc,board,down,up}=await setup(t);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  const puzzle=w.puzzles[0];w.puzzles=Array.from({length:4},(_,i)=>({...puzzle,id:'final-board-'+i}));
  await w.startPuzzleRun(mode);
  if(mode==='timeAttack'){await w.submitPuzzle('d2d4');await w.submitPuzzle('d2d4');}
  await w.submitPuzzle('e2e4');
  if(mode==='knockout')w.flipBoard();
  const fen=w.currentFen(),flipped=w.flipped;
  const position=()=>[...board.querySelectorAll('[data-square]')].map(n=>[n.dataset.square,n.querySelector('img')?.dataset.piece]);
  const expected=position();await w.submitPuzzle('g1h3');
  assert.equal(w.run,null);assert.equal(w.currentFen(),fen);assert.equal(w.flipped,flipped);
  assert.equal(doc.querySelector('.board'),board);assert.deepEqual(position(),expected);
  assert.equal(board.querySelector('.puzzle-run-end-title').textContent,'Puzzles solved');
  assert.equal(board.querySelector('.puzzle-run-end-reason'),null);
  assert.ok(board.querySelector('[data-square=g1] .puzzle-result-badge[data-result=incorrect]'));
  assert.ok(board.querySelector('[data-square=g1].puzzle-wrong'));
  assert.ok(board.querySelector('[data-square=h3].puzzle-wrong'));
  down('e4');up('e4');board.querySelector('[data-square=g1]').click();
  assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(w.selected,null);assert.equal(w.currentFen(),fen);
  assert.ok(board.querySelector('.puzzle-result-badge[data-result=incorrect]'));
  w.render();assert.deepEqual(position(),expected);assert.ok(board.querySelector('.puzzle-result-badge'));
  assert.ok(board.querySelector('.puzzle-run-end'),'Results redraws keep the final screen visible');
  assert.equal(a.state.analysisMode,false);
});

test('learning immediately lifts pieces, shares review drag tracking, and restores pieces on cancellation',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  down('e2');assert.equal(doc.querySelectorAll('.drag-piece img').length,1);
  assert.equal(board.querySelector('[data-square=e2] img').style.visibility,'hidden');
  assert.ok(board.querySelector('[data-square=e4]').classList.contains('legal'));
  a.dom.window.dispatchEvent(event('pointermove','e4'));up('e4');await settle();
  assert.equal(w.activity.step,2);assert.equal(doc.querySelector('.drag-piece'),null);
  down('g1');a.dom.window.dispatchEvent(event('pointercancel','g1'));
  assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(w.selected,null);
  assert.equal(board.querySelector('[data-square=g1] img').style.visibility,'');
  down('b8');assert.ok(doc.querySelector('.drag-piece'));a.dom.window.dispatchEvent(event('pointermove','c6'));up('c6');
  assert.equal(w.activity.step,2,'Wrong-side pieces must snap back');
  down('g1');await w.close();assert.equal(doc.querySelector('.drag-piece'),null);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} result replays accept embedded board clicks and drags without changing the result controls`,async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  await w.navigate('puzzles');await w.startPuzzleRun(mode);await w.submitPuzzle('d2d4');
  if(w.run)await w.finishChallenge('Ended early');
  const result=w.result,saved=JSON.stringify(w.store.value);
  const controls=()=>[...doc.querySelectorAll('.puzzle-run-results button')].map(n=>n.textContent);
  const originalControls=controls();await w.replayRunPuzzle(result.results[0].id);
  assert.equal(doc.querySelector('.board'),board);
  assert.equal(doc.querySelector('.puzzle-turn-cue').textContent,'White to move');
  down('e2');up('e2');down('e4');up('e4');await settle();
  assert.equal(w.activity.step,2);assert.equal(new Chess(w.currentFen()).get('e5').color,'b');
  down('g1');a.dom.window.dispatchEvent(event('pointermove','f3'));up('f3');await settle();
  assert.equal(w.activity.step,4);assert.equal(doc.querySelector('.drag-piece'),null);
  down('f1');a.dom.window.dispatchEvent(event('pointermove','c4'));up('c4');await settle();
  assert.equal(w.feedback.status,'completed');assert.equal(w.attemptRecorded,true);
  assert.deepEqual(controls(),originalControls);assert.equal(JSON.stringify(w.store.value),saved);
  assert.equal(w.runReplay,result);assert.equal(doc.querySelector('.puzzle-practice-actions, .puzzle-analyse, .puzzle-rating-region'),null);
  assert.equal(a.state.analysisMode,false);
});

test('the learning library board supports independent moves, arrows, marks and piece pickup',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);await w.navigate('puzzles');
  const reviewFen=a.call('activePos').fen,reviewPositions=a.state.positions,progress=JSON.stringify(w.store.value);
  assert.equal(w.currentFen(),new Chess().fen());
  down('g1',2);up('f3',2);assert.ok(board.querySelector('.user-arrows'));
  down('e4',2);up('e4',2);assert.ok(board.querySelector('[data-square=e4].marked'));
  down('e2');assert.ok(doc.querySelector('.drag-piece'));assert.ok(board.querySelector('[data-square=e4].legal'));up('e2');down('e4');up('e4');
  assert.equal(new Chess(w.currentFen()).get('e4').type,'p');assert.equal(board.querySelector('.user-arrows'),null);
  down('e7');a.dom.window.dispatchEvent(event('pointermove','e5'));up('e5');
  const scratchFen=w.currentFen();assert.equal(new Chess(scratchFen).get('e5').color,'b');
  await w.navigate('concepts');await w.navigate('openings');assert.equal(w.currentFen(),scratchFen);
  a.call('toggleFlip');assert.equal(w.currentFen(),scratchFen);assert.equal(a.state.analysisMode,false);assert.equal(board.classList.contains('analysis'),false);
  assert.equal(a.call('activePos').fen,reviewFen);assert.equal(a.state.positions,reviewPositions);assert.equal(JSON.stringify(w.store.value),progress);
  await w.close();assert.equal(a.call('activePos').fen,reviewFen);assert.equal(doc.querySelector('.board'),board);
});

test('learning free play can promote through the same graphical picker',async t=>{
  const {w,doc,down,up}=await setup(t);await w.navigate('puzzles');
  w.homePosition.load('7k/P7/8/8/8/8/8/7K w - - 0 1');w.render();
  down('a7');up('a7');down('a8');up('a8');
  assert.deepEqual([...doc.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['wQ','wR','wB','wN']);
  doc.querySelector('[aria-label="Promote to knight"]').click();assert.equal(w.homePosition.get('a8').type,'n');assert.equal(w.activity,null);
});

test('learning supports click moves, toggled right-click markup, and clears annotations on a left click',async t=>{
  const {w,doc,board,down,up}=await setup(t);
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  down('g1',2);up('g1',2);assert.ok(board.querySelector('[data-square=g1]').classList.contains('marked'));
  down('g1',2);up('g1',2);assert.equal(board.querySelector('[data-square=g1]').classList.contains('marked'),false);
  down('g1',2);up('f3',2);assert.equal(board.querySelectorAll('.user-arrows').length,1);
  down('e2');up('e2');assert.equal(board.querySelector('.user-arrows'),null);
  down('e4');up('e4');await settle();assert.equal(w.activity.step,2);
  assert.equal(doc.querySelector('.drag-piece'),null);await w.close();
});

test('clicking a selected piece again hides destinations while preserving drag and keyboard input',async t=>{
  const {w,board,down,up}=await setup(t);
  down('e2');up('e2');assert.equal(w.selected,'e2');assert.ok(board.querySelector('.legal'));
  down('e2');up('e2');assert.equal(w.selected,null);assert.equal(board.querySelector('.legal, .legal-cap, .sel'),null);
  down('e2');up('e2');assert.equal(w.selected,'e2');
  board.querySelector('[data-square=e2]').click();assert.equal(w.selected,null);
  down('e2');down('e2',2);up('e2',2);assert.equal(w.selected,null);
  assert.equal(board.querySelector('.legal, .legal-cap, .sel'),null);
  await w.close();
});

test('puzzle hints use the configured best-move arrow and reset for the next solver turn',async t=>{
  const {a,w,doc,board}=await setup(t);
  const puzzle={id:'hint-line',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,themes:[],theme:'fork',source:{url:'https://lichess.org/training'}};
  w.puzzles=[puzzle];a.state.settings.bestArrowColor='#123456';a.state.settings.arrowOpacity=.7;
  await w.startPuzzleSelection([puzzle]);
  assert.equal(doc.querySelector('.learn-board-caption'),null);
  await w.hintPuzzle();const elo=w.store.value.puzzleRating.elo;
  assert.ok(elo<1200);assert.ok(board.querySelector('[data-square=e2].puzzle-hint-square'));assert.equal(board.querySelector('.annotated, .puzzle-hint-arrow'),null);
  await w.hintPuzzle();const arrow=board.querySelector('.best-arrow');assert.ok(arrow);
  assert.equal(arrow.querySelector('g').getAttribute('fill'),'#123456');assert.equal(arrow.querySelector('g').getAttribute('opacity'),'0.7');
  assert.equal(w.store.value.puzzleRating.elo,elo);
  await w.submitPuzzle('e2e4');assert.equal(board.querySelector('.puzzle-hint-square, .puzzle-hint-arrow'),null);
  await w.hintPuzzle();assert.ok(board.querySelector('[data-square=g1].puzzle-hint-square'));assert.equal(board.querySelector('.puzzle-hint-arrow'),null);
  await w.hintPuzzle();assert.ok(board.querySelector('.puzzle-hint-arrow'));assert.equal(w.store.value.puzzleRating.elo,elo);
  await w.submitPuzzle('g1f3');assert.equal(w.store.value.puzzleRating.elo,elo);assert.equal(w.store.value.puzzles[puzzle.id].clean,0);
  await w.close();
});

test('puzzle hint highlights survive pickup, deselection, cancellation and wrong moves until the correct move',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);
  const puzzle={id:'persistent-hint',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:[],theme:'fork',source:{url:'https://lichess.org/training'}};
  w.puzzles=[puzzle];await w.startPuzzleSelection([puzzle]);await w.hintPuzzle();await w.hintPuzzle();
  const hinted=()=>board.querySelector('[data-square=e2].puzzle-hint-square');
  down('e2');assert.ok(doc.querySelector('.drag-piece'));assert.ok(hinted());up('e2');
  down('e2');assert.equal(w.selected,null);assert.ok(hinted());
  a.dom.window.dispatchEvent(event('pointercancel','e2'));assert.equal(doc.querySelector('.drag-piece'),null);assert.ok(hinted());
  down('g1');assert.equal(w.selected,'g1');assert.ok(hinted());
  a.dom.window.dispatchEvent(new a.dom.window.Event('blur'));assert.equal(w.selected,null);assert.ok(hinted());
  down('g1',2);assert.ok(hinted());up('g1',2);assert.ok(hinted());
  down('e2');a.dom.window.dispatchEvent(event('pointermove','e5'));up('e5');assert.equal(w.selected,null);assert.ok(hinted());
  down('e2');a.dom.window.dispatchEvent(event('pointermove','e3'));up('e3');await settle();
  assert.equal(w.activity.step,0);assert.ok(hinted());assert.ok(board.querySelector('.puzzle-hint-arrow'));
  down('e2');assert.ok(hinted());a.dom.window.dispatchEvent(event('pointermove','e4'));up('e4');await settle();
  assert.equal(w.feedback.status,'completed');assert.equal(board.querySelector('.puzzle-hint-square, .puzzle-hint-arrow'),null);
  await w.close();
});

test('learning promotion requires an explicit choice and Escape cancels without closing learning',async t=>{
  const {a,w,doc,board,down,up}=await setup(t);
  await w.navigate('puzzles');w.homePosition.load('7k/P7/8/8/8/8/8/7K w - - 0 1');w.render();
  const moves=[];w.submitMove=move=>moves.push(move);
  down('a7');up('a7');down('a8');up('a8');
  assert.equal(doc.querySelectorAll('.learn-promotion .promotion-options button').length,4);
  assert.equal(doc.querySelector('.learn-promotion').parentNode,board);
  assert.equal(doc.querySelector('.promotion-picker').dataset.color,'w');
  assert.equal(doc.querySelector('.learn-promotion h3'),null);
  assert.deepEqual([...doc.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['wQ','wR','wB','wN']);
  assert.ok([...doc.querySelectorAll('.promotion-options button')].every(n=>n.textContent===''));
  assert.deepEqual(moves,[]);
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.querySelector('.learn-promotion'),null);assert.equal(w.closed,false);
  down('a7');up('a7');down('a8');up('a8');
  doc.querySelector('[aria-label="Promote to rook"]').click();assert.deepEqual(moves,['a7a8r']);
  await w.close();assert.ok(board);
});

test('a picked-up solver piece survives the opponent introduction and reply after cancelling a premove',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);
  const before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
  const puzzle={id:'pickup-intro',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution:['e4d5','d8d5','b1c3'],rating:1200,themes:[],theme:'fork',source:{url:'https://lichess.org/training'}};
  w.puzzles=[puzzle];a.state.settings.moveAnim=true;
  let advance,finishSlide;
  t.mock.method(w,'waitForPuzzleReply',()=>new Promise(resolve=>{advance=()=>resolve(true);}));
  a.dom.window.HTMLImageElement.prototype.animate=()=>({finished:new Promise(resolve=>{finishSlide=resolve;}),cancel(){finishSlide?.();}});
  const opening=w.startPuzzleSelection([puzzle]);await settle();
  down('e4');assert.ok(board.querySelector('[data-square=e4].sel'));assert.ok(doc.querySelector('.drag-piece'));
  assert.ok(board.querySelector('[data-square=d5].legal-cap'),'The capture marker uses the settled opponent position during the introduction');
  a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');
  assert.equal(w.activity.step,0);assert.equal(w.store.value.puzzleRating.played,0);assert.equal(doc.querySelector('.drag-piece'),null);
  assert.equal(board.querySelector('[data-square=d5] img').dataset.piece,'wP');assert.ok(board.querySelector('[data-square=d5].premove'));
  down('d5',2);up('d5',2);
  down('e4');const ghost=doc.querySelector('.drag-piece');advance();await settle();
  assert.equal(doc.querySelector('.drag-piece'),ghost);assert.equal(board.querySelector('[data-square=e4] img').style.visibility,'hidden');
  finishSlide();await opening;assert.equal(doc.querySelector('.drag-piece'),ghost);
  assert.equal(w.selected,'e4');assert.equal(w.busy,false);
  a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');await settle();
  assert.equal(w.activity.step,1);assert.equal(w.busy,true);assert.equal(doc.querySelector('.drag-piece'),null);
  assert.deepEqual([...board.querySelectorAll('.last-move')].map(n=>n.dataset.square).sort(),['d5','e4']);
  down('b1');const knight=doc.querySelector('.drag-piece');assert.ok(knight);
  assert.ok(board.querySelector('[data-square=c3].legal'),'Destinations appear while the opponent reply is pending');
  advance();await settle();
  assert.equal(doc.querySelector('.drag-piece'),knight);assert.equal(w.activity.step,2);
  assert.deepEqual([...board.querySelectorAll('.last-move')].map(n=>n.dataset.square).sort(),['d5','d8']);
  finishSlide();await settle();assert.equal(w.busy,false);assert.equal(doc.querySelector('.drag-piece'),knight);
  a.dom.window.dispatchEvent(event('pointermove','c3'));up('c3');await settle();
  assert.equal(w.feedback.status,'completed');assert.equal(w.store.value.puzzleRating.played,1);
  assert.equal(doc.querySelector('.drag-piece'),null);await w.close();
});

test('puzzle promotion uses the graphical picker and submits the selected underpromotion',async t=>{
  const {w,doc,board,down,up}=await setup(t);
  const puzzle={id:'promote',fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',solution:['a7a8r'],rating:1200,themes:[],theme:'promotion',source:{url:'https://lichess.org/training'}};
  w.puzzles=[puzzle];await w.startPuzzleSelection([puzzle]);down('a7');up('a7');down('a8');up('a8');
  assert.equal(w.activity.step,0);assert.deepEqual([...doc.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['wQ','wR','wB','wN']);
  doc.querySelector('[aria-label="Promote to rook"]').click();await settle();
  assert.equal(w.feedback.status,'completed');assert.equal(board.querySelector('[data-square=a8] img').dataset.piece,'wR');
});

for(const mode of ['free','puzzle'])for(const flipped of [false,true])test(`Black ${mode} promotion identifies its color when flipped=${flipped}`,async t=>{
  const {w,doc,board}=await setup(t);
  const fen='7k/8/8/8/8/8/p7/7K b - - 0 1';
  await w.navigate('puzzles');
  if(mode==='puzzle') {
    w.puzzles=[{id:'black-promotion',fen,solution:['a2a1n'],rating:1200,themes:[]}];
    await w.startPuzzleSelection(w.puzzles);
  } else w.homePosition.load(fen);
  w.render();if(w.flipped!==flipped)w.flipBoard();
  board.querySelector('[data-square=a2]').click();board.querySelector('[data-square=a1]').click();
  assert.equal(doc.querySelector('.promotion-picker').dataset.color,'b');
  assert.equal(doc.querySelector('.learn-promotion').dataset.edge,flipped?'top':'bottom');
  assert.deepEqual([...doc.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['bQ','bR','bB','bN']);
  doc.querySelector('[aria-label="Promote to knight"]').click();await settle();
  assert.equal(board.querySelector('[data-square=a1] img').dataset.piece,'bN');
});

test('a solver piece captured by the opponent cancels its pickup cleanly',async t=>{
  const {a,w,doc,down}=await setup(t);
  const before=new Chess();before.move('e4');before.move('d5');const after=new Chess(before.fen());after.move('exd5');
  const puzzle={id:'captured-pickup',fen:after.fen(),setup:{fen:before.fen(),move:'e4d5'},solution:['d8d5'],rating:1200,themes:[],theme:'fork',source:{url:'https://lichess.org/training'}};
  w.puzzles=[puzzle];a.state.settings.moveAnim=true;let advance;
  t.mock.method(w,'waitForPuzzleReply',()=>new Promise(resolve=>{advance=()=>resolve(true);}));
  const opening=w.startPuzzleSelection([puzzle]);await settle();down('d5');assert.ok(doc.querySelector('.drag-piece'));
  advance();await opening;assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(w.selected,null);assert.equal(w.store.value.puzzleRating.played,0);
});

function controlledReplies(t,w) {
  t.mock.method(w,'waitForPuzzleReply',function(){
    if(!this.opponentPlaying)return Promise.resolve(true);
    this.replyPending=true;
    return new Promise(resolve=>{this.releaseReply=value=>{this.releaseReply=null;this.replyPending=false;resolve(value);};});
  });
}
const drain=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
function quickPuzzle(solution=['e4d5','d8d5','b1c3']) {
  const before=new Chess();before.move('e4');const after=new Chess(before.fen());after.move('d5');
  return {id:'quick-reply',fen:after.fen(),setup:{fen:before.fen(),move:'d7d5'},solution,rating:450,themes:[]};
}

test('practice premoves preview captures and execute once after introductions and replies',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);w.puzzles=[quickPuzzle()];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleSelection(w.puzzles);await drain();const fen=w.currentFen();
  down('e4');a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');up('d5');
  assert.equal(w.currentFen(),fen);assert.equal(w.activity.step,0);assert.equal(w.store.value.puzzleRating.played,0);
  assert.equal(board.querySelector('[data-square=e4] img'),null);
  assert.equal(board.querySelector('[data-square=d5] img').dataset.piece,'wP');
  assert.deepEqual([...board.querySelectorAll('.premove')].map(n=>n.dataset.square).sort(),['d5','e4']);
  w.render();assert.ok(board.querySelector('[data-square=d5].premove'));
  w.releaseReply(true);await starting;await drain();assert.equal(w.activity.step,1);
  down('b1');up('b1');down('c3');up('c3');
  assert.equal(board.querySelector('[data-square=c3] img').dataset.piece,'wN');
  assert.equal(w.activity.step,1);assert.equal(w.busy,true);
  w.releaseReply(true);await drain();
  assert.equal(w.feedback.status,'completed');assert.equal(w.activity.step,3);
  assert.equal(w.store.value.puzzleRating.played,1);assert.equal(w.premove,null);
  assert.equal(board.querySelector('.premove'),null);assert.equal(doc.querySelector('.drag-piece'),null);
});

for(const cancel of ['right-click','Escape'])test(`practice premoves support ${cancel} cancellation`,async t=>{
  const {a,w,board,down,up,event}=await setup(t);controlledReplies(t,w);
  const playing=w.submitPuzzle('e2e4');await drain();
  down('g1');a.dom.window.dispatchEvent(event('pointermove','h3'));up('h3');
  assert.ok(board.querySelector('[data-square=h3].premove'));
  down('h3');a.dom.window.dispatchEvent(event('pointermove','g5'));up('g5');
  assert.deepEqual(w.premove.moves,['g1h3','h3g5']);
  if(cancel==='right-click'){down('h3',2);up('h3',2);}
  if(cancel==='Escape')a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.premove,null);assert.equal(board.querySelector('.premove'),null);
  assert.equal(board.querySelector('[data-square=g1] img').dataset.piece,'wN');
  w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.mistakes,0);assert.equal(w.closed,false);
  assert.equal(w.activity.step,2);
  if(w.releaseReply)w.releaseReply(true);await drain();
});

for(const mode of ['practice','knockout','timeAttack'])for(const input of ['drag','click'])test(`${mode} queues successive ${input} premoves with the same piece and executes each once`,async t=>{
  const {a,w,board,down,up,event}=await setup(t),queued=[];
  controlledReplies(t,w);
  w.puzzles=[{...w.puzzles[0],solution:['e2e4','e7e5','g1f3','b8c6','f3g5','h7h6','g5f7']}];
  if(mode==='practice')await w.startPuzzleSelection(w.puzzles);else await w.startPuzzleRun(mode);
  const run=w.run;
  w.onPuzzlePremove=()=>queued.push('move');
  const playing=w.submitPuzzle('e2e4');await drain();
  const queue=(from,to)=>{
    if(input==='click'){board.querySelector(`[data-square=${from}]`).click();board.querySelector(`[data-square=${to}]`).click();}
    else {down(from);a.dom.window.dispatchEvent(event('pointermove',to));up(to);}
  };
  queue('g1','f3');queue('f3','g5');queue('g5','f7');
  assert.deepEqual(w.premove.moves,['g1f3','f3g5','g5f7']);
  assert.deepEqual(queued,['move','move','move']);
  assert.equal(board.querySelector('[data-square=f7].premove img').dataset.piece,'wN');
  assert.equal(board.querySelector('[data-square=g1] img'),null);
  assert.equal(board.querySelector('[data-square=f3] img'),null);
  w.render();assert.equal(board.querySelector('[data-square=f7].premove img').dataset.piece,'wN');
  if(mode!=='timeAttack'){
    assert.equal(w.activity.step,1);w.releaseReply(true);await drain();
    assert.equal(w.activity.step,3);assert.deepEqual(w.premove.moves,['f3g5','g5f7']);
    w.releaseReply(true);await drain();
    assert.equal(w.activity.step,5);assert.deepEqual(w.premove.moves,['g5f7']);
    w.releaseReply(true);
  }
  await playing;await drain();
  assert.equal(w.premove,null);assert.equal(w.pendingOpponent,null);
  assert.equal(board.querySelector('.premove'),null);
  assert.equal(board.querySelector('[data-square=f7] img').dataset.piece,'wN');
  if(run){assert.equal(run.solved,1);assert.equal(run.correctMoves,4);assert.equal(run.mistakes,0);}
  else {assert.equal(w.activity.step,7);assert.equal(w.feedback.status,'completed');assert.equal(w.activity.mistakes,0);assert.equal(w.store.value.puzzleRating.played,1);}
  assert.deepEqual(queued,['move','move','move']);
});

test('a second piece can be premoved while an invalid drop preserves the existing queue',async t=>{
  const {a,w,board,down,up,event}=await setup(t);controlledReplies(t,w);
  const playing=w.submitPuzzle('e2e4');await drain();
  down('g1');a.dom.window.dispatchEvent(event('pointermove','f3'));up('f3');
  const request=w.premove;
  down('f3');a.dom.window.dispatchEvent(event('pointermove','f4'));up('f4');
  assert.equal(w.premove,request);assert.deepEqual(w.premove.moves,['g1f3']);
  down('f1');up('f1');down('c4');up('c4');
  assert.deepEqual(w.premove.moves,['g1f3','f1c4']);
  assert.equal(board.querySelector('[data-square=f3].premove img').dataset.piece,'wN');
  assert.equal(board.querySelector('[data-square=c4].premove img').dataset.piece,'wB');
  w.releaseReply(true);await drain();w.releaseReply(true);await playing;await drain();
  assert.equal(w.feedback.status,'completed');assert.equal(w.premove,null);
});

test('more premoves can be appended after the first queued move has executed',async t=>{
  const {w,board}=await setup(t);controlledReplies(t,w);
  w.puzzles=[{...w.puzzles[0],solution:['e2e4','e7e5','g1f3','b8c6','f3g5','h7h6','g5f7']}];await w.startPuzzleSelection(w.puzzles);
  const playing=w.submitPuzzle('e2e4');await drain();
  for(const sq of ['g1','f3','f3','g5'])board.querySelector(`[data-square=${sq}]`).click();
  const request=w.premove;
  w.releaseReply(true);await drain();assert.equal(w.activity.step,3);
  for(const sq of ['g5','f7'])board.querySelector(`[data-square=${sq}]`).click();
  assert.equal(w.premove,request);assert.deepEqual(w.premove.moves,['f3g5','g5f7']);
  w.releaseReply(true);await drain();w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.step,7);assert.equal(w.feedback.status,'completed');assert.equal(w.premove,null);
});

test('Black can chain premoves from the projected piece position on a flipped board',async t=>{
  const {w,board}=await setup(t),before=new Chess();before.move('e4');controlledReplies(t,w);
  w.puzzles=[{...w.puzzles[0],fen:before.fen(),solution:['e7e5','g1f3','b8c6','f1c4','c6b4']}];await w.startPuzzleSelection(w.puzzles);
  assert.equal(w.flipped,true);
  const playing=w.submitPuzzle('e7e5');await drain();
  for(const sq of ['b8','c6','c6','b4'])board.querySelector(`[data-square=${sq}]`).click();
  assert.deepEqual(w.premove.moves,['b8c6','c6b4']);
  assert.equal(board.querySelector('[data-square=b4].premove img').dataset.piece,'bN');
  w.releaseReply(true);await drain();w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.step,5);assert.equal(w.feedback.status,'completed');assert.equal(w.premove,null);
});

test('an incorrect premove discards its queued continuation without another mistake',async t=>{
  const {a,w,board,down,up,event}=await setup(t);controlledReplies(t,w);
  const playing=w.submitPuzzle('e2e4');await drain();
  for(const [from,to] of [['g1','h3'],['h3','g5']]){down(from);a.dom.window.dispatchEvent(event('pointermove',to));up(to);}
  assert.equal(w.premove.moves.length,2);
  w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.mistakes,1);assert.equal(w.activity.step,2);assert.equal(w.premove,null);
  assert.equal(board.querySelector('[data-square=g1] img').dataset.piece,'wN');
});

test('an opponent capture invalidating a later premove clears the queue without submitting it',async t=>{
  const {a,w,board,down,up,event}=await setup(t);controlledReplies(t,w);
  w.puzzles=[{...w.puzzles[0],solution:['e2e4','d7d5','g1f3','d5e4','f3g5']}];await w.startPuzzleSelection(w.puzzles);
  const playing=w.submitPuzzle('e2e4');await drain();
  for(const [from,to] of [['g1','f3'],['e4','e5']]){down(from);a.dom.window.dispatchEvent(event('pointermove',to));up(to);}
  assert.deepEqual(w.premove.moves,['g1f3','e4e5']);
  w.releaseReply(true);await drain();assert.equal(w.premove,null);
  w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.step,4);assert.equal(w.activity.mistakes,0);
  assert.equal(board.querySelector('[data-square=e4] img').dataset.piece,'bP');
  assert.equal(board.querySelector('.premove'),null);
});

test('a wrong premove is validated once on the solver turn',async t=>{
  const {a,w,board,down,up,event}=await setup(t);controlledReplies(t,w);
  const playing=w.submitPuzzle('e2e4');await drain();
  down('g1');a.dom.window.dispatchEvent(event('pointermove','h3'));up('h3');up('h3');
  assert.equal(w.activity.mistakes,0);w.releaseReply(true);await playing;await drain();
  assert.equal(w.activity.mistakes,1);assert.equal(w.activity.step,2);assert.equal(w.feedback.status,'incorrect');
  assert.equal(board.querySelector('[data-square=g1] img').dataset.piece,'wN');assert.equal(board.querySelector('.premove'),null);
});

for(const ending of ['close','navigation','deadline'])test(`queued premoves are discarded on ${ending}`,async t=>{
  const {a,w,doc,down,up,event}=await setup(t);w.puzzles=[quickPuzzle(['e4d5'])];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleRun('knockout');await drain();const run=w.run;
  down('e4');a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');assert.ok(w.premove);
  down('b1');a.dom.window.dispatchEvent(event('pointermove','c3'));up('c3');assert.equal(w.premove.moves.length,2);
  if(ending==='close')await w.close();
  else if(ending==='navigation')await w.navigate('openings');
  else await w.finishChallenge('Time is up');
  await starting;await drain();
  assert.equal(run.correctMoves,0);assert.equal(run.solved,0);assert.equal(w.premove,null);
  assert.equal(w.pendingOpponent,null);assert.equal(doc.querySelector('.premove, .drag-piece'),null);
});

test('a premoved underpromotion retains its choice while waiting for the reply',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t),before=new Chess('7k/P7/8/8/8/8/8/7K b - - 0 1'),after=new Chess(before.fen());after.move('Kh7');
  w.puzzles=[{id:'premove-promotion',fen:after.fen(),setup:{fen:before.fen(),move:'h8h7'},solution:['a7a8n'],rating:450,themes:[]}];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleSelection(w.puzzles);await drain();
  down('a7');a.dom.window.dispatchEvent(event('pointermove','a8'));up('a8');
  doc.querySelector('[aria-label="Promote to knight"]').click();await drain();
  assert.equal(w.activity.step,0);assert.equal(board.querySelector('[data-square=a8].premove img').dataset.piece,'wN');
  w.releaseReply(true);await starting;await drain();assert.equal(w.feedback.status,'completed');
  assert.equal(board.querySelector('[data-square=a8] img').dataset.piece,'wN');assert.equal(w.premove,null);
});

test('Time attack accepts early capture and continuation drops exactly once',async t=>{
  const {a,w,doc,board,down,up,event}=await setup(t);w.puzzles=[quickPuzzle()];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleRun('timeAttack');await drain();const running=w.run;
  down('e4');assert.ok(board.querySelector('[data-square=d5].legal-cap'));
  a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');up('d5');
  await starting;await drain();
  assert.equal(w.activity.step,1);assert.equal(w.run.correctMoves,1);assert.equal(w.run.solved,0);
  down('b1');assert.ok(board.querySelector('[data-square=c3].legal'));
  a.dom.window.dispatchEvent(event('pointermove','c3'));up('c3');up('c3');await drain();
  assert.equal(w.result.solved,1);assert.equal(running.correctMoves,2);assert.equal(w.result.results.length,1);
  assert.equal(w.store.value.puzzleRating.played,0);assert.equal(doc.querySelector('.drag-piece'),null);
  assert.equal(w.pendingOpponent,null);assert.equal(w.premove,null);
});

test('Knockout queues early capture drops until the opponent reply finishes',async t=>{
  const {a,w,board,down,up,event}=await setup(t);w.puzzles=[quickPuzzle(['e4d5'])];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleRun('knockout');await drain();
  down('e4');assert.ok(board.querySelector('[data-square=d5].legal-cap'));
  a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');await drain();
  assert.equal(w.activity.step,0);assert.equal(w.run.correctMoves,0);assert.equal(w.pendingOpponent.fastForward,false);
  assert.equal(board.querySelector('[data-square=d5] img').dataset.piece,'wP');
  assert.deepEqual([...board.querySelectorAll('.premove')].map(n=>n.dataset.square).sort(),['d5','e4']);
  w.releaseReply(true);await starting;await drain();assert.equal(w.result.solved,1);assert.equal(w.premove,null);
});

test('an early Time attack drop finishes the active slide at its destination',async t=>{
  const {a,w,doc,down,up,event}=await setup(t);w.puzzles=[quickPuzzle(['e4d5'])];
  a.state.settings.moveAnim=true;t.mock.method(w,'waitForPuzzleReply',async()=>true);
  const animations=[];
  a.dom.window.HTMLImageElement.prototype.animate=function(frames,options){
    let release;const finished=new Promise(resolve=>{release=resolve;});
    const animation={finished,finishes:0,finish(){this.finishes++;release();},cancel(){release();},options};
    animations.push(animation);return animation;
  };
  const starting=w.startPuzzleRun('timeAttack');await drain();const running=w.run;assert.ok(w.replyAnimation);
  assert.equal(animations[0].options.duration,64);
  down('e4');a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');await starting;await drain();
  assert.equal(animations[0].finishes,1);assert.equal(w.result.solved,1);assert.equal(running.correctMoves,1);
  assert.equal(doc.querySelector('.puzzle-reply-target, .drag-piece'),null);
});

test('early Time attack promotion waits for an explicit piece choice',async t=>{
  const {a,w,doc,down,up,event}=await setup(t),before=new Chess('7k/P7/8/8/8/8/8/7K b - - 0 1'),after=new Chess(before.fen());after.move('Kh7');
  w.puzzles=[{id:'early-promotion',fen:after.fen(),setup:{fen:before.fen(),move:'h8h7'},solution:['a7a8n'],rating:450,themes:[]}];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleRun('timeAttack');await drain();const running=w.run;
  down('a7');a.dom.window.dispatchEvent(event('pointermove','a8'));up('a8');await drain();
  assert.equal(w.activity.step,0);assert.equal(doc.querySelectorAll('.promotion-options button').length,4);
  doc.querySelector('[aria-label="Promote to knight"]').click();await starting;await drain();
  assert.equal(w.result.solved,1);assert.equal(running.correctMoves,1);
});

for(const ending of ['close','deadline'])test(`an early Time attack drop cannot score after ${ending}`,async t=>{
  const {a,w,doc,down,up,event}=await setup(t);w.puzzles=[quickPuzzle(['e4d5'])];
  a.state.settings.moveAnim=true;controlledReplies(t,w);
  const starting=w.startPuzzleRun('timeAttack');await drain();const running=w.run;down('e4');
  if(ending==='deadline')w.run.clock.expired=()=>true;
  a.dom.window.dispatchEvent(event('pointermove','d5'));up('d5');
  if(ending==='close')await w.close();
  await starting;await drain();
  assert.equal(w.result.solved,0);assert.equal(running.correctMoves,0);
  assert.deepEqual(w.result.results,ending==='deadline'?[{id:w.puzzles[0].id,number:1,correct:false,rating:450}]:[]);
  assert.equal(doc.querySelector('.drag-piece'),null);assert.equal(w.pendingOpponent,null);
});

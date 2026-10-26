import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {normalizeProgress, ProgressStore, recordPuzzle} from '../lib/learning/progress.js';
import {ratePuzzle, canRatePuzzle, pickRatedPuzzle, normalizePuzzleRating} from '../lib/learning/puzzle-rating.js';
import {app, loadGame} from './helpers/app.mjs';

const library=JSON.parse(fs.readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles;
const mate={...library.find(p=>p.themes.includes('mateIn1')),rating:1200};
const line={...library.find(p=>p.solution.length>=5),rating:1200};
const fresh=()=>normalizeProgress(null);
const wrongMove=puzzle=>new Chess(puzzle.fen).moves({verbose:true}).find(m=>m.lan!==puzzle.solution[0]&&!new Chess(m.after).isCheckmate()).lan;

async function setup(t,{puzzles=[mate,line],initial={},onWrong=()=>{}}={}) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data=structuredClone(initial),state={fail:false},instances=[];
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){if(state.fail)throw Error('Unavailable');Object.assign(data,structuredClone(values));}};
  const make=()=>{
    const w=new LearningWorkspace({document:dom.window.document,storage,makePiece:()=>dom.window.document.createElement('span'),onPuzzleWrong:onWrong});
    instances.push(w);return w;
  };
  t.after(async()=>{state.fail=false;for(const w of instances)await w.close();dom.window.close();});
  const w=make();await w.open();return {w,make,dom,data,state};
}

for(const [id,alternative] of [['0DybW','c6a5'],['00NEO','b7g7']])test('alternative checkmate completes and awards Elo without a mistake: '+id,async t=>{
  const puzzle=library.find(p=>p.id===id);let wrong=0;
  const {w}=await setup(t,{puzzles:[puzzle],onWrong:()=>wrong++});
  await w.startPuzzleSelection([puzzle],null,{adaptive:true});
  const elo=w.store.value.puzzleRating.elo;
  while(w.activity.step<puzzle.solution.length-1)await w.submitPuzzle(puzzle.solution[w.activity.step]);
  await w.submitPuzzle(alternative);
  assert.equal(w.attemptRecorded,true);assert.equal(wrong,0);assert.equal(w.activity.mistakes,0);
  assert.ok(new Chess(w.currentFen()).isCheckmate());assert.equal(w.puzzleMoves.at(-1),alternative);
  assert.equal(w.store.value.puzzles[id].clean,1);assert.equal(w.store.value.puzzles[id].mistakes,0);
  assert.equal(w.store.value.puzzleRating.wins,1);assert.ok(w.store.value.puzzleRating.elo>elo);
  assert.equal(w.store.value.puzzleResume,null);
});

test('Elo compares the player with puzzle difficulty and calibrates faster for the first twenty puzzles',()=>{
  for(const won of [true,false]) {
    const p=fresh(),r=ratePuzzle(p,mate,won,won?'solved':'wrong');
    assert.equal(r.delta,won?24:-24);assert.equal(p.puzzleRating.elo,won?1224:1176);
    assert.equal(p.puzzleRating.played,1);assert.equal(p.puzzleRating.wins,Number(won));assert.equal(p.puzzleRating.losses,Number(!won));
    p.puzzleRating={elo:1200,wins:10,losses:10,played:20};
    assert.equal(ratePuzzle(p,{...mate,id:'new'},won,'test').delta,won?12:-12);
  }
  assert.ok(ratePuzzle(fresh(),{...mate,rating:1600},true,'solved').delta>ratePuzzle(fresh(),{...mate,rating:800},true,'solved').delta);
  assert.ok(ratePuzzle(fresh(),{...mate,rating:800},false,'wrong').delta<ratePuzzle(fresh(),{...mate,rating:1600},false,'wrong').delta);
});

test('one puzzle can change Elo once: losing, retrying and later completing never award or deduct again',()=>{
  const p=fresh();ratePuzzle(p,mate,false,'wrong');
  for(let i=0;i<4;i++)assert.equal(ratePuzzle(p,mate,false,'wrong'),null);
  assert.equal(ratePuzzle(p,mate,true,'solved'),null);assert.equal(p.puzzleRating.elo,1176);assert.equal(p.puzzleRating.played,1);
  recordPuzzle(p,mate.id,{completed:true,mistakes:3});assert.equal(p.puzzles[mate.id].clean,0);assert.equal(p.puzzles[mate.id].recovered,1);
  const q=fresh();ratePuzzle(q,mate,true,'solved');assert.equal(ratePuzzle(q,mate,false,'wrong'),null);assert.equal(q.puzzleRating.elo,1224);
});

test('older progress gains a provisional rating without erasing lessons, resumes or puzzle history',()=>{
  const old={schema:1,lessons:{fork:{status:'completed'}},puzzles:{old:{clean:2,attempts:2}},resume:{kind:'puzzle',id:'x',step:2}};
  const p=normalizeProgress(old);assert.deepEqual(p.puzzleRating,{elo:1200,played:0,wins:0,losses:0});
  assert.deepEqual(p.lessons,old.lessons);assert.deepEqual(p.resume,old.resume);assert.equal(canRatePuzzle(p,{id:'old'}),false);
  assert.deepEqual(p.puzzleResume,old.resume);
  assert.deepEqual(normalizePuzzleRating({elo:NaN,wins:-1,losses:'3'}),p.puzzleRating);
});

test('Solve a puzzle restarts the saved puzzle across reloads, courses and changed filters',async t=>{
  const {w,make}=await setup(t);
  await w.startPuzzleSelection([line],null,{adaptive:true});await w.submitPuzzle(line.solution[0]);
  assert.equal(w.activity.step,2);
  await w.startOpening('italian');await w.close();
  const reopened=make();await reopened.open();reopened.puzzleRange=[9000,9100];reopened.render();
  assert.equal(reopened.root.textContent.includes('Continue puzzle'),false);
  assert.equal(reopened.root.querySelector('[data-focus="solve-puzzle"]').disabled,false);
  reopened.updatePuzzleSelection();assert.equal(reopened.root.querySelector('[data-focus="solve-puzzle"]').disabled,false);
  await reopened.startRatedPuzzles();
  assert.equal(reopened.activity.id,line.id);assert.equal(reopened.activity.step,0);assert.equal(reopened.currentFen(),line.fen);
  assert.equal(reopened.lastMove,line.setup.move);assert.deepEqual(reopened.puzzleMoves,[]);
  assert.equal(reopened.adaptivePuzzles,true);assert.equal(reopened.activity.rated,true);
});

test('automatically resumed assistance preserves its Elo loss and clears the saved puzzle on completion',async t=>{
  const {w,make}=await setup(t);await w.startRatedPuzzles();const id=w.activity.id;
  await w.hintPuzzle();const elo=w.store.value.puzzleRating.elo;await w.close();
  const reopened=make();await reopened.open();await reopened.startRatedPuzzles();
  assert.equal(reopened.activity.id,id);assert.equal(reopened.activity.assisted,true);assert.equal(reopened.store.value.puzzleRating.elo,elo);
  const item=reopened.puzzles.find(p=>p.id===id);
  while(!reopened.attemptRecorded)await reopened.submitPuzzle(item.solution[reopened.activity.step]);
  assert.equal(reopened.store.value.puzzleResume,null);assert.equal(reopened.store.value.puzzleRating.elo,elo);
  await reopened.navigate('puzzles');await reopened.startRatedPuzzles();assert.notEqual(reopened.activity.id,id);
});

test('missing or invalid saved puzzles fall back to a fresh eligible puzzle',async t=>{
  const {w}=await setup(t);
  for(const resume of [{kind:'puzzle',id:'removed',step:0},{kind:'puzzle',id:mate.id,step:1},{kind:'puzzle',id:mate.id,step:mate.solution.length}]){
    await w.persist(p=>{p.puzzleResume=resume;});await w.startRatedPuzzles();
    assert.equal(w.activity.step,0);assert.ok(w.puzzles.some(p=>p.id===w.activity.id));
    await w.navigate('puzzles');
  }
});

test('pairing prefers unseen puzzles within 200 Elo, adapts to rating, and falls back to nearest available puzzles',()=>{
  const p=fresh(),puzzles=[600,1100,1250,1800,2200].map(rating=>({id:String(rating),rating}));
  assert.equal(pickRatedPuzzle(puzzles,p,{random:()=>0}).rating,1100);
  assert.equal(pickRatedPuzzle(puzzles,p,{random:()=>.99}).rating,1250);
  p.puzzleRating={elo:1800,wins:20,losses:0};assert.equal(pickRatedPuzzle(puzzles,p).rating,1800);
  ratePuzzle(p,puzzles[3],false,'wrong');assert.notEqual(pickRatedPuzzle(puzzles,p)?.id,'1800');
  assert.equal(pickRatedPuzzle([{id:'far',rating:3000}],p).rating,3000);
  assert.equal(pickRatedPuzzle(puzzles,p,{seen:new Set(puzzles.map(x=>x.id))}),null);
});

test('two review tabs racing to rate the same puzzle commit exactly one result',async()=>{
  let queue=Promise.resolve();const locks={request(name,job){const next=queue.then(job);queue=next.catch(()=>{});return next;}};
  const data={},storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const a=new ProgressStore(storage,locks),b=new ProgressStore(storage,locks);
  await Promise.all([a.update(p=>ratePuzzle(p,mate,false,'wrong')),b.update(p=>ratePuzzle(p,mate,true,'solved'))]);
  await a.load();assert.equal(a.value.puzzleRating.played,1);assert.equal(a.value.puzzleRating.elo,1176);
});

test('wrong answers play the practice cue, keep the position and lower Elo once across retries, completion and reopening',async t=>{
  let cues=0;const {w,data,make}=await setup(t,{onWrong:()=>cues++});
  await w.startPuzzleSelection([mate]);const fen=w.currentFen();
  await w.submitPuzzle(wrongMove(mate));assert.equal(cues,1);assert.equal(w.currentFen(),fen);assert.equal(w.activity.step,0);
  assert.equal(w.store.value.puzzleRating.elo,1176);assert.equal(w.root.querySelectorAll('.puzzle-wrong').length,2);
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,'Wrong move');assert.equal(w.store.value.puzzles[mate.id].ratingResult.delta,-24);
  await w.submitPuzzle(wrongMove(mate));assert.equal(cues,2);assert.equal(w.store.value.puzzleRating.elo,1176);
  await w.submitPuzzle(mate.solution[0]);assert.equal(w.feedback.status,'completed');assert.equal(w.store.value.puzzleRating.elo,1176);
  assert.equal(w.store.value.puzzles[mate.id].clean,0);assert.equal(w.store.value.puzzles[mate.id].recovered,1);
  await w.preparePuzzle(mate);await w.submitPuzzle(wrongMove(mate));assert.equal(w.store.value.puzzleRating.elo,1176);
  const resume=structuredClone(data['learning:v1'].resume);await w.close();const reopened=make();await reopened.open();await reopened.resume(resume);
  await reopened.submitPuzzle(wrongMove(mate));assert.equal(reopened.store.value.puzzleRating.elo,1176);
  await reopened.submitPuzzle(mate.solution[0]);assert.equal(reopened.store.value.puzzleRating.played,1);
});

test('the final solving position paints immediately while its completion is still saving',async t=>{
  const {w}=await setup(t);await w.startPuzzleSelection([mate]);
  const original=w.store.storage.set;let release;
  w.store.storage.set=values=>new Promise(resolve=>{release=async()=>{await original(values);resolve();};});
  const pending=w.submitPuzzle(mate.solution[0]);
  const originLabel=w.root.querySelector('[data-square="'+mate.solution[0].slice(0,2)+'"]').getAttribute('aria-label');
  const paintedFen=w.currentFen();
  for(let i=0;i<20&&!release;i++)await Promise.resolve();
  assert.ok(release);await release();await pending;
  w.store.storage.set=original;
  assert.match(originLabel,/empty$/);assert.equal(paintedFen,w.solutionFen(mate,1));
  assert.equal(w.currentFen(),w.solutionFen(mate,1));
});

test('the review entry wires puzzle failures to the existing practice wrong sound',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[mate]})}));
  let cues=0;a.replace('playWrongSound',()=>cues++);a.state.settings.learningTransition='morph4';
  await a.call('openLearning');const w=a.run('learningWorkspace');await w.startPuzzleSelection([mate]);
  await w.submitPuzzle(wrongMove(mate));assert.equal(cues,1);await w.close();
});

test('a correct full line earns Elo once; partial moves, illegal input and memorized repeats do not',async t=>{
  const {w,make,data}=await setup(t);await w.startPuzzleSelection([line]);
  await w.submitPuzzle('a1a1');assert.equal(w.feedback.status,'illegal');assert.equal(w.store.value.puzzleRating.played,0);
  await w.submitPuzzle(line.solution[0]);assert.equal(w.store.value.puzzleRating.played,0);assert.equal(w.activity.step,2);
  const resume=structuredClone(data['learning:v1'].resume);await w.close();const next=make();await next.open();await next.resume(resume);
  while(!next.attemptRecorded)await next.submitPuzzle(line.solution[next.activity.step]);
  assert.equal(next.store.value.puzzleRating.elo,1224);assert.equal(next.store.value.puzzleRating.wins,1);
  await next.preparePuzzle(line);while(!next.attemptRecorded)await next.submitPuzzle(line.solution[next.activity.step]);
  assert.equal(next.store.value.puzzleRating.elo,1224);assert.equal(next.store.value.puzzles[line.id].clean,2);
});

for(const action of ['hintPuzzle','revealPuzzle','skipPuzzle'])test(`${action} records one loss and cannot add another after a wrong answer`,async t=>{
  const {w}=await setup(t);await w.startPuzzleSelection([mate]);
  await w[action]();assert.equal(w.store.value.puzzleRating.elo,1176);assert.equal(w.store.value.puzzleRating.played,1);
  await w.preparePuzzle(mate);await w.submitPuzzle(wrongMove(mate));await w.revealPuzzle();
  assert.equal(w.store.value.puzzleRating.elo,1176);assert.equal(w.store.value.puzzleRating.played,1);
});

test('failed rating writes recover once, even after repeated mistakes and closing learning',async t=>{
  const {w,state,make}=await setup(t);await w.startPuzzleSelection([mate]);state.fail=true;
  await w.submitPuzzle(wrongMove(mate));await w.submitPuzzle(wrongMove(mate));await w.submitPuzzle(mate.solution[0]);
  assert.equal(w.failedChanges.length,3);assert.equal(w.store.value.puzzleRating.played,0);await w.close();
  const next=make();await next.open();state.fail=false;await Promise.all([next.retrySave(),next.retrySave()]);
  assert.equal(next.store.value.puzzleRating.elo,1176);assert.equal(next.store.value.puzzleRating.played,1);
  assert.equal(next.store.value.puzzles[mate.id].recovered,1);assert.equal(next.failedChanges.length,0);
});

test('adaptive practice resumes, pairs from current Elo after each result, and finishes when no new puzzles remain',async t=>{
  const puzzles=[{...mate,id:'a',rating:1100},{...mate,id:'b',rating:1250}];
  const {w,make,data}=await setup(t,{puzzles});await w.startRatedPuzzles();assert.equal(w.queue.length,1);assert.equal(w.activity.adaptive,true);
  const first=puzzles.find(p=>p.id===w.activity.id);await w.submitPuzzle(wrongMove(first));
  const resume=structuredClone(data['learning:v1'].resume);await w.close();const next=make();await next.open();await next.resume(resume);
  await next.submitPuzzle(first.solution[0]);const lost=next.store.value.puzzleRating.elo;
  await next.nextPuzzle();assert.notEqual(next.activity.id,first.id);assert.equal(next.activity.adaptive,true);
  const second=puzzles.find(p=>p.id===next.activity.id);assert.ok(Math.abs(second.rating-lost)<=200);
  await next.submitPuzzle(second.solution[0]);assert.ok(next.store.value.puzzleRating.elo>lost);
  await next.nextPuzzle();assert.equal(next.activity,null);assert.equal(next.ratedLibraryComplete,true);
  await next.startRatedPuzzles();assert.equal(next.activity,null);
});

test('Black puzzles keep their orientation and use a board-focused practice surface',async t=>{
  const puzzle=library.find(p=>p.fen.split(' ')[1]==='b'&&p.solution.length>=3);
  const {w}=await setup(t,{puzzles:[puzzle]});await w.startPuzzleSelection([puzzle]);await w.submitPuzzle(puzzle.solution[0]);
  assert.equal(w.flipped,true);assert.equal(w.root.querySelector('.learn-board').getAttribute('aria-label'),'Black to move. Chessboard. Use Left and Right arrow keys for move history.');
  assert.equal(w.root.querySelector('.puzzle-played-line, .puzzle-task-meta, .learn-move-input'),null);
  assert.deepEqual([...w.root.querySelectorAll('.puzzle-practice-actions button')].map(n=>n.textContent),['Hint','Skip']);
  assert.doesNotMatch(w.root.textContent,/Find the best continuation|matched to your Elo|Flip board/);
});

test('rapid duplicate starts and wrong submissions create one active puzzle and one rating loss',async t=>{
  const {w}=await setup(t);await Promise.all([w.startRatedPuzzles(),w.startRatedPuzzles()]);assert.equal(w.queue.length,1);
  const puzzle=w.puzzles.find(p=>p.id===w.activity.id);const wrong=wrongMove(puzzle);
  await Promise.all([w.submitPuzzle(wrong),w.submitPuzzle(wrong)]);
  assert.equal(w.activity.mistakes,1);assert.equal(w.store.value.puzzleRating.losses,1);
});

function eloFrames(dom) {
  const pending=new Map();let id=0;
  dom.window.requestAnimationFrame=fn=>{pending.set(++id,fn);return id;};
  dom.window.cancelAnimationFrame=key=>pending.delete(key);
  const start=dom.window.performance.now();
  return {pending,step(ms){const batch=[...pending.values()];pending.clear();batch.forEach(fn=>fn(start+ms));}};
}

test('live Elo counts up monotonically after a saved win and survives an intervening render',async t=>{
  const {w,dom}=await setup(t);await w.startPuzzleSelection([mate]);const frames=eloFrames(dom);
  const value=()=>Number(w.root.querySelector('[data-puzzle-elo]').textContent.replace(/[^\d-]/g,''));
  assert.equal(value(),1200);await w.submitPuzzle(mate.solution[0]);assert.equal(w.store.value.puzzleRating.elo,1224);
  const samples=[value()];frames.step(220);samples.push(value());
  assert.ok(value()>1200&&value()<1224);const intermediate=value();w.render();assert.equal(value(),intermediate);
  frames.step(550);samples.push(value());frames.step(1100);samples.push(value());
  assert.deepEqual(samples,[...samples].sort((a,b)=>a-b));assert.equal(value(),1224);
  assert.equal(w.root.querySelectorAll('[data-puzzle-elo]').length,1);assert.equal(frames.pending.size,0);
  assert.equal(w.root.querySelector('[data-puzzle-elo]').getAttribute('aria-label'),(1224).toLocaleString()+' rating');
});

test('failed saves do not animate phantom Elo; saving recovery triggers one real reward',async t=>{
  const {w,dom,state}=await setup(t);await w.startPuzzleSelection([mate]);const frames=eloFrames(dom);state.fail=true;
  await w.submitPuzzle(mate.solution[0]);assert.equal(w.store.value.puzzleRating.elo,1200);assert.equal(frames.pending.size,0);
  state.fail=false;await w.retrySave();w.render();assert.equal(w.store.value.puzzleRating.elo,1224);
  assert.equal(frames.pending.size,1);frames.step(1300);assert.equal(w.root.querySelector('[data-puzzle-elo]').textContent,(1224).toLocaleString());
  await w.retrySave();w.render();assert.equal(frames.pending.size,0);
});

test('reduced motion settles Elo immediately and closing cancels an active counter',async t=>{
  const {w,dom}=await setup(t);await w.startPuzzleSelection([mate]);const frames=eloFrames(dom);
  dom.window.matchMedia=()=>({matches:true});await w.submitPuzzle(mate.solution[0]);
  assert.equal(w.root.querySelector('[data-puzzle-elo]').textContent,(1224).toLocaleString());assert.equal(frames.pending.size,0);
  dom.window.matchMedia=()=>({matches:false});w.store.value.puzzleRating.elo=1250;w.render();assert.equal(frames.pending.size,1);
  await w.close();assert.equal(frames.pending.size,0);
});

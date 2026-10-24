import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {LESSONS, OPENINGS, CATEGORIES, THEME_NAMES, linePositions} from '../lib/learning/content.js';
import {validateExercise} from '../lib/learning/validation.js';
import {app, loadGame, branch} from './helpers/app.mjs';

const library=JSON.parse(fs.readFileSync(new URL('../data/learning/puzzles.json',import.meta.url)));
const savedFetch=globalThis.fetch;
globalThis.fetch=async()=>({ok:true,async json(){return structuredClone(library);}});
test.after(()=>{globalThis.fetch=savedFetch;});
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
async function workspace(t,options={}) {
  const dom=new JSDOM('<div id="root"><div class="app"><button id="entry">Learn</button></div></div>',{url:'https://extension.test'});
  const data={},storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,makePiece:(type,color)=>{const img=dom.window.document.createElement('img');img.className='piece-img';img.dataset.piece=color+type;return img;},...options});
  t.after(async()=>{await w.close();dom.window.close();});await w.open();return {w,dom,data};
}
test('puzzle entry, loading errors, filtered empty states and focus restoration all work',async t=>{
  const {w,dom}=await workspace(t);const doc=dom.window.document;
  assert.ok(doc.querySelector('.learning-workspace'));assert.equal(doc.querySelector('.app').inert,true);
  assert.equal(w.root.querySelector('.learn-brand'),null);
  assert.equal(w.root.querySelector('.learn-header').textContent,'← Back to review');
  assert.equal(w.page,'puzzles');assert.deepEqual([...w.root.querySelectorAll('.learn-nav button')].map(n=>n.textContent),['Puzzles','Openings','Concepts']);
  await w.navigate('concepts');w.filters.search='no such topic';w.render();assert.ok(w.root.querySelector('.learn-empty'));
  w.root.querySelector('.learn-empty button').click();assert.ok(w.root.textContent.includes('Develop your pieces'));
  await w.navigate('openings');w.filters.search='no such opening';w.render();assert.ok(w.root.querySelector('.learn-empty'));
  const old=globalThis.fetch;globalThis.fetch=async()=>{throw Error('Offline library missing');};await w.load();assert.match(w.root.textContent,/Offline library missing/);
  globalThis.fetch=old;await w.load();assert.equal(w.ready,true);await w.close();assert.equal(doc.querySelector('.app').inert,false);
});

test('puzzle statistics show saved patterns, preserve settings and resume, and return focus without leaving learning',async t=>{
  const {w,dom,data}=await workspace(t),doc=dom.window.document;
  const button=()=>w.root.querySelector('[data-focus="puzzle-statistics"]');
  button().focus();button().click();
  assert.equal(w.page,'statistics');
  assert.equal(w.root.querySelectorAll('.learn-stat-row').length,Object.keys(THEME_NAMES).length);
  assert.ok([...w.root.querySelectorAll('.learn-stat-row')].every(row=>row.textContent.includes('0 correct · 0 incorrect')&&row.textContent.endsWith('0%')));
  assert.equal(w.root.querySelector('.learn-stat-untried'),null);
  assert.equal(w.root.querySelectorAll('.learn-stat-track').length,Object.keys(THEME_NAMES).length);
  assert.ok([...w.root.querySelectorAll('.learn-stat-track > span')].every(n=>n.style.width==='0%'));
  assert.equal(button().textContent,'Back to puzzle overview');
  assert.equal(w.root.querySelector('[data-focus="review"]').textContent,'← Back to review');
  assert.equal(doc.activeElement.id,'learn-statistics-title');
  assert.equal(w.root.querySelector('.learn-nav [aria-current]').textContent,'Puzzles');
  button().click();assert.equal(w.page,'puzzles');assert.equal(doc.activeElement,button());
  const fork=w.puzzles.find(p=>p.themes.includes('fork')&&p.themes.filter(t=>t in THEME_NAMES).length===1),mate=w.puzzles.find(p=>p.themes.includes('mateIn1')&&!p.themes.includes('fork'));
  await w.persist(progress=>{
    progress.puzzles[fork.id]={attempts:8,clean:2,assisted:2,recovered:3,mistakes:9};
    progress.puzzles[mate.id]={attempts:10,clean:9,assisted:0,mistakes:1};
    progress.puzzleResume={kind:'puzzle',id:fork.id,step:0};
    progress.puzzleTimeMs=3723000;
  });
  const saved=structuredClone(data['learning:v1']);
  w.puzzleThemes.add('sacrifice');w.puzzleRange=[2000,2200];
  button().click();
  assert.equal(w.root.querySelector('.learn-stat-highlights, .learn-stat-note, .learn-stat-intro'),null);
  assert.doesNotMatch(w.root.querySelector('.learn-puzzle-statistics').textContent,/clean|need work|Early results|Highlights appear/i);
  assert.match(w.root.querySelector('[data-theme="fork"]').textContent,/2 correct · 6 incorrect/);
  assert.deepEqual([...w.root.querySelectorAll('.learn-stat-overview > div')].map(n=>n.textContent),['Correct11','Incorrect7','Attempts18','Time spent1h 2m 3s']);
  const forkTrack=w.root.querySelector('[data-theme="fork"] .learn-stat-track');
  assert.equal(forkTrack.getAttribute('aria-label'),'2 correct, 6 incorrect');
  assert.equal(forkTrack.querySelector('.learn-stat-correct').style.width,'25%');
  assert.equal(forkTrack.querySelector('.learn-stat-incorrect').style.width,'75%');
  assert.equal(w.root.querySelector('.learn-stat-untried'),null);
  assert.equal(w.root.querySelectorAll('.learn-stat-row').length,Object.keys(THEME_NAMES).length);
  doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.closed,false);assert.equal(w.page,'puzzles');assert.equal(doc.activeElement,button());
  assert.deepEqual([...w.puzzleThemes],['sacrifice']);assert.deepEqual(w.puzzleRange,[2000,2200]);
  assert.deepEqual(data['learning:v1'],saved);
  button().click();button().click();await settle();
  assert.equal(w.page,'puzzles');assert.equal(w.closed,false);assert.equal(doc.activeElement,button());
  button().click();await w.navigate('concepts');assert.ok(w.root.querySelector('.learn-library'));
});

test('the statistics footer returns directly to review',async t=>{
  const {w}=await workspace(t);w.showPuzzleStatistics(true);
  w.root.querySelector('[data-focus="review"]').click();await settle();
  assert.equal(w.closed,true);
});

test('Escape closes Settings before leaving puzzle statistics on the embedded learning board',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  await a.call('openLearning');const w=a.run('learningWorkspace'),doc=a.dom.window.document;
  w.showPuzzleStatistics(true);await a.call('toggleSettings');
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(doc.querySelector('#settings').hidden,true);assert.equal(w.page,'statistics');
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(w.page,'puzzles');assert.equal(w.closed,false);assert.equal(doc.activeElement.dataset.focus,'puzzle-statistics');
  await w.close();
});
test('square exercise uses selection, alternative answers, lesson completion and durable difficult-exercise tracking',async t=>{
  const {w,data}=await workspace(t);await w.startLesson('outpost');await w.lessonTab('practise');
  w.root.querySelector('[data-square="e5"]').click();assert.deepEqual([...w.marked],['e5']);
  await w.submitExercise(['e5']);assert.equal(w.feedback.status,'correct');assert.equal(w.store.value.lessons.outpost.exercises[0].passed,true);
  w.activity.exercise=1;w.clearAnswer();w.render();await w.submitExercise(1);assert.equal(w.store.value.lessons.outpost.exercises[1].struggled,true);
  await w.submitExercise(0);assert.equal(w.store.value.lessons.outpost.status,'completed');assert.equal(w.store.value.lessons.outpost.exercises[1].struggled,false);
  assert.equal(data['learning:v1'].resume,null);
});
test('inconclusive exercise feedback records neither a mistake nor completion',async t=>{
  const {w}=await workspace(t);await w.startLesson('fork');await w.lessonTab('practise');
  w.checkExercise=async(ex,answer)=>validateExercise(ex,answer,{maxNodes:1});
  await w.submitExercise('e4f6');assert.equal(w.feedback.status,'inconclusive');assert.deepEqual(w.store.value.lessons.fork.exercises,{});
});
test('the difficult-exercise library resumes the actual exercise that needs another attempt',async t=>{
  const {w}=await workspace(t);await w.startLesson('outpost');await w.lessonTab('practise');w.activity.exercise=1;await w.submitExercise(1);
  await w.navigate('concepts');w.filters.status='Struggled';await w.startLesson('outpost');
  assert.equal(w.activity.tab,'practise');assert.equal(w.activity.exercise,1);
});
test('openings pair moves in a scorecard with two side controls, keyboard navigation and saved positions',async t=>{
  const {w,dom,data}=await workspace(t);await w.startOpening('italian',{practice:true,color:'b'});
  const key=name=>dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
  assert.equal(w.activity.practice,undefined);assert.equal(w.activity.ply,0);assert.equal(w.flipped,true);
  const back=w.root.querySelector('[data-focus=opening-library]');
  assert.ok(back.classList.contains('learn-statistics-button'));assert.ok(back.closest('.puzzle-session-navigation'));
  assert.equal(back.textContent,'Opening library');
  assert.equal(w.root.querySelector('.learn-copy, .learn-opening-notes, .learn-move-input, [data-focus="practice-color"]'),null);
  assert.equal(w.root.querySelectorAll('.learn-opening-controls button').length,2);
  assert.ok(w.root.querySelector('.learn-opening-toolbar .learn-opening-controls'));
  assert.equal(w.root.querySelector('.learn-board-column .learn-opening-controls'),null);
  assert.deepEqual([...w.root.querySelectorAll('.learn-opening-moves thead th')].map(n=>n.textContent),['#','White','Black']);
  assert.deepEqual([...w.root.querySelectorAll('.learn-opening-moves tbody tr:first-child button')].map(n=>n.textContent),['e4','e5']);
  w.root.querySelector('[data-square="e2"]').click();w.root.querySelector('[data-square="e4"]').click();
  assert.equal(w.activity.ply,0);assert.equal(w.selected,null);
  assert.equal(w.root.querySelector('.learn-opening-controls [aria-label="Previous move"]').disabled,true);
  key('ArrowRight');assert.equal(w.activity.ply,1);assert.equal(w.lastMove,'e2e4');
  const square=w.root.querySelector('[data-square="a8"]');square.focus();key('ArrowRight');assert.equal(w.activity.ply,2);
  key('ArrowLeft');assert.equal(w.activity.ply,1);
  key('End');assert.equal(w.activity.ply,w.openingState.moves.length);assert.equal(w.root.querySelector('[aria-label="Next move"]').disabled,true);
  key('Home');assert.equal(w.activity.ply,0);assert.equal(w.lastMove,null);
  w.root.querySelector('[data-focus="opening-move-3"]').click();assert.equal(w.activity.ply,4);
  assert.equal(w.root.querySelector('[aria-current="step"]').textContent,'Nc6');
  await w.store.queue;assert.equal(data['learning:v1'].resume.ply,4);
  const resume=structuredClone(data['learning:v1'].resume);await w.navigate('openings');await w.resume(resume);
  assert.equal(w.activity.ply,4);assert.equal(w.currentFen(),linePositions(OPENINGS.find(o=>o.id==='italian').lines[0]).positions[4]);
  await w.navigate('openings');const search=w.root.querySelector('input');search.focus();key('ArrowRight');assert.equal(w.activity,null);
});

test('opening highlights follow backward moves in either orientation and reset on starting positions and variation changes',async t=>{
  const {w,dom}=await workspace(t);
  const highlighted=()=>[...w.root.querySelectorAll('.last-move')].map(n=>n.dataset.square).sort();
  for(const color of ['w','b']) {
    await w.startOpening('italian',{color});
    const line=w.openingState;
    for(let ply=1;ply<=line.moves.length;ply++) {
      w.stepOpening(ply);
      assert.deepEqual(highlighted(),[line.moves[ply-1].slice(0,2),line.moves[ply-1].slice(2,4)].sort());
    }
    for(let ply=line.moves.length-1;ply>=0;ply--) {
      w.root.querySelector('[aria-label="Previous move"]').click();
      assert.equal(w.currentFen(),line.positions[ply]);
      assert.deepEqual(highlighted(),ply?[line.moves[ply].slice(0,2),line.moves[ply].slice(2,4)].sort():[]);
      assert.equal(w.root.querySelectorAll('[aria-current="step"]').length,ply?1:0);
    }
    w.stepOpening(3);w.root.querySelector('[data-square="a8"]').focus();
    dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
    assert.equal(dom.window.document.activeElement.closest('.learn-opening-controls'),null);
    assert.deepEqual(highlighted(),['f3','g1']);
    w.stepOpening(0);assert.deepEqual(highlighted(),[]);
    w.stepOpening(4);
    w.root.querySelector('[data-focus="opening-variation"]').click();w.dropdown.field.querySelectorAll('[role="option"]')[1].click();
    assert.equal(w.activity.line,1);assert.equal(w.activity.ply,0);assert.deepEqual(highlighted(),[]);
    assert.equal(w.root.querySelector('.learn-opening-progress').textContent,'Starting position');
  }
});

test('Concept Learn opens a focused in-progress dialog without starting a lesson',async t=>{
  const {w,dom,data}=await workspace(t);await w.navigate('concepts');
  const learn=w.root.querySelector('.learn-library-row > button');learn.focus();learn.click();
  const notice=w.root.querySelector('.learn-notice-card');assert.equal(notice.getAttribute('aria-modal'),'true');
  assert.deepEqual([...notice.querySelectorAll('button')].map(n=>n.textContent),['Fair enough','Unacceptable']);
  assert.match(notice.textContent,/one-person project/);assert.match(notice.textContent,/still working on these lessons/);
  assert.equal(w.activity,null);assert.equal(data['learning:v1']?.lessons?.fork,undefined);
  assert.equal(notice.contains(dom.window.document.activeElement),true);
  const key=name=>dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
  key('Tab');assert.equal(dom.window.document.activeElement.textContent,'Unacceptable');
  key('Tab');assert.equal(dom.window.document.activeElement.textContent,'Fair enough');
  const overlay=w.conceptNotice;
  overlay.click();notice.click();key('Escape');
  assert.equal(w.conceptNotice,overlay);assert.equal(w.closed,false);assert.equal(dom.window.document.activeElement.textContent,'Fair enough');
  key('Enter');assert.equal(w.conceptNotice,null);assert.equal(dom.window.document.activeElement,learn);
  learn.click();w.conceptNotice.querySelector('button').click();assert.equal(w.conceptNotice,null);assert.equal(dom.window.document.activeElement,learn);
});

test('catching Unacceptable reveals the bullet joke, stops dodging and keeps dismissal easy',async t=>{
  const {w,dom}=await workspace(t);await w.navigate('concepts');
  w.root.querySelector('.learn-library-row > button').click();const runner=w.root.querySelector('.learn-notice-reject');
  runner.focus();runner.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(w.root.querySelector('#learn-notice-copy').textContent,"Whoa, nice mouse speed! Why don't you use that in some of your bullet games?");
  assert.equal(runner.disabled,true);assert.equal(w.disposeConceptDodge,null);
  assert.equal(dom.window.document.activeElement.textContent,'Fair enough');
  w.root.querySelector('.learn-notice-accept').click();assert.equal(w.conceptNotice,null);
});

test('puzzles hide solution information, persist intermediate steps and distinguish assisted and repeat solves',async t=>{
  const {w,data}=await workspace(t);const p=w.puzzles.find(p=>p.solution.length>=3);
  await w.startPuzzleSelection([p]);assert.ok(!w.root.textContent.includes('Why the solution works'));assert.equal(w.root.querySelectorAll('.annotated').length,0);
  assert.equal(w.root.querySelector('[data-focus="puzzle-hint"]').hasAttribute('title'),false);
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,p.fen.split(' ')[1]==='w'?'White to move':'Black to move');
  assert.equal(w.root.querySelector('.puzzle-practice-status').classList.contains('puzzle-quiet-status'),false);
  await w.submitPuzzle(p.solution[0]);assert.equal(w.activity.step,2);assert.equal(data['learning:v1'].resume.step,2);
  const resume=structuredClone(data['learning:v1'].resume);await w.navigate('home');await w.resume(resume);assert.equal(w.activity.step,0);assert.equal(w.currentFen(),p.fen);
  while(!w.attemptRecorded)await w.submitPuzzle(p.solution[w.activity.step]);assert.equal(w.store.value.puzzles[p.id].clean,1);
  assert.equal(w.root.querySelector('.puzzle-explanation, .puzzle-completion'),null);assert.equal(w.root.textContent.includes('View solution'),false);
  await w.preparePuzzle(p);await w.hintPuzzle();assert.equal(w.activity.assisted,true);assert.equal(w.root.querySelectorAll('.puzzle-hint-square').length,1);
  w.root.querySelector(`[data-square="${p.solution[0].slice(0,2)}"]`).click();
  assert.equal(w.root.querySelectorAll('.puzzle-hint-square').length,1);assert.equal(w.root.querySelectorAll('.annotated').length,0);
  await w.revealPuzzle();assert.equal(w.store.value.puzzles[p.id].assisted,1);assert.equal(w.store.value.puzzles[p.id].clean,1);
  assert.equal(w.root.querySelector('.puzzle-explanation, .puzzle-completion'),null);assert.equal(w.root.textContent.includes('View solution'),false);
  await w.preparePuzzle(p);while(!w.attemptRecorded)await w.submitPuzzle(p.solution[w.activity.step]);assert.equal(w.store.value.puzzles[p.id].clean,2);
});

test('the upper puzzle overview link preserves the attempt and the footer returns to review',async t=>{
  const {w}=await workspace(t),p=w.puzzles.find(p=>p.solution.length>=3);
  const back=()=>w.root.querySelector('[data-focus="puzzle-overview"]');
  assert.equal(back(),null);
  await w.startPuzzleSelection([p],null,{adaptive:true});await w.submitPuzzle(p.solution[0]);
  const step=w.activity.step,elo=w.store.value.puzzleRating.elo;
  assert.equal(back().textContent,'Back to puzzle overview');assert.ok(w.root.querySelector('.puzzle-session-navigation').contains(back()));
  assert.equal(w.root.querySelector('.learn-header [data-focus="review"]').textContent,'← Back to review');
  back().click();await settle();assert.equal(w.closed,false);assert.equal(w.activity,null);assert.equal(w.page,'puzzles');assert.equal(back(),null);
  assert.equal(w.store.value.puzzleResume.step,step);assert.equal(w.store.value.puzzleRating.elo,elo);
  await w.startRatedPuzzles();assert.equal(w.activity.id,p.id);assert.equal(w.activity.step,0);assert.equal(w.currentFen(),p.fen);assert.equal(w.lastMove,p.setup.move);assert.equal(back().textContent,'Back to puzzle overview');
  back().click();await settle();w.root.querySelector('[data-focus="review"]').click();await settle();assert.equal(w.closed,true);assert.equal(w.root.isConnected,false);
});

test('returning from a timed puzzle ends and saves its run before showing the puzzle library',async t=>{
  const {w}=await workspace(t);await w.startChallenge(60);
  const run=w.run;w.root.querySelector('[data-focus="puzzle-overview"]').click();await settle();
  assert.equal(w.closed,false);assert.equal(w.run,null);assert.equal(run.clock.runningAt,null);assert.equal(w.activity,null);assert.equal(w.result,null);assert.equal(w.page,'puzzles');
  assert.equal(w.store.value.challenges.length,1);assert.equal(w.root.querySelector('.learn-header [data-focus="review"]').textContent,'← Back to review');
});
test('timed challenges start ready, count mistakes/skips/assistance and save personal best and review list',async t=>{
  const {w}=await workspace(t);const first=w.puzzles.find(p=>p.theme==='mateIn1'),second=w.puzzles.find(p=>p.theme==='fork');
  w.shuffle=()=>[first,second];await w.startChallenge(60);assert.ok(w.run.clock.started);assert.equal(w.root.querySelector('#learn-clock').textContent,'1:00');
  await w.revealPuzzle();assert.equal(w.run.solved,0);assert.equal(w.run.assisted,1);await w.nextPuzzle();
  const wrong=new (await import('../lib/chess.js')).Chess(second.fen).moves({verbose:true}).find(m=>m.lan!==second.solution[0]);
  await w.submitPuzzle(wrong.lan);assert.equal(w.run.mistakes,1);await w.skipPuzzle();assert.equal(w.run,null);
  assert.equal(w.result.assisted,1);assert.equal(w.result.mistakes,1);assert.equal(w.result.skips,1);assert.ok(w.result.missed.includes(second.id));assert.ok(w.store.value.challenges.length);
});
test('all timed modes end at expiry before accepting another answer; partially hinted puzzles enter review',async t=>{
  const {w}=await workspace(t);for(const duration of [60,300,600]){
    await w.startChallenge(duration);await w.hintPuzzle();w.run.clock.remainingMs=0;w.run.clock.runningAt=null;
    await w.submitPuzzle(w.puzzles.find(p=>p.id===w.activity.id).solution[0]);
    assert.equal(w.run,null);assert.equal(w.result.solved,0);assert.equal(w.result.missed.length,1);assert.equal(w.store.value.bests[duration],0);
  }
});
test('review game, move, board orientation and keyboard state survive learning on its own fresh board',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.call('go',2);a.state.flipped=true;a.call('buildBoard');const before={idx:a.state.idx,flipped:a.state.flipped,pgn:a.state.pgn,positions:a.state.positions};
  await a.call('openLearning');const w=a.run('learningWorkspace');assert.ok(w.ready);
  const meta=a.dom.window.document.querySelector('.topbar-meta');
  assert.equal(meta.getAttribute('aria-hidden'),'true');assert.equal(meta.dataset.motion,'off');
  assert.equal(w.currentFen(),new Chess().fen());assert.equal(w.activity,null);
  a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(a.state.idx,before.idx);await w.startOpening('italian');w.stepOpening(1);await w.close();
  assert.equal(a.state.idx,before.idx);assert.equal(a.state.flipped,before.flipped);assert.equal(a.state.pgn,before.pgn);assert.equal(a.state.positions,before.positions);
  assert.equal(meta.hasAttribute('aria-hidden'),false);assert.equal(meta.classList.contains('meta-return'),true);
  a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(a.state.idx,before.idx+1);
});

test('concept promotions use piece images for board moves and unspecified typed promotions',async t=>{
  const {w,dom}=await workspace(t);await w.startLesson('promotion');await w.lessonTab('practise');
  w.root.querySelector('[data-square=e7]').click();w.root.querySelector('[data-square=e8]').click();
  assert.deepEqual([...w.root.querySelectorAll('.promotion-options img')].map(n=>n.dataset.piece),['wq','wr','wb','wn']);
  w.root.querySelector('[aria-label="Promote to bishop"]').click();await settle();assert.equal(w.feedback.status,'correct');
  await w.lessonTab('practise');const input=w.root.querySelector('[aria-label="Enter a chess move"]');input.value='e7e8';
  input.closest('form').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
  assert.equal(w.root.querySelector('[aria-label="Promotion piece"]'),null);assert.equal(w.root.querySelectorAll('.promotion-options img').length,4);
  w.root.querySelector('[aria-label="Promote to knight"]').click();await settle();assert.equal(w.feedback.status,'correct');
});
test('entering learning leaves a playing analysis variation and glides from it into a fresh untinted board',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  a.replace('requestLiveEval',async()=>{});const v=branch(a,0,1),source=v.positions[v.idx].fen,routes=[];
  t.mock.method(LearningWorkspace.prototype,'arrangePuzzlePieces',async function(from,to){routes.push({from,to});});
  a.call('paintBoard');a.call('startLineWalk');assert.equal(a.state.lineWalking,true);
  await a.call('openLearning');assert.equal(a.state.lineWalking,false);const w=a.run('learningWorkspace');
  assert.equal(a.state.analysisMode,false);assert.equal(a.state.variation,null);assert.equal(w.currentFen(),new Chess().fen());
  assert.equal(a.dom.window.document.querySelector('.board').classList.contains('analysis'),false);
  assert.deepEqual(routes,[{from:{fen:source,flipped:false},to:{fen:new Chess().fen(),flipped:false}}]);
  await w.startLesson('chain');w.flipped=!w.flipped;await w.close();
  assert.equal(a.state.analysisMode,false);assert.equal(a.state.variation,null);assert.equal(a.state.lineWalking,false);
  assert.equal(a.call('activePos').fen,a.state.positions[a.state.idx].fen);
  assert.equal(a.dom.window.document.querySelector('.board').classList.contains('analysis'),false);
});

test('in-place learning preserves the actual board and topbar across all destinations and restores review input',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5 2. Nf3 Nc6');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const doc=a.dom.window.document,board=doc.querySelector('.board'),topbar=doc.querySelector('.topbar'),squares=[...board.children];
  const wrap=doc.querySelector('#boardWrap'),parent=wrap.parentNode;
  await a.call('openLearning');const w=a.run('learningWorkspace');
  assert.ok(w.embedded);assert.ok(doc.querySelector('.learning-embedded'));assert.notEqual(doc.querySelector('.app').inert,true);
  assert.equal(doc.querySelector('.topbar'),topbar);assert.equal(doc.querySelector('.board'),board);
  assert.equal(board.querySelectorAll('[data-square]').length,64);assert.equal(board.inert,false);assert.equal(w.currentFen(),new Chess().fen());
  a.call('toggleFlip');assert.ok(board.querySelector('.learn-square'));assert.equal(w.flipped,!a.state.flipped);
  a.call('toggleFlip');assert.equal(w.flipped,a.state.flipped);assert.equal(w.currentFen(),new Chess().fen());
  assert.ok([...doc.querySelectorAll('.mod')].every(node=>node.inert));
  await w.startLesson('outpost');await w.lessonTab('practise');
  assert.equal(doc.querySelector('.board'),board);assert.equal(doc.querySelectorAll('.learn-board').length,1);
  board.querySelector('[data-square=e5]').click();assert.ok(w.marked.has('e5'));
  await w.submitExercise(['e5']);assert.equal(w.feedback.status,'correct');
  await w.startOpening('italian',{practice:true});
  doc.querySelector('[aria-label="Next move"]').click();doc.querySelector('[aria-label="Next move"]').click();
  assert.equal(w.activity.ply,2);assert.equal(a.state.idx,0);
  const drag=new a.dom.window.Event('dragstart',{bubbles:true,cancelable:true});board.dispatchEvent(drag);assert.equal(drag.defaultPrevented,false);
  const orientation=a.state.flipped;a.call('toggleFlip');assert.equal(a.state.flipped,orientation);assert.equal(w.flipped,true);
  await w.startPuzzleSelection([w.puzzles.find(p=>p.theme==='mateIn1')]);
  assert.equal(doc.querySelector('.board'),board);assert.equal(board.querySelectorAll('.annotated').length,0);
  // An asynchronous review repaint must not overwrite the learning board.
  a.call('buildBoard');a.call('paintBoard');assert.equal(doc.querySelector('.board'),board);assert.ok(board.querySelector('.learn-square'));
  a.state.bests[0]={bestmove:'e2e4'};a.state.userArrows=[{from:'e2',to:'e4'}];a.call('refreshArrows');
  assert.equal(board.querySelector('svg'),null,'Review arrows must never appear over a learning position');
  w.shell.scrollTop=300;await w.navigate('concepts');assert.equal(w.shell.scrollTop,0);assert.equal(w.currentFen(),new Chess().fen());assert.equal(board.querySelectorAll('[data-square]').length,64);
  await w.close();assert.equal(wrap.parentNode,parent);assert.equal(doc.querySelector('.board'),board);
  assert.deepEqual([...board.querySelectorAll('.sq')],squares.filter(node=>node.classList.contains('sq')));assert.equal(board.inert,false);
  assert.ok(board.querySelector('svg.user-arrows'));
  assert.ok([...doc.querySelectorAll('.mod')].every(node=>!node.inert));assert.equal(doc.querySelector('.learn-board-placeholder'),null);
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert.equal(a.state.idx,1);
});

test('old presentation preferences all select Morph 3 and Settings stays open with learning',async t=>{
  for(const settings of [{},{learningTransition:'page'},{learningTransition:'newway'},{learningPresentation:'studio'},{learningLayout:'morph'}])assert.equal(LearningWorkspace.presentationFor(settings),'morph3');
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  await a.call('toggleSettings');assert.equal(a.dom.window.document.querySelector('.learn-style-option'),null);
  await a.call('openLearning');const w=a.run('learningWorkspace'),doc=a.dom.window.document;
  assert.equal(w.presentation,'morph3');assert.equal(w.page,'puzzles');assert.ok(w.embedded);
  await a.call('toggleSettings');assert.equal(a.run('learningWorkspace'),w);assert.equal(doc.querySelector('#settings').hidden,false);
  doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(doc.querySelector('#settings').hidden,true);assert.equal(a.run('learningWorkspace'),w);
  await w.close();await a.call('resetVisualSettings');assert.equal(a.store.settings.learningTransition,'morph3');
});

test('puzzle types and two handles on one Elo track filter the full adaptive session',async t=>{
  const {w,dom}=await workspace(t);
  const doc=dom.window.document;
  const count=doc.querySelector('[data-puzzle-matches]');
  assert.equal(count.textContent,'50.000 puzzles available');assert.ok(count.closest('legend'));
  assert.equal(doc.querySelectorAll('[data-puzzle-matches]').length,1);
  assert.equal(w.root.querySelectorAll('.puzzle-mode-grid .primary').length,3);
  assert.equal(w.root.querySelector('[aria-label="Phase"]'),null);assert.equal(w.root.querySelector('[aria-label="Progress"]'),null);
  assert.doesNotMatch(w.root.textContent,/How rating works|Provisional|Unsolved|Race the clock/);
  doc.querySelector('[data-focus="theme-fork"]').click();assert.deepEqual([...w.puzzleThemes],['fork']);
  assert.ok(w.filteredPuzzles().every(p=>p.themes.includes('fork')));
  const slider=doc.querySelector('[aria-label="Minimum"]');slider.value=slider.max;slider.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  const max=Number(slider.max);assert.deepEqual(w.puzzleRange,[max-50,max]);assert.equal(doc.querySelector('[aria-label="Maximum"]').value,String(max));
  assert.equal(doc.querySelectorAll('.learn-dual-range').length,1);assert.equal(doc.querySelectorAll('.learn-dual-range input').length,2);
  assert.equal(doc.querySelector('[data-focus="solve-puzzle"]').disabled,!w.filteredPuzzles().length);
  const puzzle=w.puzzles.find(p=>p.themes.includes('fork'));w.puzzleRange=[puzzle.rating,puzzle.rating];w.render();
  await w.startRatedPuzzles();assert.equal(w.puzzles.find(p=>p.id===w.activity.id).rating,puzzle.rating);
  await w.revealPuzzle();await w.nextPuzzle();
  if(w.activity){const next=w.puzzles.find(p=>p.id===w.activity.id);assert.ok(next.themes.includes('fork'));assert.equal(next.rating,puzzle.rating);}
  await w.navigate('puzzles');w.root.querySelector('[data-focus="theme-all"]').click();assert.equal(w.puzzleThemes.size,0);
});

test('rating drags move smoothly, coalesce filtering and retain the captured thumb',async t=>{
  const {w,dom}=await workspace(t),view=dom.window;
  const track=w.root.querySelector('.learn-dual-range'),handles=[...track.querySelectorAll('input')];
  const [min,max]=handles.map(n=>Number(n.value)),x=rating=>110+(rating-min)/(max-min)*400;
  track.getBoundingClientRect=()=>({left:100,width:420});
  const frames=new Map();let frameId=0,updates=0,captured=null;
  view.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
  view.cancelAnimationFrame=id=>frames.delete(id);
  const frame=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
  const select=w.updatePuzzleSelection.bind(w);w.updatePuzzleSelection=()=>{updates++;select();};
  track.setPointerCapture=id=>{captured=id;};track.hasPointerCapture=id=>captured===id;
  track.releasePointerCapture=()=>{captured=null;};
  // MouseEvent does not expose pointerId in jsdom; give these events a real pointer identity.
  const send=(node,type,clientX,id=7)=>{const event=new view.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX});Object.defineProperty(event,'pointerId',{value:id});node.dispatchEvent(event);return event;};
  assert.equal(send(handles[0],'pointerdown',x(min)+6).defaultPrevented,true);
  assert.equal(captured,7);assert.equal(view.document.activeElement,handles[0]);
  assert.equal(track.classList.contains('is-dragging'),true);assert.equal(handles[0].step,'any');
  assert.equal(Number(handles[0].value),min,'grabbing the edge must not jump the thumb');
  send(view,'pointermove',x(min+100)+6);send(view,'pointermove',x(min+200)+6);
  assert.equal(frames.size,1);assert.equal(updates,0);frame();
  assert.deepEqual(w.puzzleRange,[min+200,max]);assert.equal(updates,1);
  send(view,'pointermove',x(min+210)+6);frame();
  assert.ok(Math.abs(Number(handles[0].value)-(min+210))<.001,'thumb moves between the 50-point selections');
  assert.equal(updates,1,'the same rounded rating must not rescan the library');
  assert.equal(handles[0].getAttribute('aria-valuetext'),min+200+' rating');
  send(view,'pointerup',x(max+100)+6,8);assert.equal(captured,7,'other pointers cannot end the drag');
  send(view,'pointermove',x(max+100)+6);send(view,'pointerup',x(max+100)+6);
  assert.equal(frames.size,0);assert.deepEqual(w.puzzleRange,[max-50,max]);
  assert.equal(Number(handles[0].value),max-50);assert.equal(handles[0].step,'50');
  assert.equal(captured,null);assert.equal(w.cancelRangeInput,null);assert.equal(track.classList.contains('is-dragging'),false);
  assert.equal(w.root.querySelector('[data-focus="solve-puzzle"]').disabled,!w.filteredPuzzles().length);
  const finished=[...w.puzzleRange];send(view,'pointermove',x(min));frame();assert.deepEqual(w.puzzleRange,finished);
});

test('rating track drags clean up on cancellation, capture loss, blur, render and close',async t=>{
  const {w,dom}=await workspace(t),view=dom.window;
  const frames=new Map();let frameId=0;
  view.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};view.cancelAnimationFrame=id=>frames.delete(id);
  const send=(node,type,x)=>{const e=new view.MouseEvent(type,{bubbles:true,cancelable:true,button:0,clientX:x});Object.defineProperty(e,'pointerId',{value:1});node.dispatchEvent(e);};
  for(const end of ['pointercancel','lostpointercapture','blur','render','close']){
    w.puzzleRange=null;w.render();
    const track=w.root.querySelector('.learn-dual-range'),inputs=[...track.querySelectorAll('input')];
    track.getBoundingClientRect=()=>({left:0,width:420});
    send(track,'pointerdown',310);assert.equal(view.document.activeElement,inputs[1],'the rail chooses the nearest handle');
    send(view,'pointermove',260);assert.equal(frames.size,1);
    if(end==='render')w.render();else if(end==='close')await w.close();
    else if(end==='blur')view.dispatchEvent(new view.Event('blur'));
    else send(end==='lostpointercapture'?track:view,end,260);
    assert.equal(frames.size,0,end);assert.equal(w.cancelRangeInput,null,end);
    assert.equal(track.classList.contains('is-dragging'),false,end);assert.ok(inputs.every(input=>input.step==='50'),end);
    const finished=[...w.puzzleRange];send(view,'pointermove',100);assert.deepEqual(w.puzzleRange,finished,end);
  }
});

test('concept and opening libraries use readable rows without progress labels',async t=>{
  const {w}=await workspace(t);
  for(const page of ['concepts','openings']){
    await w.navigate(page);assert.ok(w.root.querySelectorAll('.learn-library-row').length>0);
    assert.equal(w.root.querySelector('.learn-card'),null);assert.doesNotMatch(w.root.textContent,/not started|in progress/);
  }
  assert.equal(w.root.querySelector('.learn-bookmark'),null);assert.doesNotMatch(w.root.textContent,/★|☆|Saved/);
});

test('expanded opening library supports search, family and level filters, both colors and saved variation positions',async t=>{
  const {w,data}=await workspace(t);await w.navigate('openings');
  const titles=()=>[...w.root.querySelectorAll('.learn-library-row h3')].map(n=>n.textContent);
  assert.deepEqual(titles(),OPENINGS.map(o=>o.title));
  const search=w.root.querySelector('input[type=search]');
  search.value='Scandinavian';search.dispatchEvent(new w.doc.defaultView.Event('input',{bubbles:true}));
  assert.deepEqual(titles(),['Scandinavian Defense']);
  w.filters.search='';w.filters.family='Indian defenses';w.filters.difficulty='Advanced';w.render();
  assert.deepEqual(titles(),['King’s Indian Defense','Nimzo–Indian Defense','Grünfeld Defense','Modern Benoni','Benko Gambit']);
  w.filters.family='All';w.filters.difficulty='All';w.filters.search='Bird';w.filters.color='Black';w.render();
  w.root.querySelector('.learn-library-row button').click();await settle();
  assert.equal(w.activity.id,'bird');assert.equal(w.activity.color,'b');assert.equal(w.flipped,true);
  w.root.querySelector('[data-focus="opening-variation"]').click();
  w.dropdown.field.querySelectorAll('[role="option"]')[1].click();
  w.stepOpening(w.openingState.moves.length);await settle();
  assert.equal(w.activity.line,1);assert.equal(w.root.querySelector('.learn-opening-progress').textContent,'12 of 12 moves');
  const resume=structuredClone(data['learning:v1'].resume);
  await w.navigate('openings');await w.resume(resume);
  assert.deepEqual(w.activity,resume);assert.equal(w.flipped,true);
  assert.equal(w.openingState.positions[w.activity.ply],linePositions(OPENINGS.find(o=>o.id==='bird').lines[1]).positions.at(-1));
  await w.startOpening('grunfeld',{color:'w',line:1});
  assert.equal(w.flipped,false);w.stepOpening(w.openingState.moves.length);
  assert.equal(w.root.querySelector('.learn-opening-progress').textContent,'14 of 14 moves');
});

test('themed library dropdowns filter content and dismiss without leaving learning',async t=>{
  const {w,dom}=await workspace(t),doc=dom.window.document;
  for(const [page,key,value] of [['concepts','category',CATEGORIES[0]],['openings','family',OPENINGS[0].family]]){
    await w.navigate(page);assert.equal(w.root.querySelector('select'),null);
    const trigger=w.root.querySelector(`[data-focus="${key}"]`);trigger.click();
    const menu=doc.getElementById(trigger.getAttribute('aria-controls'));
    [...menu.children].find(n=>n.textContent===value).click();
    assert.equal(w.filters[key],value);assert.equal(doc.activeElement.dataset.focus,key);
    assert.ok([...w.root.querySelectorAll('.learn-library-row')].every(n=>page==='concepts'
      ?LESSONS.some(l=>l.title===n.querySelector('h3').textContent&&l.category===value)
      :OPENINGS.some(o=>o.title===n.querySelector('h3').textContent&&o.family===value)));
    const current=w.root.querySelector(`[data-focus="${key}"]`);current.click();
    doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    assert.equal(w.closed,false);assert.equal(current.getAttribute('aria-expanded'),'false');assert.equal(doc.activeElement,current);
    current.click();w.root.querySelector('[data-focus="difficulty"]').click();
    assert.equal(current.getAttribute('aria-expanded'),'false');assert.equal(w.root.querySelectorAll('.learn-dropdown.open').length,1);
    doc.body.dispatchEvent(new dom.window.Event('pointerdown',{bubbles:true}));assert.equal(w.dropdown,null);
    current.click();w.root.querySelector('input[type=search]').focus();assert.equal(w.dropdown,null);
  }
});

test('opening variation dropdown keeps arrow browsing separate from move navigation',async t=>{
  const {w,dom}=await workspace(t),doc=dom.window.document;await w.startOpening('italian');w.stepOpening(3);
  const key=name=>doc.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
  const variation=w.root.querySelector('[data-focus="opening-variation"]');variation.focus();variation.click();key('ArrowDown');key('End');
  assert.equal(w.activity.ply,3);doc.activeElement.click();await settle();
  assert.equal(w.activity.line,OPENINGS.find(o=>o.id==='italian').lines.length-1);assert.equal(w.activity.ply,0);
  assert.equal(w.store.value.resume.line,w.activity.line);assert.equal(doc.activeElement.dataset.focus,'opening-variation');
  doc.activeElement.click();key('Escape');assert.equal(w.dropdown,null);assert.equal(w.closed,false);
});

test('learning keeps review panels mounted until loading finishes and can close before mounting',async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const doc=a.dom.window.document,board=doc.querySelector('.board'),wrap=doc.querySelector('#boardWrap'),parent=wrap.parentNode;
  const originalFetch=globalThis.fetch;let release;
  globalThis.fetch=()=>new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>structuredClone(library)});});
  t.after(()=>{globalThis.fetch=originalFetch;});
  const opening=a.call('openLearning');await settle();const w=a.run('learningWorkspace');
  assert.equal(doc.querySelector('.learning-active'),null);
  assert.equal(w.shell,undefined);assert.equal(wrap.parentNode,parent);
  assert.ok([...doc.querySelectorAll('.mod')].every(node=>!node.inert));
  release();await opening;
  assert.ok(doc.querySelector('.learning-active'));assert.equal(doc.querySelector('.board'),board);
  await w.close();assert.equal(wrap.parentNode,parent);

  const canceledOpening=a.call('openLearning');await settle();const canceled=a.run('learningWorkspace');
  await canceled.close();release();await canceledOpening;
  assert.equal(a.run('learningWorkspace'),null);
  assert.equal(doc.querySelector('.learning-workspace'),null);
  assert.equal(doc.querySelector('.learn-board-placeholder'),null);
  assert.equal(doc.querySelector('.board'),board);assert.equal(wrap.parentNode,parent);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app, loadGame, fakeEngine, deferred, settle} from './helpers/app.mjs';

async function setup(t,{puzzle,analyse}={}) {
  const a=app(t);
  // Keep review candidate searches separate from the puzzle engines counted below.
  a.replace('requestPanelLines',()=>{});
  loadGame(a,'1. e4 e5');a.call('computeDerived');a.call('buildUI');a.call('renderAll');
  const p=puzzle||{id:'analysis-test',fen:new Chess().fen(),solution:['e2e4'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles:[p]})}));
  const calls=[],engines=[];
  a.replace('createEngine',async()=>{
    const engine=fakeEngine(async(...args)=>{
      calls.push(args);
      if(analyse)return analyse(...args);
      const c=new Chess(args[0]),move=c.moves({verbose:true})[0];
      return {score:{cp:c.turn()==='w'?60:-60},bestmove:move?.lan,lines:[]};
    });engines.push(engine);return engine;
  });
  await a.call('openLearning');const w=a.run('learningWorkspace');t.after(()=>w.close());
  await w.startPuzzleSelection([p]);return {a,w,p,calls,engines,board:w.boardElement,doc:a.dom.window.document};
}

async function complete(w,p) {await w.submitPuzzle(p.solution[0]);assert.equal(w.feedback.status,'completed');}
async function explore(w) {w.root.querySelector('[data-focus=puzzle-analyse]').click();await w.analysisRequest;}

test('Analyse stays in puzzle practice with a disabled Analysing button and allows both sides until Next puzzle',async t=>{
  const {a,w,p,calls,engines,board}=await setup(t);
  assert.equal(w.root.querySelector('[data-focus=puzzle-analyse]'),null);
  await complete(w,p);const progress=JSON.stringify(w.store.value),review=JSON.stringify(a.state.positions),status=w.root.querySelector('.puzzle-practice-status').textContent,rating=w.root.querySelector('.puzzle-elo-panel').textContent;
  assert.equal(status,'Solved! · 1200');
  const button=w.root.querySelector('[data-focus=puzzle-analyse]');assert.equal(button.textContent,'Analyse');
  assert.ok(w.root.querySelector('.puzzle-practice-status').compareDocumentPosition(button)&4);
  await explore(w);assert.equal(w.currentFen(),p.fen);assert.equal(board.querySelector('.puzzle-result-badge'),null);
  assert.equal(w.root.querySelector('.puzzle-practice-heading h2').textContent,'Puzzle practice');
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,status);assert.equal(w.root.querySelector('.puzzle-elo-panel').textContent,rating);
  const analysing=w.root.querySelector('[data-focus=puzzle-analyse]');assert.equal(analysing.textContent,'Analysing');assert.equal(analysing.disabled,true);
  assert.equal(w.root.querySelector('.puzzle-analysis-session, .puzzle-analysis-controls'),null);
  assert.ok(w.root.querySelector('.puzzle-practice-actions .primary'));analysing.click();assert.equal(engines.length,1);
  assert.equal(board.parentElement.querySelectorAll('.puzzle-analysis-evalbar').length,1);
  assert.equal(board.parentElement.querySelector('.white-fill').style.height,'54.6%');
  assert.match(board.querySelector('.puzzle-analysis-arrow').getAttribute('aria-label'),/^Best move:/);
  const clickMove=async(from,to)=>{board.querySelector(`[data-square=${from}]`).click();board.querySelector(`[data-square=${to}]`).click();await w.analysisRequest;};
  await clickMove('d2','d4');await clickMove('d7','d5');
  assert.equal(w.puzzleAnalysis.chess.get('d5').color,'b');assert.equal(engines.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[3])),{initialFen:p.fen,moves:['d2d4','d7d5']});
  assert.equal(w.puzzleAnalysis.score.cp,60,'Black-relative scores must be converted to White');
  assert.equal(JSON.stringify(w.store.value),progress);assert.equal(JSON.stringify(a.state.positions),review);
  w.flipBoard();assert.ok(board.parentElement.querySelector('.puzzle-analysis-evalbar.flipped'));assert.ok(board.querySelector('.puzzle-analysis-arrow'));
  const next={...p,id:'analysis-next'};w.puzzles.push(next);w.queue.push(next);
  w.root.querySelector('.puzzle-practice-actions .primary').click();await settle();
  assert.equal(w.activity.id,next.id);assert.equal(w.puzzleAnalysis,null);assert.equal(w.attemptRecorded,false);
  assert.equal(board.parentElement.querySelector('.puzzle-analysis-evalbar'),null);assert.equal(engines[0].dead,true);
  assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);assert.equal(w.root.querySelector('[data-focus=puzzle-analyse]'),null);
  await complete(w,next);assert.equal(w.root.querySelector('[data-focus=puzzle-analyse]').disabled,false);
});

test('analysis navigation retains history, allows a new branch and resets to the original puzzle',async t=>{
  const {a,w,p,calls,doc}=await setup(t);await complete(w,p);await explore(w);
  const key=value=>doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  w.submitMove('g1f3');await w.analysisRequest;w.submitMove('g8f6');await w.analysisRequest;
  key('ArrowLeft');await w.analysisRequest;
  assert.equal(w.puzzleAnalysis.index,1);assert.deepEqual(calls.at(-1)[3].moves,['g1f3']);
  key('ArrowRight');await w.analysisRequest;assert.equal(w.puzzleAnalysis.index,2);
  w.stepPuzzleAnalysis(1);await w.analysisRequest;w.submitMove('d7d5');await w.analysisRequest;
  assert.deepEqual(w.puzzleAnalysis.line,['g1f3','d7d5']);
  key('Home');await w.analysisRequest;assert.equal(w.currentFen(),p.fen);
});

test('puzzle arrows never focus adjacent squares; analysis arrows replay the accepted solve from its start',async t=>{
  const p={id:'history-line',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  const {a,w,board,doc}=await setup(t,{puzzle:p});
  const key=value=>doc.activeElement.dispatchEvent(new a.dom.window.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  const square=board.querySelector('[data-square=e2]');square.focus();
  const fen=w.currentFen();for(const value of ['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'])key(value);
  assert.equal(w.currentFen(),fen);assert.equal(w.selected,null);assert.equal(w.marked.size,0);assert.equal(w.boardMarks?.size||0,0);
  assert.equal(doc.activeElement.closest('.learn-square'),null);
  assert.equal(doc.activeElement,w.root,'History arrows must not highlight Back to review');
  await w.submitPuzzle('d2d4');await w.submitPuzzle('e2e4');await w.submitPuzzle('g1f3');
  const completed=w.currentFen(),progress=JSON.stringify(w.store.value);await explore(w);
  assert.deepEqual(w.puzzleAnalysis.line,p.solution);assert.equal(w.currentFen(),p.fen);
  key('ArrowLeft');assert.equal(w.puzzleAnalysis.index,0);
  key('ArrowRight');await w.analysisRequest;assert.equal(w.puzzleAnalysis.index,1);
  assert.equal(doc.activeElement,w.root,'History renders must keep focus off navigation buttons');
  key('End');await w.analysisRequest;assert.equal(w.currentFen(),completed);
  key('Home');await w.analysisRequest;assert.equal(w.currentFen(),p.fen);
  w.flipBoard();key('ArrowRight');await w.analysisRequest;assert.equal(w.puzzleAnalysis.index,1);
  assert.equal(JSON.stringify(w.store.value),progress);
});

test('analysis preserves the recorded solution after rejecting a wrong move and resuming a solve',async t=>{
  const p={id:'history-mate',fen:'7k/5Q2/6K1/8/8/8/8/8 w - - 0 1',solution:['f7g7'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  const {w}=await setup(t,{puzzle:p});
  // Any checkmate is accepted, so the rejected attempt must be a move that does not mate.
  const wrong=new Chess(p.fen).moves({verbose:true}).find(m=>m.lan!==p.solution[0]&&!new Chess(m.after).isCheckmate());
  await w.submitPuzzle(wrong.lan);assert.equal(w.activity.step,0);assert.deepEqual(w.puzzleMoves,[]);
  await w.submitPuzzle(p.solution[0]);await explore(w);assert.deepEqual(w.puzzleAnalysis.line,p.solution);
  const second={...p,id:'history-resume',fen:new Chess().fen(),solution:['e2e4','e7e5','g1f3']};w.puzzles.push(second);
  await w.preparePuzzle(second,{step:2});assert.equal(w.activity.step,0);assert.deepEqual(w.puzzleMoves,[]);
  await w.submitPuzzle('e2e4');await w.submitPuzzle('g1f3');await explore(w);
  assert.deepEqual(w.puzzleAnalysis.line,second.solution);
});

test('stale analysis results cannot replace a newer position or reappear after leaving',async t=>{
  const jobs=[];
  const {w,p,board,engines}=await setup(t,{analyse:()=>{const job=deferred();jobs.push(job);return job.promise;}});
  await complete(w,p);w.startPuzzleAnalysis();const first=w.analysisRequest;await settle();
  w.submitMove('d2d4');const second=w.analysisRequest;await settle();
  jobs[1].resolve({score:{cp:-200},bestmove:'d7d5'});await second;
  assert.equal(w.puzzleAnalysis.score.cp,200);assert.equal(w.puzzleAnalysis.best,'d7d5');
  jobs[0].resolve({score:{cp:-900},bestmove:'e2e4'});await first;
  assert.equal(w.puzzleAnalysis.score.cp,200);assert.equal(w.puzzleAnalysis.best,'d7d5');
  w.submitMove('d7d5');const third=w.analysisRequest;await settle();
  await w.navigate('puzzles');assert.equal(engines[0].dead,true);
  jobs[2].resolve({score:{cp:999},bestmove:'e2e4'});await third;
  assert.equal(w.puzzleAnalysis,null);assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);assert.equal(board.parentElement.querySelector('.puzzle-analysis-evalbar'),null);
});

test('Next puzzle cancels pending analysis immediately, including when the puzzle queue ends',async t=>{
  const jobs=[];
  const {w,p,board,engines}=await setup(t,{analyse:()=>{const job=deferred();jobs.push(job);return job.promise;}});
  await complete(w,p);w.startPuzzleAnalysis();const first=w.analysisRequest;await settle();
  const next={...p,id:'pending-next'};w.puzzles.push(next);w.queue.push(next);
  await w.nextPuzzle();assert.equal(w.activity.id,next.id);assert.equal(w.puzzleAnalysis,null);assert.equal(engines[0].dead,true);
  jobs[0].resolve({score:{cp:900},bestmove:'e2e4'});await first;
  assert.equal(board.parentElement.querySelector('.puzzle-analysis-evalbar'),null);assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);
  assert.equal(w.root.querySelector('[data-focus=puzzle-analyse]'),null);
  await complete(w,next);w.startPuzzleAnalysis();const second=w.analysisRequest;await settle();
  await w.nextPuzzle();assert.equal(w.activity,null);assert.equal(w.puzzleAnalysis,null);assert.equal(engines[1].dead,true);
  jobs[1].resolve({score:{cp:-900},bestmove:'e2e4'});await second;
  assert.equal(board.parentElement.querySelector('.puzzle-analysis-evalbar'),null);assert.equal(w.page,'puzzles');
});

test('only completed searches update the bar and arrow; early score swings leave the previous fill intact',async t=>{
  const jobs=[];
  const {w,p,board,a}=await setup(t,{analyse:(...args)=>{const job=deferred();jobs.push({...job,progress:preview=>args[4]?.(preview)});return job.promise;}});
  await complete(w,p);w.startPuzzleAnalysis();const first=w.analysisRequest;await settle();
  const bar=w.analysisBar,fill=bar.querySelector('.white-fill'),square=board.querySelector('[data-square=e2]');
  const changes=[],observer=new a.dom.window.MutationObserver(records=>changes.push(...records));observer.observe(bar.parentElement,{childList:true,subtree:true});
  assert.equal(fill.style.height,'50%');
  for(const score of [{cp:900},{cp:-900},{mate:3},{cp:240}]){
    jobs[0].progress({score,pv:'e2e4'});
    assert.equal(fill.style.height,'50%');assert.equal(w.puzzleAnalysis.score,null);
    assert.equal(bar.querySelector('.score.bot').textContent,'…');assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);
  }
  assert.equal(w.analysisBar,bar);assert.equal(board.querySelector('[data-square=e2]'),square);
  jobs[0].resolve({score:{cp:240},bestmove:'e2e4'});await first;
  assert.equal(fill.style.height,'68.4%');assert.equal(bar.querySelector('.score.bot').textContent,'2.40');
  assert.equal(board.querySelector('.puzzle-analysis-arrow').dataset.move,'e2e4');
  w.submitMove('d2d4');const second=w.analysisRequest;await settle();
  assert.equal(w.analysisBar,bar);assert.equal(bar.querySelector('.white-fill'),fill);assert.equal(fill.style.height,'68.4%');
  assert.equal(bar.getAttribute('aria-label'),'Evaluation pending');assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);
  const blackSquare=board.querySelector('[data-square=d7]');
  for(const score of [{mate:-2},{cp:-800},{cp:700},{cp:120}]){
    jobs[1].progress({score,pv:'d7d5'});assert.equal(fill.style.height,'68.4%');
    assert.equal(bar.querySelector('.score.bot').textContent,'2.40');assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);
  }
  assert.equal(board.querySelector('[data-square=d7]'),blackSquare);
  jobs[1].resolve({score:{cp:120},bestmove:'d7d5'});await second;
  assert.equal(fill.style.height,'40.8%');assert.equal(bar.querySelector('.score.top').textContent,'1.20');
  assert.equal(board.querySelector('.puzzle-analysis-arrow').dataset.move,'d7d5');
  w.flipBoard();assert.equal(w.analysisBar,bar);assert.equal(bar.querySelector('.white-fill'),fill);assert.ok(bar.classList.contains('flipped'));
  const removed=[...changes,...observer.takeRecords()].flatMap(record=>[...record.removedNodes]);observer.disconnect();
  assert.ok(!removed.some(node=>node===bar||node===fill||node.contains?.(bar)),'Bar and fill must stay mounted throughout evaluation and navigation');
});

test('engine failure leaves the board playable and retryable; closing during startup terminates the late worker',async t=>{
  const {a,w,p,engines}=await setup(t,{analyse:async()=>{throw Error('Engine stopped');}});
  await complete(w,p);await explore(w);assert.match(w.root.querySelector('.puzzle-analysis-status').textContent,/unavailable/);
  w.submitMove('d2d4');await w.analysisRequest;assert.equal(w.puzzleAnalysis.chess.get('d4').color,'w');
  const boot=deferred(),late=fakeEngine();a.replace('createEngine',()=>boot.promise);
  w.root.querySelector('.puzzle-analysis-retry').click();const request=w.analysisRequest;await settle();await w.close();boot.resolve(late);await request;
  assert.equal(late.dead,true);assert.equal(engines[0].dead,true);
});

test('analysis promotion requires a choice, terminal mate fills the bar and undo restores analysis',async t=>{
  const p={id:'analysis-promotion',fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',solution:['a7a8r'],rating:1200,themes:[],source:{url:'https://lichess.org/training'}};
  const {w,board}=await setup(t,{puzzle:p});await complete(w,p);await explore(w);
  board.querySelector('[data-square=a7]').click();board.querySelector('[data-square=a8]').click();
  assert.equal(w.promotionPending.moves.length,4);w.root.querySelector('[aria-label="Promote to knight"]').click();await w.analysisRequest;
  assert.equal(w.puzzleAnalysis.chess.get('a8').type,'n');assert.deepEqual(w.puzzleAnalysis.score,{cp:0});
  w.stepPuzzleAnalysis(0);await w.analysisRequest;assert.equal(w.currentFen(),p.fen);
  // Play a complete mate from a new analysis root; terminal evaluation needs no engine.
  w.puzzleAnalysis.initialFen='7k/5Q2/6K1/8/8/8/8/8 w - - 0 1';w.puzzleAnalysis.line=[];w.stepPuzzleAnalysis(0);await w.analysisRequest;
  w.submitMove('f7g7');await w.analysisRequest;
  assert.equal(w.puzzleAnalysis.chess.isCheckmate(),true);assert.equal(board.parentElement.querySelector('.white-fill').style.height,'100%');
  assert.equal(board.querySelector('.puzzle-analysis-arrow'),null);
});

test('changing engine settings restarts analysis, and leaving a timed analysis releases its worker',async t=>{
  const {a,w,p,engines,calls,board}=await setup(t);await w.startChallenge(60);await complete(w,p);await explore(w);
  const remaining=w.run.clock.remaining(),run=w.run;
  assert.equal(run.clock.runningAt,null);
  a.state.settings.engineDepth=7;w.refreshSettings();await w.analysisRequest;
  assert.equal(engines[0].dead,true);assert.equal(calls.at(-1)[1],7);assert.equal(engines.length,2);
  assert.ok(run.clock.remaining()<=remaining);
  await w.finishChallenge('Finished after analysis');assert.equal(w.run,null);assert.equal(w.puzzleAnalysis,null);assert.equal(engines[1].dead,true);
  assert.equal(board.parentElement.querySelector('.puzzle-analysis-evalbar'),null);
});

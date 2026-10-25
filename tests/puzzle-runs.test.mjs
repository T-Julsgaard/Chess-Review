import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {LearningWorkspace} from '../lib/learning/workspace.js';
import {ChallengeClock} from '../lib/learning/progress.js';
import {pickRunPuzzle, runPuzzleRating} from '../lib/learning/puzzle-runs.js';

const library=JSON.parse(fs.readFileSync(new URL('../data/learning/puzzles.json',import.meta.url))).puzzles;
const mate=library.find(p=>p.themes.includes('mateIn1'));
const line=library.find(p=>p.solution.length>=5);
const fixtures=Array.from({length:30},(_,i)=>({...mate,id:'run-'+i,rating:450+i*40}));
async function setup(t,{puzzles=fixtures,initial={}}={}) {
  const dom=new JSDOM('<div id="root"><div class="app"></div></div>',{url:'https://extension.test'}),data=structuredClone(initial),state={fail:false};
  t.mock.method(globalThis,'fetch',async()=>({ok:true,json:async()=>({schema:1,puzzles})}));
  const storage={async get(key){return {[key]:structuredClone(data[key])};},async set(values){if(state.fail)throw Error('Unavailable');Object.assign(data,structuredClone(values));}};
  const w=new LearningWorkspace({document:dom.window.document,storage,settings:()=>({moveAnim:false}),makePiece:()=>dom.window.document.createElement('span')});
  t.after(async()=>{state.fail=false;await w.close();dom.window.close();});await w.open();
  return {w,dom,data,state};
}
const current=w=>w.puzzles.find(p=>p.id===w.activity.id);
const solve=async w=>{const id=w.activity.id;while(w.activity?.id===id)await w.submitPuzzle(current(w).solution[w.activity.step]);};
const wrong=async w=>{const p=current(w),c=new Chess(w.currentFen());await w.submitPuzzle(c.moves({verbose:true}).find(m=>m.lan!==p.solution[w.activity.step]&&!new Chess(m.after).isCheckmate()).lan);};

for(const mode of ['practice','timeAttack','knockout'])for(const phase of ['arrangement','opponent setup']) {
  test(`${mode} can return immediately during ${phase} without a late startup restoring the puzzle`,async t=>{
    const {w,data}=await setup(t,{puzzles:[mate]});
    assert.ok(mate.setup);
    w.settings=()=>({moveAnim:true});
    let release,cancelled=false;
    const pending=new Promise(resolve=>{release=resolve;});
    t.after(release);
    if(phase==='arrangement')t.mock.method(w,'arrangePuzzlePieces',()=>{
      w.cancelPieceTransition=()=>{cancelled=true;};return pending;
    });
    else {
      t.mock.method(w,'arrangePuzzlePieces',async()=>{});
      t.mock.method(w,'waitForPuzzleReply',()=>{w.releaseReply=()=>{cancelled=true;};return pending;});
    }
    const starting=mode==='practice'?w.startRatedPuzzles():w.startPuzzleRun(mode);
    for(let i=0;i<100&&!(phase==='arrangement'?w.cancelPieceTransition:w.releaseReply);i++)await Promise.resolve();
    assert.equal(w.puzzleIntroducing,true);assert.equal(w.busy,true);
    const button=w.root.querySelector('[data-focus=puzzle-overview]');
    assert.equal(button.disabled,false);
    w.render();assert.equal(w.root.querySelector('[data-focus=puzzle-overview]'),button);
    button.click();
    for(let i=0;i<100&&w.root.querySelector('[data-focus=puzzle-overview]');i++)await Promise.resolve();
    assert.equal(cancelled,true);assert.equal(w.activity,null);assert.equal(w.run,null);
    assert.equal(w.puzzleIntroducing,false);assert.equal(w.busy,false);assert.equal(w.page,'puzzles');
    assert.ok(w.root.querySelector('.puzzle-mode-grid'));
    const saved=structuredClone(data['learning:v1']);
    release(true);await starting;
    assert.equal(w.activity,null);assert.equal(w.pendingOpponent==null,true);assert.equal(w.puzzleThinkingAt==null,true);
    assert.equal(w.feedback,null);assert.equal(w.run,null);assert.equal(w.busy,false);
    assert.deepEqual(data['learning:v1'],saved);
    assert.equal(saved.challenges.length,mode==='practice'?0:1);
    assert.deepEqual(saved.puzzles,{});
  });
}

test('the overview button survives startup renders while answer validation still locks it',async t=>{
  const {w}=await setup(t,{puzzles:[line]});
  await w.startRatedPuzzles();
  const button=w.root.querySelector('[data-focus=puzzle-overview]');
  await w.preparePuzzle(line);assert.equal(w.root.querySelector('[data-focus=puzzle-overview]'),button);
  w.busy=true;w.render();assert.equal(button.disabled,true);
  button.click();assert.ok(w.activity);
  w.busy=false;w.render();assert.equal(button.disabled,false);
  assert.equal(w.root.querySelector('[data-focus=puzzle-overview]'),button);
});

test('three aligned mode buttons show independent records and disable empty selections',async t=>{
  const {w}=await setup(t);
  await w.persist(p=>{p.bests.timeAttack=12;p.bests.knockout=7;p.puzzles.old={clean:1};});w.puzzleRange=[9000,9100];w.render();
  assert.deepEqual([...w.root.querySelectorAll('.puzzle-mode-name')].map(n=>n.textContent),['Solve a puzzle','Time attack','Knockout']);
  assert.deepEqual([...w.root.querySelectorAll('.puzzle-mode-record strong')].map(n=>n.textContent),['1','12','7']);
  assert.equal(w.root.querySelector('[data-focus=solve-puzzle]').disabled,true);
  assert.equal(w.root.querySelector('[data-focus=timeAttack]').disabled,true);
  assert.equal(w.root.querySelector('[data-focus=knockout]').disabled,true);
  w.puzzleRange=w.puzzleRatingBounds();w.render();
  w.root.querySelector('[data-focus=timeAttack]').click();
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(w.run.mode,'timeAttack');assert.ok(w.activity);
});

test('difficulty stays easy for eight puzzles then climbs without repeats in the real library',()=>{
  for(const random of [()=>0,()=>.5,()=>.999]){
    const results=[];
    for(let i=0;i<35;i++){
      const p=pickRunPuzzle(library,results,random);
      assert.ok(!results.some(r=>r.id===p.id));
      if(i<8)assert.ok(p.rating<=800);
      if(i)assert.ok(p.rating>=results.at(-1).rating||!library.some(q=>q.rating>=results.at(-1).rating&&!results.some(r=>r.id===q.id)));
      results.push({id:p.id,rating:p.rating});
    }
    assert.ok(results[20].rating>1700);assert.ok(results[34].rating>2900);
  }
  assert.equal(runPuzzleRating(7),730);assert.equal(runPuzzleRating(8),850);
  assert.equal(pickRunPuzzle([mate],[{id:mate.id,rating:mate.rating}]),null);
});

test('Time attack starts at three minutes, advances on success or failure, and ends on third mistake',async t=>{
  const {w,data}=await setup(t);await w.startPuzzleRun('timeAttack');
  assert.equal(w.root.querySelector('#learn-clock').textContent,'3:00');assert.equal(w.run.lives,3);
  assert.equal(w.root.querySelector('.puzzle-practice-actions, .puzzle-run-lives, [data-focus=end-run]'),null);
  assert.ok(!w.root.textContent.includes('Find the full continuation'));
  assert.equal(w.root.querySelector('[data-focus=puzzle-hint]'),null);
  assert.equal(w.root.querySelector('.puzzle-run-meta'),null);
  await solve(w);assert.equal(w.run.solved,1);assert.equal(data['learning:v1'].bests.timeAttack,1);
  const first=w.run.results[0].id;await wrong(w);
  assert.equal(w.run.lives,2);assert.equal(w.run.solved,1);assert.notEqual(w.activity.id,first);
  assert.deepEqual([...w.root.querySelectorAll('.puzzle-run-history li')].map(n=>n.getAttribute('aria-label')),['Puzzle 1: solved','Puzzle 2: incorrect']);
  await wrong(w);await wrong(w);
  assert.equal(w.run,null);assert.equal(w.result.reason,'Out of lives');assert.equal(w.result.solved,1);assert.equal(w.result.mistakes,3);
  assert.equal(w.result.results.length,4);assert.equal(data['learning:v1'].challenges.length,1);
  assert.equal(data['learning:v1'].bests.timeAttack,1);
});

test('Knockout has no timer and ends immediately on its first wrong move with its own best',async t=>{
  const {w,data}=await setup(t);await w.startPuzzleRun('knockout');
  assert.equal(w.run.clock,null);assert.equal(w.root.querySelector('[role=timer]'),null);
  assert.equal(w.root.querySelector('.puzzle-practice-actions, .puzzle-run-lives, [data-focus=end-run]'),null);
  assert.ok(!w.root.textContent.includes('Find the full continuation'));
  await solve(w);await solve(w);assert.equal(w.run.lives,1);await wrong(w);
  assert.equal(w.run,null);assert.equal(w.result.solved,2);assert.equal(w.result.results.at(-1).correct,false);
  assert.equal(data['learning:v1'].bests.knockout,2);assert.equal(data['learning:v1'].bests.timeAttack,undefined);
  await w.startPuzzleRun('knockout');await wrong(w);assert.equal(w.result.best,2);assert.equal(w.result.personalBest,false);
  await w.navigate('puzzles');assert.equal(w.root.querySelector('[data-focus=knockout]').closest('.puzzle-mode').querySelector('.puzzle-mode-record strong').textContent,'2');
});

for(const mode of ['timeAttack','knockout'])for(const previousBest of [0,10])test(`${mode} keeps its labels and announces the ending on the board ${previousBest?'without':'with'} a personal best`,async t=>{
  const {w,dom}=await setup(t);
  await w.persist(p=>{p.bests[mode]=previousBest;});
  await w.startPuzzleRun(mode);
  const title=w.root.querySelector('.puzzle-practice-heading h2').textContent;
  await solve(w);
  let dismiss;
  t.mock.method(dom.window,'setTimeout',(fn,delay,...args)=>{
    if(delay===2800){dismiss=fn;return 0;}
    return setTimeout(fn,delay,...args);
  });
  const reason=mode==='timeAttack'?'Time is up':'Out of lives';
  await w.finishChallenge(reason);
  assert.equal(w.root.querySelector('.puzzle-practice-heading h2').textContent,title);
  assert.equal(w.root.querySelector('.puzzle-run-stats > div > span').textContent,'Solved');
  const overlay=w.root.querySelector('.learn-board > .puzzle-run-end[role=status]');
  assert.ok(overlay);assert.equal(overlay.dataset.motion,'off');
  assert.equal(overlay.querySelector('.puzzle-run-end-title').textContent,'Run over');
  assert.equal(overlay.querySelector('.puzzle-run-end-reason').textContent,reason);
  assert.equal(!!overlay.querySelector('.puzzle-run-end-best'),!previousBest);
  dismiss();assert.equal(overlay.isConnected,false);assert.equal(w.cancelRunEnd,null);
  w.render();assert.equal(w.root.querySelector('.puzzle-run-end'),null);
  await w.replayRunPuzzle(w.result.results[0].id);
  assert.equal(w.root.querySelector('.puzzle-run-end'),null);
  assert.equal(w.root.querySelector('.puzzle-practice-heading h2').textContent,title);
});

test('the board ending cue clears immediately on replay, restart, navigation and close',async t=>{
  const {w}=await setup(t);
  await w.startPuzzleRun('knockout');await solve(w);await w.finishChallenge('All puzzles completed');
  assert.ok(w.root.querySelector('.puzzle-run-end-icon[data-complete=true]'));
  await w.replayRunPuzzle(w.result.results[0].id);
  assert.equal(w.root.querySelector('.puzzle-run-end'),null);assert.equal(w.cancelRunEnd,null);
  w.returnToRunResults();await w.startPuzzleRun('knockout');await wrong(w);
  assert.ok(w.root.querySelector('.puzzle-run-end'));
  await w.startPuzzleRun('knockout');assert.equal(w.root.querySelector('.puzzle-run-end'),null);
  await wrong(w);await w.navigate('puzzles');
  assert.equal(w.root.querySelector('.puzzle-run-end'),null);assert.equal(w.cancelRunEnd,null);
  await w.startPuzzleRun('knockout');await wrong(w);await w.close();
  assert.equal(w.cancelRunEnd,null);
});

for(const mode of ['timeAttack','knockout'])for(const page of ['openings','concepts'])test(`${mode} navigation to ${page} ends and saves the run`,async t=>{
  const {w,data}=await setup(t);await w.startPuzzleRun(mode);await solve(w);
  const run=w.run,button=w.root.querySelector(`[data-focus=${page}]`);
  assert.equal(button.disabled,false);button.click();
  for(let i=0;i<60;i++)await Promise.resolve();
  assert.equal(w.page,page);assert.equal(w.run,null);assert.equal(w.activity,null);
  assert.equal(w.result,null);assert.equal(w.busy,false);assert.equal(run.clock?.runningAt??null,null);
  assert.equal(data['learning:v1'].challenges.at(-1).solved,1);
  assert.equal(data['learning:v1'].bests[mode],1);assert.ok(w.root.querySelector('.learn-library'));
});

for(const mode of ['timeAttack','knockout'])test(`${mode} navigation cancels a pending opponent reply`,async t=>{
  const {w}=await setup(t,{puzzles:[{...line,rating:400},...fixtures.map(p=>({...p,rating:3000}))]});
  await w.startPuzzleRun(mode);
  const move=w.submitPuzzle(line.solution[0]);assert.equal(w.opponentPlaying,true);
  assert.equal(w.root.querySelector('[data-focus=openings]').disabled,false);
  await w.navigate('openings');await move;
  assert.equal(w.page,'openings');assert.equal(w.run,null);assert.equal(w.activity,null);
  assert.equal(w.pendingOpponent,null);assert.equal(w.busy,false);assert.equal(w.opponentPlaying,false);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} result badges select playable puzzles and preserve the results controls and saved progress`,async t=>{
  const {w,dom,data}=await setup(t,{puzzles:[{...line,rating:400},...fixtures.map(p=>({...p,rating:3000}))]});
  t.mock.method(w,'waitForPuzzleReply',async()=>true);
  await w.startRatedPuzzles();await w.navigate('puzzles');
  await w.startPuzzleRun(mode);await solve(w);await wrong(w);
  if(w.run)await w.finishChallenge('Ended early');
  const result=w.result,saved=structuredClone(data['learning:v1']),heading=w.root.querySelector('.learn-results h2').textContent;
  const finalTurn=w.root.querySelector('.puzzle-turn-cue').textContent;
  assert.equal(w.root.querySelector('.learn-results .learn-eyebrow'),null);
  assert.ok(w.root.querySelector('.puzzle-run-results.puzzle-session .puzzle-practice-heading'));
  assert.doesNotMatch(w.root.textContent,/Each check is a solved puzzle|Back to puzzles/);
  assert.equal(w.root.querySelector('[data-focus=puzzle-overview]').textContent,'Return to puzzle overview');
  const controls=()=>[...w.root.querySelectorAll('.puzzle-run-results button:not(.learn-square)')].map(n=>n.textContent);
  const originalControls=controls();
  const badges=w.root.querySelectorAll('.puzzle-run-history button');
  assert.equal(badges.length,2);assert.match(badges[0].getAttribute('aria-label'),/Replay puzzle 1: solved/);
  badges[0].focus();badges[0].click();
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(w.activity.id,result.results[0].id);assert.equal(w.activity.step,0);assert.equal(w.activity.rated,false);
  assert.equal(w.currentFen(),line.fen);assert.equal(w.run,null);assert.equal(w.puzzleThinkingAt,null);
  assert.equal(w.root.querySelector('.learn-results h2').textContent,heading);
  assert.equal(w.root.querySelectorAll('.puzzle-run-history button').length,2);
  assert.equal(w.root.querySelectorAll('.puzzle-run-history [aria-current=true]').length,1);
  assert.doesNotMatch(w.root.textContent,/Puzzle replay|Close puzzle|Hint|Skip/);
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,line.fen.split(' ')[1]==='w'?'White to move':'Black to move');
  assert.deepEqual(controls(),originalControls);
  assert.equal(w.root.querySelector('.puzzle-practice-actions, .puzzle-run-meta'),null);
  await w.replayRunPuzzle(result.results[1].id);assert.equal(w.activity.id,result.results[1].id);
  await w.replayRunPuzzle(result.results[0].id);assert.equal(w.activity.id,result.results[0].id);
  assert.equal(w.root.querySelector('.puzzle-rating-region, .puzzle-rating-toggle, #learn-clock'),null);
  const fen=w.currentFen();
  await wrong(w);assert.equal(w.currentFen(),fen);assert.equal(w.activity.mistakes,1);
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,'Wrong move');
  assert.ok(w.root.querySelector('.puzzle-result-badge[data-result=incorrect]'));
  for(const square of current(w).solution[0].match(/.{2}/g).slice(0,2))w.root.querySelector(`[data-square=${square}]`).click();
  for(let i=0;i<60;i++)await Promise.resolve();
  assert.equal(w.activity.step,2);assert.notEqual(w.currentFen(),fen);
  assert.equal(w.lastMove,line.solution[1]);assert.deepEqual(controls(),originalControls);
  while(!w.attemptRecorded)await w.submitMove(current(w).solution[w.activity.step]);
  const solved=w.currentFen();assert.equal(w.feedback.status,'completed');assert.equal(w.busy,false);
  assert.equal(w.root.querySelector('.puzzle-practice-status').textContent,'Puzzle completed');
  assert.ok(w.root.querySelector('.puzzle-result-badge[data-result=correct]'));
  await w.submitMove(line.solution[0]);await w.hintPuzzle();await w.revealPuzzle();await w.skipPuzzle();
  w.startPuzzleAnalysis();
  assert.equal(w.currentFen(),solved);assert.equal(w.activity.assisted,false);assert.equal(w.puzzleThinkingAt,null);
  assert.equal(w.puzzleAnalysis,null);assert.deepEqual(controls(),originalControls);
  assert.deepEqual(data['learning:v1'],saved);assert.deepEqual(w.store.value,saved);
  w.returnToRunResults();assert.equal(w.result,result);assert.equal(w.activity,null);
  assert.equal(w.root.querySelector('.puzzle-turn-cue').textContent,finalTurn);
  await w.replayRunPuzzle(result.results[0].id);
  assert.equal(w.currentFen(),fen);assert.equal(w.activity.step,0);assert.equal(w.attemptRecorded,false);
  await w.replayRunPuzzle(result.results[1].id);
  assert.deepEqual(data['learning:v1'],saved);
  w.root.querySelector('[data-focus=run-again]').click();
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(w.run.mode,mode);assert.equal(w.runReplay,null);assert.equal(w.activity.replay,false);
  await w.finishChallenge('Ended early');
  w.root.querySelector('[data-focus=puzzle-overview]').click();
  for(let i=0;i<30;i++)await Promise.resolve();
  assert.equal(w.page,'puzzles');assert.equal(w.result,null);assert.equal(w.runReplay,null);assert.equal(w.closed,false);
  assert.ok(dom.window.document.querySelector('.learning-workspace'));
});

test('a partial continuation earns no point and a wrong move later in it ends Knockout',async t=>{
  const {w}=await setup(t,{puzzles:[line,...fixtures.map(p=>({...p,rating:3000}))]});
  // Make the multi-move puzzle the only easy candidate.
  w.puzzles[0]={...line,rating:400};await w.startPuzzleRun('knockout');
  await w.submitPuzzle(line.solution[0]);assert.equal(w.activity.step,2);assert.equal(w.run.solved,0);
  await wrong(w);assert.equal(w.result.solved,0);assert.equal(w.result.results.length,1);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} keeps the final puzzle and wrong badge after running out of lives`,async t=>{
  const {w,dom}=await setup(t,{puzzles:[{...line,rating:400},...fixtures.map(p=>({...p,rating:3000}))]});
  await w.startPuzzleRun(mode);
  if(mode==='timeAttack'){await wrong(w);await wrong(w);}
  const turn=current(w).fen.split(' ')[1]==='w'?'White to move':'Black to move';
  await w.submitPuzzle(current(w).solution[0]);
  const fen=w.currentFen(),flipped=w.flipped;
  const squares=()=>[...w.root.querySelectorAll('.learn-square')].map(n=>n.getAttribute('aria-label'));
  const position=squares();await wrong(w);
  assert.equal(w.run,null);assert.equal(w.activity,null);assert.equal(w.result.reason,'Out of lives');
  assert.equal(w.currentFen(),fen);assert.equal(w.flipped,flipped);assert.deepEqual(squares(),position);
  assert.equal(w.root.querySelector('.puzzle-turn-cue').textContent,turn);
  const badge=()=>w.root.querySelector('.puzzle-result-badge[data-result=incorrect]');
  assert.ok(badge());const square=badge().closest('[data-square]').dataset.square;
  const saved=structuredClone(w.store.value);
  w.root.querySelector(`[data-square=${square}]`).click();
  dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.ok(badge());assert.equal(w.currentFen(),fen);assert.deepEqual(w.store.value,saved);
  w.render();assert.ok(badge());assert.deepEqual(squares(),position);
  w.flipBoard();assert.equal(w.flipped,!flipped);assert.ok(badge());assert.equal(w.currentFen(),fen);
  await w.replayRunPuzzle(w.result.results[0].id);assert.equal(badge(),null);
  w.returnToRunResults();assert.equal(w.currentFen(),fen);assert.ok(badge());
  assert.equal(w.root.querySelector('.puzzle-turn-cue').textContent,turn);
  assert.equal(badge().closest('[data-square]').dataset.square,square);
  await w.navigate('puzzles');assert.equal(badge(),null);assert.equal(w.currentFen(),w.homePosition.fen());
});

test('Time attack keeps its unfinished puzzle position when the clock expires',async t=>{
  const {w}=await setup(t,{puzzles:[{...line,rating:400},...fixtures.map(p=>({...p,rating:3000}))]});
  await w.startPuzzleRun('timeAttack');clearInterval(w.ticker);
  const turn=w.root.querySelector('.puzzle-turn-cue').textContent;
  await w.submitPuzzle(line.solution[0]);
  const fen=w.currentFen(),flipped=w.flipped;
  w.run.clock.remainingMs=0;w.run.clock.runningAt=null;
  await w.submitPuzzle(line.solution[w.activity.step]);
  assert.equal(w.result.reason,'Time is up');assert.equal(w.result.solved,0);assert.equal(w.result.results.length,0);
  assert.equal(w.currentFen(),fen);assert.equal(w.flipped,flipped);
  assert.equal(w.root.querySelector('.puzzle-turn-cue').textContent,turn);
  assert.equal(w.root.querySelectorAll('.learn-square').length,64);
  assert.equal(w.root.querySelector('.puzzle-result-badge'),null);
});

test('illegal moves and assistance calls cannot consume lives or bypass run scoring',async t=>{
  const {w}=await setup(t);await w.startPuzzleRun('timeAttack');const id=w.activity.id;
  await w.submitPuzzle('a1a1');await w.hintPuzzle();await w.revealPuzzle();await w.skipPuzzle();
  assert.equal(w.activity.id,id);assert.equal(w.activity.assisted,false);assert.equal(w.run.lives,3);assert.equal(w.run.results.length,0);
});

for(const elapsed of [179999,180000])test(`Time attack ${elapsed<180000?'accepts a solve before':'rejects a solve at'} the deadline`,async t=>{
  const {w}=await setup(t);await w.startPuzzleRun('timeAttack');clearInterval(w.ticker);
  let now=0;w.run.clock=new ChallengeClock(180,()=>now);w.run.clock.ready();now=elapsed;
  await solve(w);
  if(w.run)await w.finishChallenge('Ended early');
  assert.equal(w.result.solved,elapsed<180000?1:0);
});

test('timer keeps running during replies and expiry cancels pending work without counting a partial solve',async t=>{
  const {w}=await setup(t,{puzzles:[{...line,rating:400},...fixtures.map(p=>({...p,rating:3000}))]});
  await w.startPuzzleRun('timeAttack');clearInterval(w.ticker);
  let now=0;const run=w.run;run.clock=new ChallengeClock(180,()=>now);run.clock.ready();now=179500;
  const answer=w.submitPuzzle(line.solution[0]);assert.equal(run.clock.runningAt,0);
  now=180001;await w.finishChallenge('Time is up');await answer;
  assert.equal(w.activity,null);assert.equal(w.busy,false);assert.equal(w.result.solved,0);assert.equal(w.result.results.length,0);
});

test('records survive reloads and run completion preserves normal Elo, statistics and resume',async t=>{
  const {w,data}=await setup(t);await w.startRatedPuzzles();await w.navigate('puzzles');const before=structuredClone(data['learning:v1']);
  await w.startPuzzleRun('timeAttack');await solve(w);await w.finishChallenge('Ended early');
  assert.deepEqual(data['learning:v1'].puzzleRating,before.puzzleRating);
  assert.deepEqual(data['learning:v1'].puzzles,before.puzzles);assert.deepEqual(data['learning:v1'].puzzleResume,before.puzzleResume);
  assert.deepEqual(data['learning:v1'].resume,before.resume);
  await w.store.load();assert.equal(w.store.value.bests.timeAttack,1);
});

test('failed record writes recover once and leaving ends the run without creating an extra puzzle result',async t=>{
  const {w,data,state}=await setup(t);await w.startPuzzleRun('knockout');state.fail=true;await solve(w);
  assert.equal(w.failedChanges.length,1);state.fail=false;await w.retrySave();assert.equal(data['learning:v1'].bests.knockout,1);
  await w.finishChallenge('Ended on return to puzzles',false);await w.navigate('puzzles');
  assert.equal(w.run,null);assert.equal(w.result,null);assert.equal(data['learning:v1'].challenges.length,1);
  assert.equal(data['learning:v1'].challenges[0].results.length,1);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} warns on entry with selected types and never saves a filtered personal best`,async t=>{
  const puzzles=fixtures.map((p,i)=>({...p,themes:i%3===0?['mateIn1']:i%3===1?['fork']:['pin']}));
  const {w,dom,data}=await setup(t,{puzzles});
  await w.persist(p=>{p.bests[mode]=1;});
  w.root.querySelector('[data-focus=theme-mateIn1]').click();
  w.root.querySelector('[data-focus=theme-fork]').click();
  assert.equal(w.root.querySelector('.puzzle-run-notice-overlay'),null);
  const trigger=w.root.querySelector(`[data-focus=${mode}]`);trigger.focus();
  const starting=w.startPuzzleRun(mode);
  const dialog=w.root.querySelector('.puzzle-run-notice-card');
  assert.equal(dialog.getAttribute('role'),'dialog');assert.match(dialog.textContent,/Personal best disabled/);
  assert.match(dialog.textContent,/All types/);assert.equal(w.run,null);
  assert.equal(dom.window.document.activeElement.dataset.focus,'run-notice-continue');
  dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(dom.window.document.activeElement.dataset.focus,'run-notice-cancel');
  dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  assert.equal(dom.window.document.activeElement.dataset.focus,'run-notice-continue');
  await w.startPuzzleRun(mode); // Repeated entry cannot bypass the notice.
  assert.equal(w.root.querySelectorAll('.puzzle-run-notice-card').length,1);
  dialog.querySelector('[data-focus=run-notice-continue]').click();await starting;
  assert.equal(w.run.bestEligible,false);assert.equal(w.run.clock?.started??true,true);
  assert.ok(w.run.puzzles.every(p=>!p.themes.includes('pin')));
  // The pool and eligibility stay fixed throughout the run.
  w.puzzleThemes.clear();
  await solve(w);await solve(w);await solve(w);
  assert.ok(w.run.results.every(r=>!puzzles.find(p=>p.id===r.id).themes.includes('pin')));
  assert.equal(data['learning:v1'].bests[mode],1);
  assert.ok(!w.root.querySelector('.puzzle-run-stats').textContent.includes('Record'));
  await w.finishChallenge('Ended early');
  assert.equal(w.result.solved,3);assert.equal(w.result.personalBest,false);assert.equal(w.result.best,1);
  assert.equal(data['learning:v1'].bests[mode],1);assert.equal(data['learning:v1'].challenges.at(-1).bestEligible,false);
  assert.equal(w.root.querySelector('.learn-results h2').textContent,mode==='timeAttack'?'Time attack':'Knockout');
  assert.ok(!w.root.querySelector('.learn-results').textContent.includes('Personal best'));
  await w.navigate('puzzles');
  await w.startPuzzleRun(mode);assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);
  assert.equal(w.run.bestEligible,true);await solve(w);await solve(w);await w.finishChallenge('Ended early');
  assert.equal(data['learning:v1'].bests[mode],2);assert.equal(w.result.personalBest,true);
});

test('filtered run notices cancel with button, Escape or backdrop and restore focus without starting a timer',async t=>{
  const {w,dom,data}=await setup(t);w.puzzleThemes.add('mateIn1');w.render();
  for(const cancel of ['button','escape','backdrop']){
    const trigger=w.root.querySelector('[data-focus=timeAttack]');trigger.focus();
    const starting=w.startPuzzleRun('timeAttack');
    assert.equal(w.root.querySelector('.learn-header').inert,true);
    if(cancel==='button')w.root.querySelector('[data-focus=run-notice-cancel]').click();
    else if(cancel==='escape')dom.window.document.activeElement.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
    else w.root.querySelector('.puzzle-run-notice-overlay').click();
    await starting;
    assert.equal(w.run,null);assert.equal(w.puzzleRunNotice,null);assert.equal(w.closed,false);
    assert.equal(w.root.querySelector('.learn-header').inert,false);assert.equal(dom.window.document.activeElement,trigger);
  }
  assert.equal(data['learning:v1'],undefined);
  const starting=w.startPuzzleRun('timeAttack');await w.close();await starting;
  assert.equal(w.run,null);assert.equal(w.puzzleRunNotice,null);
});

test('a filtered run without an existing best never creates a record, including after reload',async t=>{
  const {w,data}=await setup(t);w.puzzleThemes.add('mateIn1');
  const starting=w.startPuzzleRun('knockout');w.root.querySelector('[data-focus=run-notice-continue]').click();await starting;
  await solve(w);await w.finishChallenge('Ended early');await w.store.load();
  assert.equal(w.result.personalBest,false);assert.equal(w.store.value.bests.knockout,undefined);
  assert.equal(data['learning:v1'].bests.knockout,undefined);
});

for(const mode of ['timeAttack','knockout'])for(const filter of ['type','rating','both'])test(`${mode} warns on each overview entry and reload for ${filter}, skipping only Play again`,async t=>{
  const {w,data}=await setup(t);
  if(filter!=='rating')w.puzzleThemes.add('mateIn1');
  if(filter!=='type')w.puzzleRange=[650,850];
  const starting=w.startPuzzleRun(mode);
  w.root.querySelector('[data-focus=run-notice-continue]').click();await starting;
  assert.equal('puzzleRunNoticeAccepted' in (data['learning:v1']||{}),false);
  await solve(w);await w.finishChallenge('Ended early');
  const start=w.startPuzzleRun.bind(w);let restarting;
  t.mock.method(w,'startPuzzleRun',(mode,options)=>restarting=start(mode,options));
  w.root.querySelector('[data-focus=run-again]').click();await restarting;
  assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);
  assert.equal(w.run.mode,mode);assert.equal(w.run.bestEligible,false);
  await solve(w);await w.finishChallenge('Ended early');
  await w.navigate('puzzles');
  const reenter=w.startPuzzleRun(mode,{again:true}); // A stale option cannot bypass an overview entry.
  assert.ok(w.root.querySelector('.puzzle-run-notice-card'));
  w.root.querySelector('[data-focus=run-notice-continue]').click();await reenter;
  await w.finishChallenge('Ended early');await w.navigate('puzzles');
  const other=mode==='timeAttack'?'knockout':'timeAttack',switching=w.startPuzzleRun(other);
  assert.ok(w.root.querySelector('.puzzle-run-notice-card'));
  w.root.querySelector('[data-focus=run-notice-continue]').click();await switching;await w.close();
  data['learning:v1'].puzzleRunNoticeAccepted=true; // Old saved acceptance must not suppress the warning.
  const reopened=(await setup(t,{initial:data})).w;
  reopened.puzzleRange=[650,850];reopened.puzzleThemes.add('mateIn1');
  const reopening=reopened.startPuzzleRun(mode);
  assert.ok(reopened.root.querySelector('.puzzle-run-notice-card'));
  reopened.root.querySelector('[data-focus=run-notice-continue]').click();await reopening;
  assert.equal(reopened.run.bestEligible,false);await solve(reopened);
  assert.equal(reopened.store.value.bests[mode],undefined);
});

test('save failures and retries do not turn entry warnings into a saved preference',async t=>{
  const {w,data,state}=await setup(t);w.puzzleThemes.add('mateIn1');state.fail=true;
  const starting=w.startPuzzleRun('knockout');
  w.root.querySelector('[data-focus=run-notice-continue]').click();await starting;
  await w.finishChallenge('Ended early');
  const reenter=w.startPuzzleRun('knockout');
  assert.ok(w.root.querySelector('.puzzle-run-notice-card'));
  w.root.querySelector('[data-focus=run-notice-continue]').click();await reenter;
  assert.ok(w.run);state.fail=false;await w.retrySave();
  assert.equal('puzzleRunNoticeAccepted' in (data['learning:v1']||{}),false);
});

for(const mode of ['timeAttack','knockout'])for(const range of [[450,850],[650,1650],[650,850]])test(`${mode} with Elo ${range.join('–')} counts solves without setting records`,async t=>{
  const {w,data}=await setup(t);await w.persist(p=>{p.bests[mode]=1;});
  w.puzzleRange=[...range];w.render();
  assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);
  const starting=w.startPuzzleRun(mode),notice=w.root.querySelector('.puzzle-run-notice-card');
  assert.match(notice.textContent,/full rating range/);
  assert.doesNotMatch(notice.textContent,/Elo|Puzzles solved/);
  assert.equal(w.run,null);
  notice.querySelector('[data-focus=run-notice-continue]').click();await starting;
  assert.equal(w.run.bestEligible,false);
  assert.ok(w.run.puzzles.every(p=>p.rating>=range[0]&&p.rating<=range[1]));
  w.puzzleRange=null; // Changing settings cannot change the active run's eligibility or pool.
  await solve(w);await solve(w);
  assert.equal(w.root.querySelector('[data-run-score]').textContent,'2');
  assert.equal(data['learning:v1'].bests[mode],1);
  await w.finishChallenge('Ended early');
  assert.equal(w.result.solved,2);assert.equal(w.result.personalBest,false);
  assert.equal(data['learning:v1'].challenges.at(-1).solved,2);
  assert.equal(data['learning:v1'].bests[mode],1);
  await w.navigate('puzzles');w.puzzleRange=w.puzzleRatingBounds();w.render();
  await w.startPuzzleRun(mode);
  assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);assert.equal(w.run.bestEligible,true);
  await solve(w);await solve(w);await w.finishChallenge('Ended early');
  assert.equal(data['learning:v1'].bests[mode],2);assert.equal(w.result.personalBest,true);
});

test('Elo slider changes are quiet until run entry and normal filtered puzzles still count as solved',async t=>{
  const {w,dom,data}=await setup(t);
  w.root.querySelector('[data-focus=theme-mateIn1]').click();
  const maximum=w.root.querySelector('[data-focus=elo-1]');maximum.value=850;
  maximum.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);
  assert.deepEqual(w.puzzleRange,[450,850]);
  await w.startRatedPuzzles();while(!w.attemptRecorded)await w.submitPuzzle(current(w).solution[w.activity.step]);
  assert.equal(Object.values(data['learning:v1'].puzzles).filter(p=>p.clean>0).length,1);
  await w.navigate('puzzles');
  assert.equal(w.root.querySelector('[data-focus=solve-puzzle]').closest('.puzzle-mode').querySelector('.puzzle-mode-record strong').textContent,'1');
  w.puzzleThemes.clear();w.render();
  const full=w.root.querySelector('[data-focus=elo-1]');full.value=full.max;
  full.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
  await w.startPuzzleRun('timeAttack');assert.equal(w.run.bestEligible,true);
  assert.equal(w.root.querySelector('.puzzle-run-notice-card'),null);
});

for(const mode of ['timeAttack','knockout'])test(`${mode} places the turn cue above history without a current puzzle label`,async t=>{
  const {w}=await setup(t);await w.startPuzzleRun(mode);
  const panel=w.root.querySelector('.puzzle-run-panel'),cue=panel.querySelector('.puzzle-turn-cue'),history=panel.querySelector('.puzzle-run-history'),number=panel.querySelector('.puzzle-run-meta');
  assert.match(cue.textContent,/White to move|Black to move/);
  assert.ok(cue.compareDocumentPosition(history)&4);assert.equal(number,null);
});

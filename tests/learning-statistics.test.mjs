import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProgress, recordPuzzle, recordRunStats} from '../lib/learning/progress.js';
import {puzzleStatistics, solveStatistics, runStatistics, formatDuration} from '../lib/learning/statistics.js';
import {THEME_NAMES} from '../lib/learning/content.js';

const puzzles=[{id:'a',themes:['fork','pin','fork']},{id:'b',themes:['mateIn1']},{id:'c',themes:['sacrifice']}];
test('statistics count clean attempts separately from mistakes, help and skips, including repeats',()=>{
  const progress=normalizeProgress(null);
  recordPuzzle(progress,'a',{completed:true});
  recordPuzzle(progress,'a',{completed:true,mistakes:4});
  recordPuzzle(progress,'a',{completed:true,assisted:true});
  recordPuzzle(progress,'a',{completed:false,skipped:true});
  recordPuzzle(progress,'a',{completed:true});
  for(let i=0;i<3;i++)recordPuzzle(progress,'b',{completed:true});
  recordPuzzle(progress,'c',{completed:true});
  recordPuzzle(progress,'no-longer-in-library',{completed:true});
  const stats=puzzleStatistics(progress,puzzles);
  assert.equal(stats.attempts,9);assert.equal(stats.clean,6);assert.equal(stats.needsWork,3);
  assert.equal(stats.rate,6/9);
  const fork=stats.types.find(type=>type.theme==='fork');
  assert.deepEqual(fork,{theme:'fork',name:'Forks',attempts:5,clean:2,needsWork:3,rate:.4});
  assert.equal(stats.types.find(type=>type.theme==='pin').attempts,5,'multi-theme puzzles count once per type');
  assert.equal(stats.weakest.theme,'fork');assert.equal(stats.strongest.theme,'mateIn1');
  assert.deepEqual(stats.types.filter(type=>type.rate!==null).map(type=>type.theme),['mateIn1','sacrifice','fork','pin']);
  assert.equal(stats.types.at(-1).rate,null);
});

test('statistics have honest empty and small-sample states and do not invent opposing patterns for ties',()=>{
  const progress=normalizeProgress(null),empty=puzzleStatistics(progress,puzzles);
  assert.equal(empty.rate,null);assert.equal(empty.types.length,Object.keys(THEME_NAMES).length);
  assert.equal(empty.weakest,null);assert.equal(empty.strongest,null);
  recordPuzzle(progress,'a',{completed:false,skipped:true});
  recordPuzzle(progress,'b',{completed:true});
  let stats=puzzleStatistics(progress,puzzles);
  assert.equal(stats.weakest,null);assert.equal(stats.strongest,null);
  for(let i=0;i<2;i++)recordPuzzle(progress,'a',{completed:false,skipped:true});
  stats=puzzleStatistics(progress,puzzles);
  assert.equal(stats.weakest.theme,'fork');assert.equal(stats.strongest,null);
  for(let i=0;i<3;i++)recordPuzzle(progress,'a',{completed:true});
  for(let i=0;i<2;i++)recordPuzzle(progress,'b',{completed:false,skipped:true});
  recordPuzzle(progress,'b',{completed:true});
  stats=puzzleStatistics(progress,puzzles);
  assert.equal(stats.weakest.rate,.5);assert.equal(stats.strongest,null);
});

const runOf=(mode,solved,missed,extra={})=>({mode,solved,at:1,...extra,
  results:[...Array.from({length:solved},(_,i)=>({id:'s'+i,correct:true,rating:800+i*100})),...Array.from({length:missed},(_,i)=>({id:'m'+i,correct:false,rating:600}))]});
test('run totals are seeded once from saved history, then kept independently of the 100-run log',()=>{
  const seeded=normalizeProgress({schema:1,challenges:[runOf('timeAttack',5,3),runOf('knockout',4,1),runOf('timeAttack',0,0),{duration:180,solved:9}]});
  assert.deepEqual(seeded.runStats.timeAttack,{runs:1,solved:5,attempted:8,topRating:1200,timeMs:0},'Empty runs and old timed challenges do not count');
  assert.deepEqual(seeded.runStats.knockout,{runs:1,solved:4,attempted:5,topRating:1100,timeMs:0});
  const kept=normalizeProgress({schema:1,challenges:[runOf('knockout',9,1)],runStats:{knockout:{runs:150,solved:900,attempted:1050,topRating:2100,timeMs:42}}});
  assert.equal(kept.runStats.knockout.runs,150,'Saved totals are not recomputed from the trimmed log');
  assert.deepEqual(kept.runStats.timeAttack,{runs:0,solved:0,attempted:0,topRating:0,timeMs:0});
  const invalid=normalizeProgress({schema:1,runStats:{timeAttack:{runs:-1,solved:99,attempted:3,topRating:'x',timeMs:NaN}}});
  assert.deepEqual(invalid.runStats.timeAttack,{runs:0,solved:3,attempted:3,topRating:0,timeMs:0});
  const fresh=normalizeProgress(null);recordRunStats(fresh,'knockout',runOf('knockout',2,1));
  assert.deepEqual(fresh.runStats.knockout,{runs:1,solved:2,attempted:3,topRating:900,timeMs:0});
});

test('mode statistics derive averages, accuracy, recent runs and Solve a puzzle time',()=>{
  const progress=normalizeProgress({schema:1,bests:{timeAttack:12},puzzleTimeMs:100000,
    challenges:[...Array.from({length:12},(_,i)=>runOf('timeAttack',i+1,3,{at:i})),runOf('knockout',7,1)]});
  progress.runStats.timeAttack.timeMs=60000;progress.runStats.knockout.timeMs=10000;
  const time=runStatistics(progress,'timeAttack');
  assert.equal(time.runs,12);assert.equal(time.best,12);assert.equal(time.average,6.5);
  assert.equal(time.rate,78/(78+36));assert.equal(time.timePerRun,5000);
  assert.deepEqual(time.recent.map(run=>run.solved),[3,4,5,6,7,8,9,10,11,12],'The last ten runs, oldest first');
  assert.equal(runStatistics(progress,'knockout').best,0,'Only full-library runs set a personal best');
  const solve=solveStatistics(progress,puzzles);
  assert.equal(solve.timeMs,30000,'Run time is excluded');assert.equal(solve.timePerAttempt,null);
  assert.equal(solve.peak,1200);
  assert.equal(formatDuration(3723000),'1h 2m 3s');assert.equal(formatDuration(61000),'1m 1s');assert.equal(formatDuration(-5),'0s');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as zlib from 'node:zlib';
import { candidate, legalMainline, Reservoir, selectGames, frameHeader, ratingBand } from '../tools/calibration/recent-dataset.mjs';
import { SearchCache } from '../tools/calibration/sqlite-cache.mjs';
import { searchKey } from '../tools/calibration/analyze-games.mjs';
import { Engine, engineConfig } from '../tools/calibration/engine.mjs';
import { assertDisjoint } from '../tools/calibration/core.mjs';
import { schedule, planIds, makeReport, normalizeBenchmark } from '../tools/calibration/supervisor.mjs';
import { buildDevelopment, balancedPrefix, loadExperimentalModel } from '../tools/calibration/development.mjs';
import { spawn } from 'node:child_process';
import { hash, save } from '../tools/calibration/io.mjs';

const body = '1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8 5. Nf3 Nf6 6. Ng1 Ng8 7. Nf3 Nf6 8. Ng1 Ng8 9. Nf3 Nf6 10. Ng1 Ng8 1/2-1/2';
const pgn = (id = 'abcdefgh', white = 'w', black = 'b', rating = 1600) => `[Event "Rated Blitz game"]\n[Site "https://lichess.org/${id}"]\n[White "${white}"]\n[Black "${black}"]\n[WhiteElo "${rating}"]\n[BlackElo "${rating}"]\n[TimeControl "180+2"]\n[Result "1/2-1/2"]\n\n${body}`;
test('recent importer excludes invalid provenance and discards supplied evaluations/NAG/variations', () => {
  assert.equal(legalMainline(pgn()).length, 20);
  assert.deepEqual(legalMainline(pgn().replace('Nf3', 'Nf3 { [%eval 20] supplied classification } $3 (1. e4 e5)')), legalMainline(pgn()));
  for (const bad of [pgn().replace('Rated Blitz', 'Casual Blitz'), pgn() + '\n[WhiteTitle "BOT"]', pgn().replace('1600', '1600?'), pgn().replace('180+2', '600+0'), pgn().replace('[White "w"]', '[White "b"]'), pgn() + '\n[Termination "Abandoned"]']) assert.equal(candidate(bad, 'seed'), null);
  assert.throws(() => legalMainline(pgn().replace('Nf3', 'Qa9')));
  assert.throws(() => legalMainline(pgn() + ' {unclosed'));
  assert.equal(ratingBand(3300), 4);
});
test('bounded frame finder, reservoir and exact focal splits preserve unique games and players', () => {
  const compressed = zlib.zstdCompressSync(Buffer.from(pgn())), header = Buffer.alloc(12);
  header.writeUInt32LE(0x184d2a50); header.writeUInt32LE(4, 4); header.writeUInt32LE(compressed.length, 8);
  assert.deepEqual(frameHeader(Buffer.concat([Buffer.alloc(37), header, compressed])), { offset: 37, size: 12 + compressed.length });
  assert.throws(() => frameHeader(Buffer.alloc(100)));
  const reservoirs = Array.from({length:5}, () => new Reservoir(40));
  for (let b = 0; b < 5; b++) for (let i = 0; i < 30; i++) {
    const id = String(b * 100 + i).padStart(8, '0');
    reservoirs[b].add(candidate(pgn(id, `w${id}`, `b${id}`, 800 + 400 * b), 'seed'));
  }
  const { games } = selectGames(reservoirs, 100, 'seed');
  assert.equal(games.filter(g => g.split === 'train').length, 70);
  assert.equal(games.filter(g => g.split === 'validation').length, 15);
  assert.equal(games.filter(g => g.split === 'test').length, 15);
  assert.equal(new Set(games.flatMap(g => g.players.map(p => p.id))).size, 200);
  assertDisjoint(games); assert.throws(() => assertDisjoint([games[0], games[0]]));
});
test('SQLite cache resumes, enforces search compatibility and rejects corrupt payloads', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'overnight-cache-')), file = path.join(dir, 'eval.sqlite');
  try {
    const key = searchKey('config', [], null), cache = new SearchCache(file, 'config');
    cache.set(key, { key, history: [], played: null, score: { wdl: [0,1000,0] }, bestmove: 'e2e4' });
    cache.complete('game'); cache.close();
    const resumed = new SearchCache(file, 'config'); assert.equal(resumed.completed('game'), true); assert.equal(resumed.get(key).bestmove, 'e2e4');
    resumed.db.prepare('UPDATE searches SET payload=?').run('{"key":"bad"}'); assert.throws(() => resumed.get(key)); resumed.close();
    assert.throws(() => new SearchCache(file, 'different'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('exact SF19 network/search adapter agrees across independent workers and resets', async () => {
  const file = 'engine/stockfish-19-lite-single.js', config = await engineConfig(file, {kind:'nodes',value:20000});
  assert.equal(config.network, 'nn-61e7af4bb97d.nnue');
  const engines = [new Engine(file), new Engine(file)];
  try {
    const identities = await Promise.all(engines.map(e => e.init(config))); assert.match(identities[0].identity, /^Stockfish 19/);
    for (const history of [[], ['e2e4','e7e5','g1f3','b8c6'], ['g1f3','g8f6','f3g1','f6g8']]) {
      const [a,b] = await Promise.all(engines.map(e => e.search(history, null, config.budget)));
      for (const k of ['score','bestmove','nodes','depth','pv']) assert.deepEqual(a[k], b[k]);
      const again = await engines[0].search(history, null, config.budget); assert.deepEqual(a.score, again.score); assert.equal(a.nodes, again.nodes);
    }
    const restricted = await engines[0].search([], 'a2a3', config.budget); assert.equal(restricted.bestmove, 'a2a3'); assert.equal(restricted.score.wdl.reduce((a,b)=>a+b), 1000);
  } finally { engines.forEach(e=>e.close()); }
});
test('supervisor reserves reporting time, never plans final-test games, and balances probes', () => {
  const deadline='2026-10-01T09:00:00+02:00', end=Date.parse(deadline);
  assert.equal(schedule(deadline,end-35*60000).canStart,false);
  assert.equal(schedule(deadline,end-45*60000).canStart,true);
  assert.equal(Date.parse(schedule(deadline).computeStop),end-30*60000);
  assert.throws(()=>schedule('invalid'));
  const games=[];
  for(const split of ['train','validation','test'])for(let i=0;i<100;i++)games.push({id:`${split}${i}`,split,band:i%5,moves:Array(i+20).fill('e2e4'),players:[{id:`w${split}${i}`},{id:`b${split}${i}`}]});
  const plan=planIds(games);
  assert.equal(plan.validationIds.length,100);assert.equal(plan.developmentIds.length,200);
  assert.ok(Object.values(plan).flat().every(id=>!id.startsWith('test')));assert.equal(plan.deepIds.length,5);
});
test('development selection excludes holdout targets and uses balanced training-game prefixes', () => {
  const rows=[];
  for(const split of ['train','validation','test'])for(let i=0;i<50;i++)for(const color of ['w','b'])rows.push({gameId:`${split}${i}`,playerId:`${split}${i}${color}`,color,split,band:i%5,plies:60,decisions:30,ratingTarget:800+400*(i%5),meanLoss:.02+i/1000,rmsLoss:.05+i/500,majorLossRate:i/200,topRate:.8-i/100,accuracyMean:95,accuracyRms:90,negativeResiduals:0});
  rows.forEach(r=>{r.moves=[];});
  const features={binding:{engineConfig:{version:'fake'}},rows};
  const a=buildDevelopment(features);
  const b=buildDevelopment({...features,rows:rows.map(r=>r.split==='test'?{...r,ratingTarget:10000,meanLoss:1}:r)});
  assert.deepEqual(a,b);assert.equal(a.finalTestEvaluated,false);assert.equal(a.trainingGames,50);
  assert.equal(balancedPrefix(rows.filter(r=>r.split==='train'),25).length,50);
  assert.deepEqual(a.learningCurves[0].focalBandGames,[5,5,5,5,5]);
  assert.equal(buildDevelopment(features,{fixedValidationIds:['missing']}).status,'inconclusive');
  assert.equal(loadExperimentalModel(a,{version:'fake'}),a.selected);
  assert.throws(()=>loadExperimentalModel(a,{version:'different'}));
  assert.throws(()=>loadExperimentalModel({...a,selected:{featureNames:['ratingTarget']}},{version:'fake'}));
});
test('real evaluation deadline exits with a resumable partial cache and no completed game', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'overnight-deadline-')),dataset=path.join(dir,'dataset'),out=path.join(dir,'run');
  try{
    await mkdir(dataset);const data=JSON.stringify({id:'deadline',split:'train',moves:legalMainline(pgn()),players:[{id:'w',color:'w',rating:1500},{id:'b',color:'b',rating:1600}]})+'\n';
    await writeFile(path.join(dataset,'games.jsonl'),data);await writeFile(path.join(dataset,'manifest.json'),JSON.stringify({gamesSha256:hash(data)}));
    const child=spawn(process.execPath,['tools/calibration/analyze-games.mjs','--dataset',dataset,'--out',out,'--nodes','320000','--workers','1','--sqlite','--development-only','--deadline',new Date(Date.now()+100).toISOString()],{windowsHide:true,stdio:'pipe'});
    let stderr='';child.stderr.on('data',d=>{stderr+=d;});child.stdout.resume();
    const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
    assert.equal(code,0,stderr);const manifest=JSON.parse(await readFile(path.join(out,'manifest.json'),'utf8'));
    const cache=new SearchCache(path.join(out,'evaluations.sqlite'),manifest.binding.configHash);assert.equal(cache.completed('deadline'),false);cache.close();
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('supervisor produces honest partial report when engines have no completed data', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'overnight-report-'));
  try{const report=await makeReport(dir,{phase:'failed',...schedule('2026-10-01T09:00:00+02:00')});
    assert.equal(report.finalTest.evaluated,false);assert.equal(report.runs.sf19.completedGames,0);
    assert.match(await readFile(path.join(dir,'report.md'),'utf8'),/Inconclusive/);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('concurrent progress writes atomically replace complete JSON without sharing temporary files', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'overnight-progress-')),file=path.join(dir,'progress.json');
  try{await Promise.all(Array.from({length:25},(_,i)=>save(file,{i,text:'complete'.repeat(1000)})));
    const result=JSON.parse(await readFile(file,'utf8'));assert.ok(result.i>=0&&result.i<25);assert.equal(result.text.length,8000);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('resumed benchmarks count newly completed games and cache-only runs have no projections', () => {
  const corrected=normalizeBenchmark({games:300,newCompleted:100,elapsedSeconds:600,gamesPerHour:1800});
  assert.equal(corrected.gamesPerHour,600);assert.equal(corrected.originalGamesPerHour,1800);assert.equal(corrected.projectedHours[2000],2000/600);
  assert.equal(normalizeBenchmark({games:300,newCompleted:0,elapsedSeconds:1}).projectedHours,null);
});
test('stability report pairs every deeper probe with its explicit shallow baseline', async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),'overnight-paired-'));
  const rows=Array.from({length:15},(_,i)=>({gameId:'probe'+i,color:'w',split:'train',ratingTarget:1600,decisions:30,meanLoss:.05,rmsLoss:.1,majorLossRate:.1,topRate:.5,accuracyMean:95,accuracyRms:90,negativeResiduals:0}));
  const binding={datasetSha256:'same',engineConfig:{version:'fixture'}};
  try {
    await save(path.join(dir,'sf18-20k','features.json'),{binding,rows:rows.slice(0,1)});
    await save(path.join(dir,'sf18-probe20k','features.json'),{binding,rows});
    await save(path.join(dir,'sf18-80k','features.json'),{binding,rows:rows.map(r=>({...r,accuracyRms:89}))});
    const report=await makeReport(dir,{phase:'partial',...schedule('2026-10-01T09:00:00+02:00')});
    assert.equal(report.runs.sf18.stability80k.games,15);assert.equal(report.runs.sf18.stability80k.rmsMeanAbsoluteChange,1);assert.equal(report.runs.sf18.stability80k.baseRun,'sf18-probe20k');
  }finally{await rm(dir,{recursive:true,force:true});}
});

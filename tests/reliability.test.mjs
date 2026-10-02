import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, branch, deferred, settle, fakeEngine } from './helpers/app.mjs';

function quiet(a) {
  for (const name of ['paintBoard','renderEvalBar','renderMoves','renderPlayers','renderControls',
    'renderReview','renderStats','renderEngineCurrent','renderBestArrow','renderGraph','renderLibrary']) a.replace(name,()=>{});
}

test('cached navigation invalidates a pending live result', async t=>{
  const a=app(t);loadGame(a,'1. e4 e5');const v=branch(a);quiet(a);
  v.positions[2].best=null;v.positions[2].eval=null;
  const result=deferred();a.state.liveEngine=fakeEngine(()=>result.promise);
  const pending=a.call('requestLiveEval');await settle();
  const token=a.state.liveToken;v.idx=1;
  await a.call('requestLiveEval');assert.ok(a.state.liveToken>token);
  result.resolve({score:{cp:999},bestmove:'g1f3',lines:[]});await pending;
  assert.equal(v.positions[2].eval,null);assert.equal(v.positions[2].best,null);
});

test('concurrent engine initialization shares one worker, and reset disposes stale startup',async t=>{
  const a=app(t);const started=deferred();let count=0;
  a.replace('createEngine',()=>{count++;return started.promise;});
  const first=a.call('ensureLiveEngine'),second=a.call('ensureLiveEngine');
  const results=Promise.allSettled([first,second]);
  assert.equal(count,1);a.call('resetLiveEngine');
  const eng=fakeEngine();started.resolve(eng);
  assert.ok((await results).every(r=>r.status==='rejected'));
  assert.equal(eng.dead,true);assert.equal(a.state.liveEngine,null);
});

test('live startup errors are recoverable and Retry evaluates the position',async t=>{
  const a=app(t);loadGame(a,'1. e4');const v=branch(a);quiet(a);
  v.positions[1].eval=null;v.positions[1].best=null;
  a.replace('createEngine',async()=>{throw Error('cannot start');});
  await a.call('requestLiveEval');assert.match(a.state.liveError,/Stockfish/);
  a.replace('createEngine',async()=>fakeEngine());
  await a.call('requestLiveEval');assert.equal(a.state.liveError,null);
  assert.ok(v.positions[1].eval);assert.ok(v.positions[1].classif);
});

test('a failed batch never saves gaps, and Retry can complete',async t=>{
  const a=app(t);const S=loadGame(a,'1. e4 e5');quiet(a);S.settings.engineWorkers=1;
  let saved=0;a.replace('saveToLibrary',()=>{saved++;});
  a.replace('createEngine',async()=>fakeEngine(async()=>{throw Error('worker crash');}));
  await a.call('startAnalysis');assert.equal(saved,0);assert.equal(S.analyzing,false);assert.ok(S.analysisError);
  a.replace('createEngine',async()=>fakeEngine());
  await a.call('startAnalysis');assert.equal(saved,1);assert.equal(S.analysisError,null);
  assert.equal(S.progress,S.total);assert.equal(S.completed,S.total);assert.ok(S.evals.every(Boolean));
});

test('partial startup failure terminates the successfully started workers',async t=>{
  const a=app(t);loadGame(a,'1. e4');quiet(a);a.state.settings.engineWorkers=2;
  const good=fakeEngine();let count=0;
  a.replace('createEngine',async()=>{if(count++===0)return good;throw Error('second failed');});
  await a.call('startAnalysis');assert.equal(good.dead,true);assert.equal(a.state.analyzing,false);assert.ok(a.state.analysisError);
});

test('superseded batch startup cannot overwrite or terminate the newer batch',async t=>{
  const a=app(t);const S=loadGame(a,'1. e4');quiet(a);S.settings.engineWorkers=1;
  let saved=0;a.replace('saveToLibrary',()=>saved++);
  const oldStart=deferred(),newStart=deferred(),search=deferred();let calls=0;
  a.replace('createEngine',()=>calls++===0?oldStart.promise:newStart.promise);
  const oldRun=a.call('startAnalysis'),newRun=a.call('startAnalysis');
  const current=fakeEngine(()=>search.promise);newStart.resolve(current);await settle();
  const obsolete=fakeEngine();oldStart.resolve(obsolete);await oldRun;
  assert.equal(obsolete.dead,true);assert.equal(current.dead,false);assert.equal(S.evalEngines[0],current);
  search.resolve({score:{cp:0},bestmove:'e2e4',lines:[]});await newRun;assert.equal(saved,1);
});

test('progress counts out-of-order results but navigation only exposes a contiguous prefix',async t=>{
  const a=app(t);const S=loadGame(a,'1. e4 e5');quiet(a);S.settings.engineWorkers=2;
  const start=deferred(),move1=deferred(),move2=deferred();
  const pendingByFen=new Map(S.positions.map((p,i)=>[p.fen,[start,move1,move2][i]]));
  a.replace('createEngine',async()=>fakeEngine(fen=>pendingByFen.get(fen).promise));
  a.replace('saveToLibrary',()=>{});const run=a.call('startAnalysis');await settle();
  const res={score:{cp:0},bestmove:'e2e4',lines:[]};
  move1.resolve(res);await settle();assert.equal(S.completed,1);assert.equal(S.progress,0);
  move2.resolve(res);await settle();assert.equal(S.completed,2);assert.equal(S.progress,0);
  start.resolve(res);await run;assert.equal(S.progress,2);assert.equal(S.completed,2);
});

test('cache restore requires complete data for the same game and engine settings',t=>{
  const a=app(t);const S=loadGame(a,'1. e4');
  S.bests[0].playedScore={cp:0};
  S.bests[0].calibration={version:a.run('CALIB.version')};
  const saved={pgn:S.pgn,settingsKey:a.call('analysisSettingsKey'),bests:S.bests,evals:S.evals};
  assert.equal(a.call('canRestoreAnalysis',saved),true);
  assert.equal(a.call('canRestoreAnalysis',{...saved,pgn:'1. d4'}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,evals:[{cp:0},null]}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,bests:[{},null]}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,engineBuild:'wasm'}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,engineBuild:'sf19'}),false);
  S.settings.enginePath='sf19lite';assert.equal(a.call('canRestoreAnalysis',saved),false);
});

test('removed engines migrate safely and full SF19 cached analysis is invalidated', t => {
  const a = app(t); const S = loadGame(a, '1. e4');
  S.settings.enginePath = 'sf19';
  const saved = { pgn:S.pgn, settingsKey:a.call('analysisSettingsKey'), bests:S.bests, evals:S.evals };
  a.call('migrateEngineSettings', S.settings);
  assert.equal(S.settings.enginePath, 'sf19lite');
  assert.equal(a.call('canRestoreAnalysis', saved), false);
  for (const old of ['wasm', 'asm', 'unknown', undefined]) {
    S.settings.enginePath = old; a.call('migrateEngineSettings', S.settings);
    assert.equal(S.settings.enginePath, 'nnue');
  }
  S.settings.enginePath = 'sf19lite'; a.call('migrateEngineSettings', S.settings);
  assert.equal(S.settings.enginePath, 'sf19lite');
});

for (const preferred of ['nnue', 'sf19lite']) {
  test(`${preferred} falls back to the other bundled engine on startup failure`, async t => {
    const a = app(t); a.state.settings.enginePath = preferred;
    const paths = [], engines = [];
    a.context.Engine = class {
      constructor(path) { paths.push(path); engines.push(this); }
      async setOptions() { if (engines[0] === this) throw Error('Unsupported build'); }
      terminate() { this.dead = true; }
    };
    a.replace('setActiveEngineBuild', () => {});
    const eng = await a.call('createEngine');
    assert.equal(eng.buildKey, preferred === 'nnue' ? 'sf19lite' : 'nnue');
    assert.equal(engines[0].dead, true);
    assert.equal(paths.length, 2);
    assert.notEqual(paths[0], paths[1]);
    assert.equal(a.state.engineFallbackBuild, eng.buildKey);
  });
}

test('Incomplete analyses are never saved as finished games',t=>{
  const a=app(t);const S=loadGame(a,'1. e4');quiet(a);
  S.meta={};S.evals[1]=null;a.call('saveToLibrary');assert.equal(a.writes.length,0);
});

test('batch review sends full move prefixes and refuses FEN-only saved analyses',async t=>{
  const a=app(t),S=loadGame(a,'1. Nf3 Nf6 2. Ng1 Ng8');quiet(a);
  const calls=[];S.settings.engineWorkers=1;a.replace('saveToLibrary',()=>{});
  a.replace('createEngine',async()=>fakeEngine(async(fen,depth,lines,history)=>{
    calls.push({fen,history});return {score:{cp:0},bestmove:'g1f3',lines:[]};
  }));
  await a.call('startAnalysis');
  assert.deepEqual(Array.from(calls.at(-1).history.moves),['g1f3','g8f6','f3g1','f6g8']);
  assert.equal(calls.at(-1).history.initialFen,S.positions[0].fen);
  const settingsKey=JSON.stringify([S.settings.enginePath,S.settings.engineDepth,S.settings.classifyLines,S.settings.engineHash,S.settings.engineSkill]);
  assert.equal(a.call('canRestoreAnalysis',{pgn:S.pgn,settingsKey,bests:S.bests,evals:S.evals}),false);
});

test('Variation searches prepend mainline context and use the selected branch instead of future moves',async t=>{
  const a=app(t),S=loadGame(a,'1. e4 e5 2. Nf3');quiet(a);
  const v=branch(a,1);v.positions=a.call('buildPositions',`[SetUp "1"]\n[FEN "${S.positions[1].fen}"]\n\n1... c5`);
  v.idx=1;v.positions.forEach(p=>{p.eval=null;p.best=null;});
  const calls=[];S.liveEngine=fakeEngine(async(fen,depth,lines,history)=>{
    calls.push({fen,history});return {score:{cp:0},bestmove:'g1f3',lines:[]};
  });
  await a.call('requestLiveEval');
  const current=calls.find(c=>c.fen===v.positions[1].fen);
  assert.deepEqual(Array.from(current.history.moves),['e2e4','c7c5']);
  assert.equal(current.history.initialFen,S.positions[0].fen);
});

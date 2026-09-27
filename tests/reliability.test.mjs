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

test('switching settings in Explore preserves its moves and never starts a game batch',async t=>{
  const a=app(t);const S=loadGame(a,'1. e4 e5');const v=branch(a);quiet(a);S.meta={explore:true};
  let batches=0,live=0;a.replace('startAnalysis',()=>{batches++;});a.replace('requestLiveEval',async()=>{live++;});
  await a.call('setEngineSetting','enginePath','nnue');
  assert.equal(S.variation,v);assert.equal(v.positions.length,3);assert.equal(S.settings.enginePath,'nnue');
  assert.equal(batches,0);assert.equal(live,1);assert.ok(v.positions.every(p=>p.eval===null&&p.best===null&&p.classif===null));
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
  const saved={pgn:S.pgn,settingsKey:a.call('analysisSettingsKey'),bests:S.bests,evals:S.evals};
  assert.equal(a.call('canRestoreAnalysis',saved),true);
  assert.equal(a.call('canRestoreAnalysis',{...saved,pgn:'1. d4'}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,evals:[{cp:0},null]}),false);
  assert.equal(a.call('canRestoreAnalysis',{...saved,bests:[{},null]}),false);
  S.settings.enginePath='nnue';assert.equal(a.call('canRestoreAnalysis',saved),false);
});

test('Explore and incomplete analyses are never saved as finished games',t=>{
  const a=app(t);const S=loadGame(a,'1. e4');quiet(a);
  S.meta={explore:true};a.call('saveToLibrary');assert.equal(a.writes.length,0);
  S.meta={};S.evals[1]=null;a.call('saveToLibrary');assert.equal(a.writes.length,0);
});

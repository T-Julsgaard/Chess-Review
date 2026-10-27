import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {app, loadGame, fakeEngine, deferred, settle, branch} from './helpers/app.mjs';

function candidates(fen, count) {
  return new Chess(fen).moves({verbose: true}).slice(0, count).map((move, i) => ({
    score: {cp: 40 - i * 10}, pv: move.lan, depth: 16, multipv: i + 1, bound: 'exact',
  }));
}
function review(t, design = 'minimal') {
  const a = app(t), S = loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  Object.assign(S.settings, {engineDesign: design, engineDepth: 16, engineWorkers: 1});
  S.bests.forEach((root, i) => { root.lines = candidates(S.positions[i].fen, 3); });
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.replace('schedulePanelPrecalculation', () => {});
  return a;
}
function rowCount(a) {
  return a.dom.window.document.querySelectorAll('.engine-focus-candidate, .engine-line.clickable').length;
}

for (const design of ['original', 'focus', 'minimal']) {
  test(`${design}: selecting analysis lines updates displayed lines and retains the review`, async t => {
    const a = review(t, design), S = a.state;
    S.settings.engineLines = S.settings.classifyLines === 1 ? 3 : 1;
    a.call('renderEngineCurrent');
    a.replace('scheduleReanalyze', () => { throw Error('Line changes must retain numerical analysis'); });
    const evidence = JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc, idx: S.idx});
    const settingsKey = a.call('analysisSettingsKey');
    // Also exercise selecting the existing analysis count when the panel count differs.
    for (const count of [S.settings.classifyLines, 3, 1, 2, 3]) {
      await a.call('setEngineSetting', 'classifyLines', count);
      assert.equal(rowCount(a), count);
      assert.equal(S.settings.engineLines, count);
      assert.equal(a.store.settings.engineLines, count);
      assert.equal(a.store.settings.classifyLines, count);
      assert.equal(a.call('analysisSettingsKey'), settingsKey);
      assert.equal(JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc, idx: S.idx}), evidence);
    }
    const controls = a.call('motorSettings');
    for (const key of ['engineLines', 'classifyLines']) {
      assert.deepEqual([...controls.querySelectorAll(`[data-setting="${key}"]`)].map(n => n.dataset.value), ['1', '2', '3']);
    }
  });
}

test('old four-line preferences migrate to three and survive reload', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {engineLines: 4, classifyLines: 4, engineDesign: 'focus', backgroundAnalysisVersion: 1};
  await a.start();
  for (const key of ['engineLines', 'classifyLines']) {
    assert.equal(a.state.settings[key], 3);
    assert.equal(a.store.settings[key], 3);
  }
  for (const value of [4, 99, '3', 2.7, 0, -1, NaN, Infinity]) {
    await a.call('setEngineSetting', 'engineLines', value);
    assert.ok(Number.isInteger(a.state.settings.engineLines));
    assert.ok(a.state.settings.engineLines >= 1 && a.state.settings.engineLines <= 3);
  }
});

test('reducing to one line rejects an obsolete three-line result', async t => {
  const a = review(t), S = a.state, pending = deferred();
  S.bests.forEach(root => { root.lines = root.lines.slice(0, 1); });
  const engine = fakeEngine(() => pending.promise);
  S.liveEngine = engine; a.replace('ensureLiveEngine', async () => engine);
  await a.call('setEngineSetting', 'classifyLines', 3); await settle();
  const request = S._panelRequest.promise;
  await a.call('setEngineSetting', 'classifyLines', 1);
  pending.resolve({lines: candidates(S.positions[0].fen, 3)}); await request;
  assert.equal(rowCount(a), 1);
  assert.equal(a.call('cachedPanelLines'), null);
  assert.equal(a.store.settings.engineLines, 1);
});

test('analysis-line selection updates an explored variation without clearing its evaluations', async t => {
  const a = review(t), S = a.state;
  const variation = branch(a, 0, 0), original = variation.positions[0].eval;
  await a.call('setEngineSetting', 'classifyLines', 3);
  await settle();
  assert.equal(rowCount(a), 3);
  assert.equal(S.variation, variation);
  assert.equal(variation.positions[0].eval, original);
  await a.call('setEngineSetting', 'classifyLines', 1);
  assert.equal(rowCount(a), 1);
});

for (const count of [1, 2, 3]) {
  test(`${count} analysis lines: a complete scoring run keeps numerical results available`, async t => {
    const a = review(t), S = a.state, calls = [];
    S.players.w.rating = S.players.b.rating = 1500;
    S.settings.classifyLines = count;
    const engine = {...fakeEngine(async (fen, depth, lines, history, progress, config) => {
      calls.push({lines, config});
      const line = candidates(fen, 1)[0];
      const bestmove = config.searchMove || line.pv;
      return {bestmove, score: line.score, lines: [{...line, pv: bestmove}]};
    }), buildKey: 'nnue'};
    a.replace('createEngine', async () => engine);
    a.replace('requestPanelLines', () => {});
    await a.call('startAnalysis');
    assert.equal(S.analyzing, false);
    assert.equal(S.analysisError, null);
    assert.equal(S.completed, S.total);
    assert.ok(calls.length >= S.positions.length);
    assert.ok(calls.every(call => call.lines === 1));
    assert.ok(Number.isFinite(S.acc.w)); assert.ok(Number.isFinite(S.acc.b));
    assert.ok(S.bests.slice(0, S.total).every(root => root.calibration.qualityVersion));
    assert.ok(a.call('canRestoreAnalysis', {pgn: S.pgn, settingsKey: a.call('analysisSettingsKey'), bests: S.bests, evals: S.evals}));
  });
}

test('changing candidates during a scoring run cannot change its in-flight scoring settings', async t => {
  const a = review(t), S = a.state, ready = deferred(), observed = [];
  a.replace('requestPanelLines', () => {});
  a.replace('saveToLibrary', () => {});
  a.replace('createEngine', async () => ({...fakeEngine(), buildKey: 'nnue'}));
  a.replace('analyseCalibratedPosition', async (_engine, request) => {
    observed.push(request.settings);
    if (observed.length === 1) await ready.promise;
    return {score: {cp: 20}, bestmove: 'e2e4', lines: candidates(request.fen, 1)};
  });
  const run = a.call('startAnalysis'); await settle();
  assert.equal(observed.length, 1);
  await a.call('setEngineSetting', 'classifyLines', 3);
  assert.equal(S.settings.classifyLines, 3);
  assert.ok(observed.every(settings => settings.classifyLines === 1));
  ready.resolve(); await run;
  assert.equal(S.completed, S.total);
  assert.ok(observed.every(settings => settings.classifyLines === 1));
});

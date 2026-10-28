import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, fakeEngine, deferred, settle} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';
import {analyseCalibratedPosition} from '../lib/calibrated-search.js';

function review(t) {
  const a = app(t), S = loadGame(a, '1. e4 e5 2. Nf3', [0, 0, 400, 400].map(cp => ({cp})));
  Object.assign(S.settings, {engineLines: 1, engineWorkers: 8});
  const c = a.context.__publicCalibration;
  S.players.w.rating = S.players.b.rating = 1500;
  S.activeEngineBuild = 'nnue';
  S.bests = S.positions.map((p, i) => ({
    bestmove: ['e2e4', 'c7c5', 'g1f3', 'b8c6'][i],
    score: {cp: [0, 0, 400, -400][i]}, playedScore: {cp: [0, -400, 400, -400][i]},
    lines: [], calibration: {version: c.version, build: 'nnue', qualityVersion: c.quality.candidateVersion},
  }));
  a.call('computeDerived'); a.call('buildUI'); a.call('buildBoard'); a.call('setAccuracyPage', 1);
  t.after(() => a.call('stopPanelPrecalculation'));
  return a;
}
function result(a, index, count = 2) {
  const S = a.state, legal = new Chess(S.positions[index].fen).moves({verbose: true}).map(move => move.lan);
  const bestmove = S.bests[index].bestmove;
  const moves = [bestmove, ...legal.filter(move => move !== bestmove)].slice(0, count);
  return {bestmove, score: {cp: index === 2 ? 400 : 0}, lines: moves.map((pv, rank) => ({
    pv, multipv: rank + 1, bound: 'exact', depth: S.settings.engineDepth,
    score: {cp: index === 2 && rank === 0 ? 400 : 0},
  }))};
}
function numbers(S) {
  return JSON.stringify({acc: S.acc, elo: S.accElo, moves: S.accMove, calibrated: S.calibrated, evals: S.evals,
    roots: S.bests.map(({annotationSearch, ...root}) => root)});
}
async function begin(a) { await new Promise(resolve => setTimeout(resolve, 0)); await settle(); }
function fastBackground(a) {
  a.replace('waitForBackgroundAnalysis', async job => !job.cancelled);
  a.replace('backgroundAnalysisBusy', () => false);
}

test('two lines are the default, the Engine tab explains background updates, and the old default migrates once', t => {
  const a = review(t), S = a.state;
  assert.equal(S.settings.classifyLines, 2);
  S.settingsTab = 'engine'; a.run('UI.settings.hidden = false'); a.call('renderSettings');
  const doc = a.dom.window.document;
  assert.equal(doc.querySelector('[data-setting="classifyLines"].on').dataset.value, '2');
  assert.match(doc.querySelector('#settings').textContent, /Results appear after the first line/);
  assert.doesNotMatch(doc.querySelector('#settings').textContent, /require 1 analysis line/);
  const legacy = {enginePath: 'nnue', classifyLines: 1};
  a.call('migrateEngineSettings', legacy); assert.equal(legacy.classifyLines, 2);
  legacy.classifyLines = 1; a.call('migrateEngineSettings', legacy); assert.equal(legacy.classifyLines, 1);
});

for (const count of [2, 3]) test(`the scoring pass still requests one line with ${count} annotation lines selected`, async t => {
  const a = review(t), requests = [];
  const engine = {...fakeEngine(async (...args) => {
    requests.push(args); return {score: {cp: 0}, bestmove: 'e2e4', lines: []};
  }), buildKey: 'nnue'};
  const scored = await analyseCalibratedPosition(engine, {fen: new Chess().fen(), history: {initialFen: new Chess().fen(), moves: []},
    played: 'e2e4', settings: {...a.state.settings, engineDepth: 16, classifyLines: count}, calibration: a.context.__publicCalibration});
  assert.deepEqual(requests.map(args => args[2]), [1]);
  assert.equal(scored.calibration.qualityVersion, a.context.__publicCalibration.quality.candidateVersion);
});

test('background results upgrade Best to Great, update the visible Quality tab and badge, persist, and preserve numerical scores', async t => {
  const a = review(t), S = a.state, before = numbers(S), roots = [...S.bests];
  assert.equal(S.classif[3], 'best'); S.idx = 3;
  const options = [], searches = [];
  fastBackground(a);
  assert.ok(a.dom.window.document.querySelector('[data-category="great"]'), 'Quality starts visible');
  a.replace('createEngine', async opts => {
    options.push(opts);
    return fakeEngine(async (fen, depth, count, history) => {
      const index = S.positions.findIndex(p => p.fen === fen);
      searches.push({index, depth, count, history}); return result(a, index, count);
    });
  });
  a.call('schedulePanelPrecalculation');
  assert.equal(S.classif[3], 'best');
  await begin(a); await a.run('panelWarmJob.promise');
  assert.equal(S.classif[3], 'great'); assert.equal(S.counts.w.great, 1);
  assert.equal(S.counts.w.best, 1);
  const doc = a.dom.window.document, row = doc.querySelector('.qbreak [data-category="great"]').closest('.qbreak-row');
  assert.equal(row.querySelector('.ct.left').textContent, '1');
  assert.match(doc.querySelector('.sq-badge').getAttribute('aria-label'), /Great/);
  assert.equal(numbers(S), before); assert.ok(roots.every((root, i) => root === S.bests[i]));
  assert.equal(options.length, 1); assert.equal(options[0].Threads, 1); assert.equal(options[0].Hash, 16);
  assert.equal(searches.length, S.positions.length); assert.ok(searches.every(s => s.count === 2));
  assert.deepEqual(Array.from(searches.find(s => s.index === 2).history.moves), ['e2e4', 'e7e5']);
  const saved = a.store['analysis:' + a.call('currentGameId')];
  assert.ok(saved.bests[2].annotationSearch);
  assert.equal(a.call('canRestoreAnalysis', saved), true);
  // Restore into a fresh game/position array: evidence remains history-bound and avoids new searches.
  a.call('resetLiveEngine'); S.bests = structuredClone(saved.bests); a.call('computeDerived');
  assert.equal(S.classif[3], 'great');
  a.call('schedulePanelPrecalculation'); await begin(a); await a.run('panelWarmJob.promise');
  assert.equal(searches.length, S.positions.length + 1, 'only the unannotated final position needs candidates');
});

test('analysis-line changes keep scoring evidence and results available without restarting the batch', async t => {
  const a = review(t), S = a.state, key = a.call('analysisSettingsKey'), before = numbers(S);
  let restarts = 0; a.replace('scheduleReanalyze', () => restarts++);
  a.replace('renderEngineCurrent', () => {}); a.replace('schedulePanelPrecalculation', () => {});
  for (const count of [1, 3, 2]) {
    await a.call('setEngineSetting', 'classifyLines', count);
    assert.equal(a.call('analysisSettingsKey'), key); assert.equal(numbers(S), before);
  }
  S.analyzing = true; await a.call('setEngineSetting', 'classifyLines', 3);
  assert.equal(restarts, 0); assert.equal(S.analyzing, true); assert.equal(a.store.settings.classifyLines, 3);
});

test('bounded, shallow, mixed-depth, illegal and stale alternatives cannot upgrade a category', t => {
  const a = review(t), S = a.state, key = a.call('panelContextKey', 2);
  for (const edit of [r => r.lines[1].bound = 'upperbound', r => r.lines[1].depth--,
    r => r.lines.forEach(l => l.depth--), r => r.lines[1].pv = 'd2d5', r => r.lines[1].pv = r.bestmove]) {
    const candidate = result(a, 2); edit(candidate);
    assert.equal(a.call('rememberAnnotationSearch', 2, key, 2, candidate), false);
    assert.equal(S.classif[3], 'best');
  }
  a.call('rememberAnnotationSearch', 2, key, 2, result(a, 2)); assert.equal(S.classif[3], 'great');
  S.settings.engineDepth++; a.call('computeDerived'); assert.equal(S.classif[3], 'best');
});

test('background scheduling waits, gives searches a proportional rest, and suspends for foreground activity', async t => {
  const a = review(t), S = a.state, rest = deferred(), delays = [];
  let searches = 0;
  a.replace('waitForBackgroundAnalysis', async (job, delay) => { delays.push(delay); return rest.promise; });
  a.replace('createEngine', async () => fakeEngine(async fen => { searches++; return result(a, S.positions.findIndex(p => p.fen === fen)); }));
  a.call('schedulePanelPrecalculation'); await begin(a);
  assert.equal(searches, 0); assert.equal(delays[0], 500);
  a.call('stopPanelPrecalculation'); rest.resolve(false); await settle();
  a.replace('waitForBackgroundAnalysis', async (job, delay) => {
    delays.push(delay); if (searches) { job.cancelled = true; return false; } return true;
  });
  a.call('schedulePanelPrecalculation'); await begin(a); await a.run('panelWarmJob.promise');
  assert.equal(searches, 1); assert.ok(delays.at(-1) >= 250);
  for (const field of ['analysisMode', 'bestWalking', 'lineWalking']) {
    S[field] = true; assert.equal(a.call('backgroundAnalysisBusy'), true); S[field] = false;
  }
  Object.defineProperty(a.dom.window.document, 'hidden', {configurable: true, value: true});
  assert.equal(a.call('backgroundAnalysisBusy'), true);
});

test('navigation interrupts a running background search and its partial result cannot change categories', async t => {
  const a = review(t), S = a.state, ready = deferred(), stopped = deferred();
  let stops = 0, searches = 0; S.idx = 2;
  const engine = fakeEngine(async () => { searches++; return ready.promise; });
  engine.stop = () => { stops++; };
  a.replace('createEngine', async () => engine);
  a.replace('waitForBackgroundAnalysis', async () => searches ? stopped.promise : true);
  a.call('schedulePanelPrecalculation'); await begin(a);
  assert.equal(searches, 1);
  a.dom.window.document.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', {key: 'Shift', bubbles: true}));
  assert.equal(stops, 1); assert.equal(a.call('backgroundAnalysisBusy'), true);
  ready.resolve(result(a, 2)); await settle();
  assert.equal(S.bests[2].annotationSearch, undefined); assert.equal(S.classif[3], 'best');
  a.call('stopPanelPrecalculation'); stopped.resolve(false);
});

test('hidden reviews do not start a worker; searches resume once visible and rest for three times their duration', async t => {
  const a = review(t), S = a.state, visible = deferred(), resting = deferred();
  let workers = 0, searches = 0, waits = 0;
  Object.defineProperty(a.dom.window.document, 'hidden', {configurable: true, value: true});
  a.context.__backgroundClock = 1000;
  a.run('Date.now = () => __backgroundClock');
  a.replace('createEngine', async () => {
    workers++;
    return fakeEngine(async fen => { searches++; a.context.__backgroundClock += 200; return result(a, S.positions.findIndex(p => p.fen === fen)); });
  });
  a.replace('waitForBackgroundAnalysis', async (job, delay) => {
    if (++waits === 1) return true;
    if (waits === 2) return visible.promise;
    assert.equal(delay, 600, 'a 200 ms search must rest for 600 ms');
    return resting.promise;
  });
  a.call('schedulePanelPrecalculation'); await begin(a);
  assert.equal(workers, 0); assert.equal(searches, 0);
  Object.defineProperty(a.dom.window.document, 'hidden', {configurable: true, value: false});
  visible.resolve(true); await settle();
  assert.equal(workers, 1); assert.equal(searches, 1);
  a.call('stopPanelPrecalculation'); resting.resolve(false);
});

test('switching games or restarting analysis discards pending background results', async t => {
  const a = review(t), S = a.state, ready = deferred(); S.idx = 2;
  fastBackground(a); const engine = fakeEngine(() => ready.promise);
  a.replace('createEngine', async () => engine);
  a.call('schedulePanelPrecalculation'); await begin(a); const pending = a.run('panelWarmJob.promise');
  a.call('resetLiveEngine'); const original = S.bests[2], stale = result(a, 2);
  loadGame(a, '1. d4 d5'); ready.resolve(stale); await pending;
  assert.equal(original.annotationSearch, undefined); assert.equal(engine.dead, true);
  assert.equal(a.run('panelLineCache.size'), 0);
});

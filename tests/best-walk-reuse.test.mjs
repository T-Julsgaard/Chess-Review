import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, branch, deferred, fakeEngine, settle} from './helpers/app.mjs';

function review(t, pgn = '1. e4 e5 2. Nf3 Nc6') {
  const a = app(t), S = loadGame(a, pgn);
  S.bests = S.positions.map((p, i) => {
    const next = S.positions[i + 1], bestmove = next ? next.from + next.to : 'f1b5';
    return {bestmove, score: {cp: 20}, lines: [{score: {cp: 20}, pv: bestmove}]};
  });
  a.call('computeDerived'); a.call('buildUI');
  a.replace('requestPanelLines', () => {});
  return a;
}

for (const design of ['original', 'focus', 'minimal']) {
  test(`${design}: best-move playback immediately reuses reviewed positions and cached alternatives`, async t => {
    t.mock.timers.enable({apis: ['setTimeout']});
    const a = review(t), S = a.state, doc = a.dom.window.document;
    Object.assign(S.settings, {engineDesign: design, engineLines: 3});
    for (let i = 0; i < S.positions.length; i++) {
      const lines = [S.bests[i].lines[0], ...['d2d4', 'g1f3'].map(pv => ({score: {cp: 10}, pv}))];
      a.call('rememberPanelLines', i, a.call('panelContextKey', i), 3, lines);
    }
    const saved = JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc});
    a.replace('ensureLiveEngine', () => { throw Error('All displayed positions already have analysis'); });
    const walk = a.call('playBestMoves');
    for (let step = 0; step < 3; step++) {
      await settle();
      assert.equal(S.variation.idx, step);
      assert.doesNotMatch(doc.querySelector('.engine-body').textContent, /Analyzing|Finding another/);
      assert.equal(doc.querySelectorAll('.engine-focus-candidate, .engine-line.clickable').length, 3);
      if (step === 2) a.call('stopBestWalk');
      t.mock.timers.tick(850);
    }
    await walk;
    assert.equal(S.variation.idx, 2);
    assert.equal(S.liveError, null);
    assert.equal(JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc}), saved);
  });
}

test('known best lines remain visible while missing alternatives are searched only once', async t => {
  const a = review(t), S = a.state, pending = deferred(), searches = [];
  Object.assign(S.settings, {engineDesign: 'minimal', engineLines: 3});
  branch(a, 0, 0);
  a.replace('ensureLiveEngine', async () => fakeEngine(async (...args) => { searches.push(args); return pending.promise; }));
  const request = a.call('requestLiveEval'); await settle();
  const body = a.dom.window.document.querySelector('.engine-body');
  assert.equal(body.querySelectorAll('.engine-focus-candidate').length, 1);
  assert.equal(body.querySelectorAll('.engine-focus-pending').length, 2);
  assert.match(body.textContent, /Finding another line/); assert.doesNotMatch(body.textContent, /Analyzing/);
  assert.equal(searches.length, 1); assert.equal(searches[0][2], 3);
  const result = {score: {cp: 30}, bestmove: 'e2e4', lines: [S.bests[0].lines[0]]};
  pending.resolve(result); await request; await a.call('requestLiveEval');
  assert.equal(searches.length, 1, 'fewer legal candidates than requested must not cause repeated searches');
  assert.doesNotMatch(a.dom.window.document.querySelector('.engine-body').textContent, /Finding another line/);
});

test('reopening an explored alternative reuses its own completed search', async t => {
  const a = review(t), S = a.state;
  let searches = 0, pending;
  const request = a.run('requestLiveEval');
  a.replace('requestLiveEval', () => pending = request());
  a.replace('ensureLiveEngine', async () => fakeEngine(async () => {
    searches++;
    return {score: {cp: -15}, bestmove: 'd7d5', lines: [{score: {cp: -15}, pv: 'd7d5 c2c4'}]};
  }));
  a.call('playLine', 'd2d4 d7d5'); await pending;
  assert.equal(searches, 1);
  a.call('exitAnalysis', 0);
  a.call('playLine', 'd2d4 d7d5'); await pending;
  assert.equal(searches, 1); assert.equal(S.variation.positions[1].best.bestmove, 'd7d5');
  assert.equal(S.variation.positions[1].eval.cp, 15);
});

test('a PV continuation still needs its own search when that position has never been analyzed', async t => {
  const a = review(t), S = a.state, searches = [];
  S.bests[0].lines[0].pv = 'd2d4 d7d5 c2c4';
  let pending;
  const request = a.run('requestLiveEval');
  a.replace('requestLiveEval', () => pending = request());
  a.replace('ensureLiveEngine', async () => fakeEngine(async (fen, depth, count, history) => {
    searches.push(Array.from(history.moves));
    return {score: {cp: 10}, bestmove: 'd7d5', lines: [{score: {cp: 10}, pv: 'd7d5'}]};
  }));
  a.call('playLine', S.bests[0].lines[0].pv); await pending;
  assert.deepEqual(searches, [['d2d4']]);
});

test('reuse requires matching move history, current engine settings and a live cache', async t => {
  const a = review(t, '1. Nf3 Nf6 2. Nc3 Nc6'), S = a.state;
  const v = branch(a, 0, 4);
  const alternative = a.call('buildPositions', '1. Nc3 Nc6 2. Nf3 Nf6');
  assert.equal(alternative[4].fen, S.positions[4].fen);
  v.positions = alternative.map(p => ({...p, best: null, eval: null}));
  a.call('reuseVariationAnalysis', v, 4);
  assert.equal(v.positions[4].best, null, 'transpositions cannot borrow different repetition history');
  const key = a.call('variationContextKey', v, 4);
  const lines = [{score: {cp: 33}, pv: 'e2e4'}];
  a.call('rememberPanelLines', 4, key, 1, lines, v.positions[4].fen);
  a.call('reuseVariationAnalysis', v, 4); assert.equal(v.positions[4].best.bestmove, 'e2e4');
  v.positions[4].best = null; v.positions[4].eval = null;
  S.settings.engineDepth++;
  a.call('reuseVariationAnalysis', v, 4); assert.equal(v.positions[4].best, null);
  S.settings.engineDepth--;
  a.call('resetLiveEngine');
  a.call('reuseVariationAnalysis', v, 4); assert.equal(v.positions[4].best, null);
});

test('review scores requiring fresh panel settings are not reused as live analysis', async t => {
  const a = review(t), S = a.state;
  S._panelNeedsLive = true;
  const v = branch(a, 0, 0);
  a.call('reuseVariationAnalysis', v, 0);
  assert.equal(v.positions[0].best, null); assert.equal(v.positions[0].eval, null);
});

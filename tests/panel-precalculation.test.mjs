import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, fakeEngine, deferred, settle} from './helpers/app.mjs';
import {Chess} from '../lib/chess.js';

function review(t, pgn = '1. e4 e5 2. Nf3 Nc6') {
  const a = app(t);
  loadGame(a, pgn); a.call('computeDerived'); a.call('buildUI');
  Object.assign(a.state.settings, {engineDesign: 'minimal', engineLines: 2});
  // Scheduling/duty-cycle behavior is covered by background-annotations.test.mjs.
  a.replace('waitForBackgroundAnalysis', async job => !job.cancelled);
  a.replace('backgroundAnalysisBusy', () => false);
  return a;
}
function lines(fen, count) {
  return new Chess(fen).moves({verbose: true}).slice(0, count).map((m, i) => ({
    score: {cp: 20 - i}, pv: m.from + m.to + (m.promotion || ''), depth: 4, multipv: i + 1,
  }));
}
async function warm(a) {
  await new Promise(resolve => setTimeout(resolve, 0));
  await a.run('panelWarmJob?.promise');
}

test('adding a third line retains the second at every visited position while new searches run', async t => {
  const a = review(t), S = a.state, ready = deferred();
  const engine = fakeEngine(async (fen, depth, count) => count === 3 ? ready.promise : {lines: lines(fen, count)});
  S.liveEngine = engine; a.replace('ensureLiveEngine', async () => engine);
  // Hold background startup so the regression exercises foreground cache reuse directly.
  a.replace('createEngine', async () => { throw Error('No background engine in this test'); });
  for (const idx of [0, 1, 0]) { S.idx = idx; await a.call('requestPanelLines'); }
  const evidence = JSON.stringify({bests: S.bests, evals: S.evals});
  a.call('renderEngineCurrent');
  const second = a.dom.window.document.querySelectorAll('.engine-focus-candidate')[1].textContent;
  await a.call('setEngineSetting', 'engineLines', 3);
  assert.equal(a.dom.window.document.querySelectorAll('.engine-focus-candidate')[1].textContent, second);
  S.idx = 1; a.call('renderEngineCurrent');
  assert.equal(a.dom.window.document.querySelectorAll('.engine-focus-candidate').length, 2);
  assert.equal(a.call('cachedPanelLines').count, 2);
  assert.equal(JSON.stringify({bests: S.bests, evals: S.evals}), evidence);
  await a.call('setEngineSetting', 'engineLines', 2);
  assert.equal(a.call('cachedPanelLines').count, 2);
  ready.resolve({lines: lines(S.positions[0].fen, 3)}); await settle();
});

test('precalculation covers the whole game beyond sixteen positions, retaining calibrated evidence', async t => {
  const a = review(t, '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3'), S = a.state;
  const searches = [], evidence = JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc});
  let engine;
  a.replace('createEngine', async () => engine = fakeEngine(async (fen, depth, count, history) => {
    searches.push({fen, depth, count, history}); return {lines: lines(fen, count)};
  }));
  a.call('schedulePanelPrecalculation'); await warm(a);
  assert.equal(searches.length, S.positions.length);
  assert.ok(searches.every(s => s.count === 2 && s.depth === S.settings.engineDepth && s.history.initialFen === S.positions[0].fen));
  assert.equal(JSON.stringify({bests: S.bests, evals: S.evals, acc: S.acc}), evidence);
  assert.equal(engine.dead, true);
  a.replace('ensureLiveEngine', () => { throw Error('Navigation should already have all candidates'); });
  for (let i = 0; i < S.positions.length; i++) {
    S.idx = i; a.call('renderEngineCurrent'); await a.call('requestPanelLines');
    assert.equal(a.call('cachedPanelLines').count, 2);
  }
  await a.call('setEngineSetting', 'engineLines', 3); await warm(a);
  assert.equal(searches.length, S.positions.length * 2);
  await a.call('setEngineSetting', 'engineLines', 2); await warm(a);
  assert.equal(searches.length, S.positions.length * 2);
});

test('game statistics finish before additional lines and navigation joins a background search', async t => {
  const a = review(t), S = a.state, ready = deferred();
  let searches = 0;
  a.replace('createEngine', async () => fakeEngine(async (fen, depth, count) => {
    searches++; if (searches === 1) return ready.promise;
    return {lines: lines(fen, count)};
  }));
  S.analyzing = true; a.call('schedulePanelPrecalculation');
  assert.equal(a.run('panelWarmJob'), null);
  // Complete the scoring batch; none of the extra-line work may gate this state.
  for (const name of ['renderReview', 'renderStats', 'renderGraph', 'renderMoves', 'renderControls', 'paintBoard', 'renderEvalBar', 'renderBestArrow', 'renderEngineCurrent', 'saveToLibrary']) a.replace(name, () => {});
  a.replace('analyseCalibratedPosition', async () => ({score: {cp: 12}, lines: [], bestmove: 'e2e4'}));
  await a.call('startAnalysis');
  assert.equal(S.analyzing, false); assert.equal(S.completed, S.total);
  a.call('schedulePanelPrecalculation');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(searches, 1);
  a.replace('ensureLiveEngine', () => { throw Error('Must join background work'); });
  const pending = a.call('requestPanelLines');
  ready.resolve({lines: lines(S.positions[0].fen, 2)});
  await pending; await warm(a);
  assert.equal(searches, S.positions.length);
});

test('reset cancels precalculation and rejects stale results even when engine startup is pending', async t => {
  const a = review(t), startup = deferred();
  a.replace('createEngine', () => startup.promise);
  a.call('schedulePanelPrecalculation');
  await new Promise(resolve => setTimeout(resolve, 0));
  const pending = a.run('panelWarmJob.promise');
  a.call('resetLiveEngine');
  const engine = fakeEngine(() => { throw Error('Cancelled startup must not search'); });
  startup.resolve(engine); await pending;
  assert.equal(engine.dead, true); assert.equal(a.run('panelLineCache.size'), 0);
});

for (const design of ['original', 'focus', 'minimal']) {
  test(`${design} opens a line without autoplay and lets the user advance manually`, t => {
    const a = review(t), S = a.state;
    S.settings.engineDesign = design;
    a.replace('requestLiveEval', () => {}); a.replace('requestPanelLines', () => {});
    a.call('renderEngine', [{score: {cp: 42}, pv: 'e2e4 e7e5 g1f3 b8c6'}]);
    const candidate = a.dom.window.document.querySelector('.engine-focus-candidate, .engine-line.clickable');
    assert.equal(candidate.querySelector('[title]'), null); assert.equal(candidate.hasAttribute('title'), false);
    candidate.click();
    assert.equal(S.variation.idx, 1); assert.equal(S.variation.positions.length, 5);
    assert.equal(S.lineWalking, false); assert.equal(S.lineWalkTimer, undefined);
    a.call('navNext'); assert.equal(S.variation.idx, 2);
  });
}

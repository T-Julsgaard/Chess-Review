import test from 'node:test';
import assert from 'node:assert/strict';
import { expected, moveQuality, summarize, assertCompatible, assertDisjoint, gameBootstrap } from '../tools/calibration/core.mjs';
import { Engine, engineConfig } from '../tools/calibration/engine.mjs';
import { fit, predict } from '../tools/calibration/fit-rating.mjs';

const wdl = (wins, draws = 0) => ({ wdl: [wins, draws, 1000 - wins - draws] });
test('WDL expected result includes half draws, rejects invalid or absent WDL', () => {
  assert.equal(expected(wdl(200, 600)), .5);
  assert.throws(() => expected({ cp: 200 }));
  assert.throws(() => expected({ wdl: [200, 900, 0] }));
});
test('quality is bounded, monotone and high for no loss; losing mate is contextual', () => {
  assert.equal(moveQuality(wdl(500), wdl(500)).quality, 100);
  const qualities = [490, 450, 250, 0].map(w => moveQuality(wdl(500), wdl(w)).quality);
  assert.deepEqual(qualities, [99, 95, 75, 50]);
  assert.equal(moveQuality({ mate: 3 }, { mate: -3 }).quality, 0);
  assert.equal(moveQuality({ mate: 3 }, wdl(999)).quality, 99.9);
  assert.equal(moveQuality({ mate: 3 }, wdl(0, 1000)).quality, 50);
  assert.equal(moveQuality(wdl(999), wdl(998)).loss < moveQuality(wdl(700), wdl(0, 1000)).loss, true);
});
test('best and forced moves avoid search-noise penalties; forced moves excluded', () => {
  assert.equal(moveQuality(wdl(500), wdl(400), { top: true }).quality, 100);
  const forced = moveQuality(wdl(500), wdl(400), { forced: true });
  assert.equal(forced.eligible, false); assert.equal(summarize([forced]).accuracyMean, null);
});
test('aggregation is deterministic, repetition-invariant, and RMS reflects catastrophes', () => {
  const moves = [0, 0, 0, 1].map(loss => ({ loss, eligible: true, residual: loss, top: !loss }));
  const a = summarize(moves), b = summarize([...moves, ...moves]);
  assert.equal(a.accuracyMean, 75); assert.equal(a.accuracyRms, 50);
  assert.equal(a.accuracyRms, b.accuracyRms); assert.deepEqual(a, summarize(moves));
});
test('compatibility and player splits fail closed', () => {
  assert.throws(() => assertCompatible({ engineConfig: { nodes: 100 } }, { nodes: 200 }));
  assert.throws(() => assertDisjoint([{ split: 'train', players: [{ id: 'x' }] }, { split: 'test', players: [{ id: 'x' }] }]));
});
test('rating prediction never consumes the target or known player rating', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ meanLoss: i / 100, rmsLoss: i / 50,
    majorLossRate: i / 12, topRate: 1 - i / 12, ratingTarget: 2000 - i * 50 }));
  const model = fit(rows, 10), r = rows[5];
  assert.equal(predict(model, r), predict(model, { ...r, ratingTarget: 100, rating: 3500 }));
});
test('bootstrap resamples whole games and is reproducible', () => {
  const rows = [{ gameId: 'a', side: 'w' }, { gameId: 'a', side: 'b' }, { gameId: 'b', side: 'w' }, { gameId: 'b', side: 'b' }];
  const statistic = sample => {
    for (const id of ['a', 'b']) assert.equal(sample.filter(r => r.gameId === id && r.side === 'w').length,
      sample.filter(r => r.gameId === id && r.side === 'b').length);
    return sample.filter(r => r.gameId === 'a').length;
  };
  assert.deepEqual(gameBootstrap(rows, statistic), gameBootstrap(rows, statistic));
});
test('real bundled SF18 starts with WDL and reproduces searches after state reset', async () => {
  const config = await engineConfig('engine/stockfish-nnue.js', { kind: 'nodes', value: 5000 });
  const engine = new Engine('engine/stockfish-nnue.js');
  try {
    const identity = await engine.init(config); assert.match(identity.identity, /Stockfish 18 Lite/);
    const first = await engine.search([], null, config.budget);
    await engine.search(['e2e4'], null, config.budget);
    const again = await engine.search([], null, config.budget);
    assert.deepEqual(first.score, again.score); assert.equal(first.bestmove, again.bestmove);
    assert.equal(first.nodes, again.nodes); assert.equal(first.depth, again.depth);
    assert.ok(Number.isFinite(expected(first.score)));
    const restricted = await engine.search([], 'a2a3', config.budget); assert.equal(restricted.bestmove, 'a2a3');
  } finally { engine.close(); }
});

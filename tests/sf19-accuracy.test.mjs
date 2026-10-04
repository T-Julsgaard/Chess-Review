import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sf19MoveQuality, sf19GameAccuracy} from '../lib/public-scoring.js';
import {calibratedReview} from '../lib/calibrated-review.js';
import {app, loadGame} from './helpers/app.mjs';
import {Engine, engineConfig} from '../tools/calibration/engine.mjs';

const calibration = JSON.parse(await readFile(new URL('../data/calibration.json', import.meta.url)));

test('SF19 accuracy penalizes centipawn mistakes even when WDL saturates', () => {
  const best = {cp: 800, wdl: [1000, 0, 0]}, played = {cp: 500, wdl: [1000, 0, 0]};
  assert.ok(Math.abs(sf19MoveQuality(best, played).quality - 68.47133037336374) < 1e-10);
  assert.ok(sf19MoveQuality({cp: 0}, {cp: -300}).quality < 35);
  assert.ok(sf19MoveQuality({cp: 0}, {cp: -300}).quality < sf19MoveQuality({cp: 0}, {cp: -100}).quality);
  assert.equal(sf19MoveQuality({cp: 100}, {cp: 200}).quality, 100);
  assert.equal(sf19MoveQuality({mate: 2}, {mate: -4}).quality, 0);
  assert.equal(sf19MoveQuality({mate: 2}, {mate: 5}).quality, 100);
  assert.equal(sf19MoveQuality(best, played, {top: true}).quality, 100);
  assert.equal(sf19MoveQuality(best, played, {forced: true}).eligible, false);
  assert.throws(() => sf19MoveQuality({cp: 0}, {mate: 0}), /Ambiguous/);
  assert.throws(() => sf19MoveQuality(best, {wdl: [1000, 0, 0]}), /Missing engine score/);
});

test('SF19 game accuracy gives catastrophic moves weight without penalizing perfect or forced play', () => {
  const moves = Array.from({length: 40}, (_, i) => ({eligible: true, quality: i === 20 ? 0 : 100}));
  assert.equal(sf19GameAccuracy(moves), 48.75);
  assert.equal(sf19GameAccuracy([...moves, {eligible: false, quality: 100}]), 48.75);
  assert.equal(sf19GameAccuracy([{eligible: true, quality: 100}]), 100);
  const longPerfectGame = sf19GameAccuracy(Array.from({length: 1000}, () => ({eligible: true, quality: 100})));
  assert.ok(longPerfectGame <= 100 && Math.abs(longPerfectGame - 100) < 1e-8);
  assert.equal(sf19GameAccuracy([{eligible: true, quality: 0}]), 0);
  assert.equal(sf19GameAccuracy([{eligible: false, quality: 100}]), null);
  assert.equal(sf19GameAccuracy([]), null);
  assert.throws(() => sf19GameAccuracy([{eligible: true, quality: NaN}]), /Invalid move quality/);
});

test('SF19 production review penalizes both colors and keeps WDL rating independent of accuracy', t => {
  const a = app(t), S = loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. Nc3');
  const wdl = [300, 400, 300];
  S.bests = S.positions.slice(1).map(() => ({bestmove: 'different', score: {cp: 800, wdl}, playedScore: {cp: 500, wdl},
    calibration: {version: calibration.version, build: 'sf19lite', nodes: 20000},
    ratingEvidence: {candidateVersion: calibration.movesOnly.sf19.candidateVersion,
      best: {cp: 800, wdl}, played: {cp: 500, wdl}, bestmove: 'different'}}));
  const first = calibratedReview(S.positions, S.bests, calibration);
  for (const color of ['w', 'b']) {
    assert.ok(first[color].complete);
    assert.ok(Math.abs(first[color].accuracy - 68.47133037336374) < 1e-10);
    assert.ok(Number.isFinite(first[color].rating));
    assert.equal(first[color].ratingMethod, 'moves');
    assert.ok(first[color].ratingMoves.every(move => move.loss === 0));
  }
  // Improving centipawn observations with identical WDL changes display quality only.
  for (const root of S.bests) root.playedScore.cp = 799;
  const second = calibratedReview(S.positions, S.bests, calibration);
  for (const color of ['w', 'b']) {
    assert.equal(second[color].accuracy, 100);
    assert.equal(second[color].rating, first[color].rating);
  }
});

test('saved accuracy from the old scoring version cannot restore', t => {
  const a = app(t), S = loadGame(a, '1. e4 e5');
  S.bests.forEach(root => Object.assign(root, {playedScore: {cp: 0},
    calibration: {version: calibration.version, build: 'sf19lite', nodes: 20000}}));
  const saved = {pgn: S.pgn, settingsKey: a.call('analysisSettingsKey'), bests: S.bests, evals: S.evals};
  assert.equal(a.call('canRestoreAnalysis', saved), true);
  saved.settingsKey = saved.settingsKey.replace('public-scoring-v3', 'public-scoring-v2');
  assert.equal(a.call('canRestoreAnalysis', saved), false);
});

test('real bundled SF19 missed win receives a low accuracy score from same-root observations', async t => {
  const budget = {kind: 'nodes', value: 20000};
  const config = await engineConfig('engine/stockfish-19-lite-single.js', budget);
  const engine = new Engine('engine/stockfish-19-lite-single.js');
  t.after(() => engine.close());
  await engine.init(config);
  // Public game GI9glGoo: Black played 21...Ne8, allowing a forced mate.
  const history = 'd2d4 c7c6 g1f3 d7d5 e2e3 c8g4 b1d2 e7e6 h2h3 g4f3 d2f3 g8f6 f1d3 c6c5 c2c3 c5d4 e3d4 a7a6 e1g1 b8d7 f1e1 f8d6 d1c2 e8g8 c1g5 h7h6 g5d2 a8c8 f3e5 b7b5 c2d1 d8c7 f2f4 c7b6 g2g4 f8d8 d1f3 b5b4 g4g5 h6g5 f4g5'.split(' ');
  const best = await engine.search(history, null, budget), played = await engine.search(history, 'f6e8', budget);
  assert.notEqual(best.bestmove, 'f6e8');
  assert.ok(played.score.mate < 0);
  assert.ok(sf19MoveQuality(best.score, played.score).quality < 5);
});

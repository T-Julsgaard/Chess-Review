import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Chess} from '../lib/chess.js';
import {hash} from '../tools/calibration/io.mjs';
import {calibratedReview, scoringEvidenceComplete} from '../lib/calibrated-review.js';
import {analyseCalibratedPosition} from '../lib/calibrated-search.js';
import {publicMoveQuality, engineExpectedPoints, contextualRating, movesOnlyRating} from '../lib/public-scoring.js';
import {app,loadGame} from './helpers/app.mjs';

const calibration = JSON.parse(await readFile(new URL('../data/calibration.json', import.meta.url)));
const evidence = JSON.parse(gunzipSync(await readFile(new URL('../tools/calibration/public/sf18-evidence.json.gz', import.meta.url))));
const expected = JSON.parse(await readFile(new URL('../tools/calibration/public/expected-scores.json', import.meta.url)));

test('the actual review scorer reproduces every published player-side accuracy', () => {
  const cache = new Map(evidence.searches.map(row => [row.key, row]));
  for (const game of evidence.games) {
    const chess = new Chess(), history = [], positions = [{fen: chess.fen()}], bests = [];
    for (const played of game.moves) {
      const root = structuredClone(cache.get(hash(JSON.stringify([evidence.configHash, history, null]))));
      const actual = root.bestmove === played ? root : cache.get(hash(JSON.stringify([evidence.configHash, history, played])));
      root.playedScore = actual.score;
      root.calibration = {version: calibration.version, build: 'nnue', qualityVersion: calibration.quality.candidateVersion};
      bests.push(root);
      const move = chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]});
      positions.push({...move, fen: chess.fen()}); history.push(played);
    }
    const players = Object.fromEntries(game.players.map(p => [p.color, p]));
    const scored = calibratedReview(positions, bests, calibration, players);
    for (const color of ['w', 'b']) {
      const row = expected.find(r => r.gameId === game.id && r.color === color);
      assert.equal(scored[color].accuracy, row.accuracy);
      assert.equal(scored[color].decisions, row.decisions);
      assert.ok(Number.isFinite(scored[color].rating));
      assert.equal(scored[color].rating, contextualRating(players[color].rating, row.accuracy, row.decisions, calibration.context.model).rating);
    }
    assert.ok(scoringEvidenceComplete(bests, game.moves.length, calibration));
    delete bests[0].calibration;
    assert.equal(scoringEvidenceComplete(bests, game.moves.length, calibration), false);
    assert.equal(calibratedReview(positions, bests, calibration, players).w.rating, null);
  }
});

test('forced and top decisions are perfect; mate endpoints and missing WDL remain explicit', () => {
  const model = calibration.quality;
  assert.equal(publicMoveQuality({cp: 100}, {cp: -100}, model, {top: true}).quality, 100);
  assert.equal(publicMoveQuality({mate: 2}, {mate: 5}, model, {forced: true}).eligible, false);
  assert.equal(publicMoveQuality({mate: 2}, {mate: 5}, model).quality, 100);
  assert.ok(publicMoveQuality({mate: 2}, {mate: -2}, model).quality < .001);
  assert.throws(() => engineExpectedPoints({cp: 0}), /WDL/);
  assert.throws(() => engineExpectedPoints({mate: 0}), /Ambiguous/);
  assert.equal(movesOnlyRating([], calibration.movesOnly.sf18.model), null);
});

test('SF18 searches preserve root history and use separate restricted/default and rating protocols', async () => {
  const calls = [], options = [], history = {initialFen: new Chess().fen(), moves: []};
  const engine = {buildKey: 'nnue', identity: 'Stockfish 18', async setOptions(value) {options.push(value);},
    async analyse(fen, depth, lines, h, progress, config) {
      calls.push({fen, depth, lines, history: h, config});
      return {bestmove: config.searchMove || 'd2d4', score: {cp: config.searchMove ? 0 : 30, wdl: [300, 400, 300]}, lines: []};
    }};
  const result = await analyseCalibratedPosition(engine, {fen: history.initialFen, history, played: 'e2e4',
    settings: {enginePath: 'nnue', engineDepth: 16, engineHash: 16, engineSkill: 20, classifyLines: 1}, calibration, needMovesOnly: true});
  assert.equal(calls.length, 4);
  assert.ok(calls.every(call => call.history === history && call.config.cold && call.config.requireExact));
  assert.deepEqual(calls.map(call => call.config.budget), [{kind: 'depth', value: 16}, {kind: 'depth', value: 16}, {kind: 'nodes', value: 20000}, {kind: 'nodes', value: 20000}]);
  assert.deepEqual(calls.map(call => call.config.searchMove || null), [null, 'e2e4', null, 'e2e4']);
  assert.deepEqual(options.map(value => value.Hash), [16, 32, 16]);
  assert.equal(result.calibration.qualityVersion, calibration.quality.candidateVersion);
  assert.equal(result.ratingEvidence.candidateVersion, calibration.movesOnly.sf18.candidateVersion);
});

test('SF19 uses its separate fixed-node evidence and refuses the wrong engine identity', async () => {
  const calls = [], engine = {buildKey: 'sf19lite', identity: 'Stockfish 19 Lite', async setOptions() {},
    async analyse(fen, depth, lines, history, preview, config) {calls.push(config); return {bestmove: 'e2e4', score: {cp: 0, wdl: [200, 600, 200]}};}};
  const request = {fen: new Chess().fen(), history: {initialFen: new Chess().fen(), moves: []}, played: 'e2e4',
    settings: {enginePath: 'sf19lite', engineDepth: 16, engineHash: 16, engineSkill: 20, classifyLines: 1}, calibration};
  const result = await analyseCalibratedPosition(engine, request);
  assert.equal(calls.length, 1); assert.deepEqual(calls[0].budget, {kind: 'nodes', value: 20000});
  assert.equal(result.calibration.qualityVersion, null);
  assert.equal(result.ratingEvidence.candidateVersion, calibration.movesOnly.sf19.candidateVersion);
  engine.identity = 'Stockfish 18'; await assert.rejects(analyseCalibratedPosition(engine, request), /identity/);
});

test('rating settings persist and saved analyses without played-root evidence cannot restore', async t => {
  const a = app(t), S = loadGame(a, '1. e4 e5');
  a.replace('startAnalysis', () => {}); a.replace('renderSettings', () => {}); a.replace('renderEngineCurrent', () => {});
  await a.call('setEngineSetting', 'ratingMode', 'moves');
  assert.equal(S.settings.ratingMode, 'moves');
  const saved = {pgn: S.pgn, settingsKey: a.call('analysisSettingsKey'), bests: S.bests, evals: S.evals};
  assert.equal(a.call('canRestoreAnalysis', saved), false);
  assert.ok(a.writes.some(write => write.settings?.ratingMode === 'moves'));
});

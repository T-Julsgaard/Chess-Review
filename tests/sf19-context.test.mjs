import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Chess} from '../lib/chess.js';
import {calibratedReview} from '../lib/calibrated-review.js';
import {contextualRating, movesOnlyRating, ratingGameQuality} from '../lib/public-scoring.js';
import {fitSf19Context} from '../tools/calibration/sf19-context.mjs';
import {app, loadGame} from './helpers/app.mjs';

const calibration = JSON.parse(await readFile(new URL('../data/calibration.json', import.meta.url)));
const evidence = JSON.parse(gunzipSync(await readFile(new URL('../tools/calibration/public/sf19-rating-evidence.json.gz', import.meta.url))));
const dataset = JSON.parse(gunzipSync(await readFile(new URL('../tools/calibration/public/dataset.json.gz', import.meta.url))));

function fixture(t, pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. c4 c6 12. Nc3') {
  const a = app(t), S = loadGame(a, pgn);
  S.players = {w: {rating: 1500}, b: {rating: 1800}};
  S.bests = S.positions.slice(1).map(() => ({bestmove: 'different', score: {cp: 80}, playedScore: {cp: -80},
    calibration: {version: calibration.version, build: 'sf19lite', nodes: 20000, contextVersion: calibration.context.sf19.candidateVersion},
    ratingEvidence: {candidateVersion: calibration.movesOnly.sf19.candidateVersion,
      best: {wdl: [400, 400, 200]}, played: {wdl: [200, 400, 400]}, bestmove: 'different'}}));
  return S;
}
const review = (S, mode = 'context') => calibratedReview(S.positions, S.bests, calibration, S.players, mode);

test('SF19 context uses recorded rating and its own peers; moves-only ignores both player ratings', t => {
  const S = fixture(t), context = review(S), moves = review(S, 'moves');
  for (const color of ['w', 'b']) {
    assert.equal(context[color].ratingMethod, 'context');
    assert.equal(context[color].rating, contextualRating(S.players[color].rating,
      ratingGameQuality(context[color].ratingMoves), context[color].decisions, calibration.context.sf19.model).rating);
    assert.equal(moves[color].ratingMethod, 'moves');
    assert.equal(moves[color].rating, movesOnlyRating(moves[color].ratingMoves, calibration.movesOnly.sf19.model));
    assert.equal(context[color].accuracy, moves[color].accuracy);
  }
  S.players.w.rating = 2000; S.players.b.rating = 1200;
  const changed = review(S), sameMoves = review(S, 'moves');
  for (const color of ['w', 'b']) {
    assert.notEqual(changed[color].rating, context[color].rating);
    assert.equal(sameMoves[color].rating, moves[color].rating);
  }
  // Display accuracy has a different definition and must not enter WDL peer ranks.
  S.bests.forEach(root => {root.playedScore.cp = -500;});
  assert.notEqual(review(S).w.accuracy, changed.w.accuracy);
  assert.equal(review(S).w.rating, changed.w.rating);
  S.bests.forEach(root => {root.ratingEvidence.played.wdl = [...root.ratingEvidence.best.wdl];});
  assert.ok(review(S).w.rating > changed.w.rating);
});

test('missing ratings fall back per player, and incomplete or incompatible WDL cannot enter context', t => {
  const S = fixture(t), moves = review(S, 'moves');
  delete S.players.w.rating;
  const fallback = review(S);
  assert.equal(fallback.w.ratingMethod, 'moves'); assert.equal(fallback.w.rating, moves.w.rating);
  assert.equal(fallback.b.ratingMethod, 'context');
  delete S.bests[1].ratingEvidence.played.wdl;
  assert.equal(review(S).b.rating, null);
  S.bests[1].ratingEvidence.played.wdl = [200, 400, 400];
  S.bests[1].calibration.contextVersion = 'stale';
  assert.equal(review(S).b.ratingMethod, 'moves');
  S.bests[1].ratingEvidence.candidateVersion = 'wrong-engine-model';
  assert.equal(review(S).b.rating, null);
  S.bests[1].calibration.build = 'nnue';
  S.bests[1].calibration.qualityVersion = calibration.quality.candidateVersion;
  S.bests[1].ratingEvidence.candidateVersion = calibration.movesOnly.sf18.candidateVersion;
  assert.equal(review(S).b.rating, null); // Mixed scoring engines cannot define a peer rank or regression.
});

test('contextual WDL quality excludes forced dilution and rejects incomplete numerical evidence', () => {
  assert.equal(ratingGameQuality([{eligible: true, loss: .25}, {eligible: false, loss: 0}]), 75);
  assert.equal(ratingGameQuality([{eligible: true, loss: 0}]), 100);
  assert.equal(ratingGameQuality([]), null);
  assert.throws(() => ratingGameQuality([{eligible: true, loss: NaN}]), /evidence/);
  assert.throws(() => ratingGameQuality([{eligible: true, loss: 1.1}]), /evidence/);
});

test('short excerpts, forced moves and unsupported peer coverage retain explicit limits', t => {
  const S = fixture(t, '1. e4 e5');
  const short = review(S);
  assert.equal(short.w.ratingMethod, 'context'); assert.equal(short.w.shortExcerpt, true);
  assert.equal(review(S, 'moves').w.rating, null);
  S.players.w.rating = 5000;
  assert.equal(review(S).w.rating, 5000);
  const chess = new Chess('8/8/8/8/8/8/r1k5/K7 w - - 0 1');
  assert.equal(chess.moves().length, 1);
  const position = chess.fen(), move = chess.move(chess.moves()[0]);
  S.positions = [{fen: position}, {...move, fen: chess.fen()}]; S.bests = S.bests.slice(0, 1);
  S.players.w.rating = 1500;
  const forced = review(S);
  assert.equal(forced.w.rating, 1500); assert.equal(forced.w.shortExcerpt, false);
  assert.equal(forced.w.ratingMoves[0].loss, 0);
});

test('SF19 public peers reconstruct exactly and improve game-separated distribution error over baseline', () => {
  assert.deepEqual(fitSf19Context(evidence), calibration.context.sf19);
  const metrics = calibration.context.sf19.developmentValidation;
  assert.equal(metrics.games, 750); assert.equal(metrics.sides, 1498);
  assert.ok(metrics.crps < metrics.baselineCrps);
  const peers = new Map(calibration.context.sf19.model.peers.map(row => [row.gameId + ':' + row.color, row]));
  for (const row of evidence.rows) {
    const eligible = row.contextMoves.filter(move => move.eligible);
    const quality = eligible.reduce((sum, move) => sum + move.quality, 0) / eligible.length;
    assert.ok(Math.abs(peers.get(row.gameId + ':' + row.color).quality - quality) < 1e-12);
  }
  assert.throws(() => fitSf19Context({...evidence, rows: evidence.rows.map(row => ({...row, split: 'validation'}))}), /training/);
  assert.throws(() => fitSf19Context({...evidence, engineConfig: {...evidence.engineConfig, majorVersion: 18}}), /protocol/);
});

test('actual review replays SF19 public evidence across all five rating bands in both modes', () => {
  const rows = new Map(evidence.rows.map(row => [row.gameId + ':' + row.color, row]));
  const selected = Array.from({length: 5}, (_, band) => evidence.rows.find(row => row.band === band));
  // Recover exact WDL expected points from the archived half-point-per-mille values.
  const score = (value, mate) => ({cp: 0, ...(mate != null ? {mate} : {}),
    wdl: value <= .5 ? [0, Math.round(2000 * value), 1000 - Math.round(2000 * value)]
      : [Math.round(2000 * value) - 1000, 2000 - Math.round(2000 * value), 0]});
  for (const sample of selected) {
    const game = dataset.find(game => game.id === sample.gameId), chess = new Chess();
    const positions = [{fen: chess.fen()}], bests = [], players = {};
    for (const color of ['w', 'b']) players[color] = {rating: rows.get(game.id + ':' + color).ratingTarget};
    for (const [index, played] of game.moves.entries()) {
      const row = rows.get(game.id + ':' + chess.turn()).contextMoves.find(move => move.ply === index + 1);
      assert.equal(row.legalChoices, chess.moves().length);
      const best = score(row.bestExpected, row.bestMate), actual = score(row.playedExpected, row.playedMate);
      bests.push({bestmove: row.top ? played : 'different', score: best, playedScore: actual,
        calibration: {version: calibration.version, build: 'sf19lite', nodes: 20000, contextVersion: calibration.context.sf19.candidateVersion},
        ratingEvidence: {candidateVersion: calibration.movesOnly.sf19.candidateVersion, best, played: actual, bestmove: row.top ? played : 'different'}});
      const move = chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]});
      positions.push({...move, fen: chess.fen()});
    }
    const context = calibratedReview(positions, bests, calibration, players);
    const moves = calibratedReview(positions, bests, calibration, players, 'moves');
    for (const color of ['w', 'b']) {
      const row = rows.get(game.id + ':' + color), decisions = row.contextMoves.filter(move => move.eligible).length;
      assert.equal(context[color].ratingMethod, 'context'); assert.equal(moves[color].ratingMethod, 'moves');
      assert.equal(context[color].rating, contextualRating(row.ratingTarget, ratingGameQuality(row.contextMoves), decisions, calibration.context.sf19.model).rating);
      assert.equal(moves[color].rating, movesOnlyRating(row.contextMoves, calibration.movesOnly.sf19.model));
    }
  }
});

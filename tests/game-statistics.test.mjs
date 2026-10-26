import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../lib/chess.js';
import {gamePhases, gameStatistics} from '../lib/game-statistics.js';
import {sf19GameAccuracy} from '../lib/public-scoring.js';

const opening = new Chess().fen();
const middle = 'r2q1rk1/ppp2ppp/2nbpn2/3p4/3P4/2NBPN2/PPPQ1PPP/R4RK1 w - - 0 10';
const ending = '6k1/pp3ppp/8/3r4/3R4/8/PP3PPP/6K1 w - - 0 30';
function fixture(engine = 'nnue') {
  const positions = [{fen: opening}, {fen: middle, color: 'w', from: 'e2', to: 'e4'},
    {fen: ending, color: 'b', from: 'e7', to: 'e5'}, {fen: ending, color: 'w', from: 'd4', to: 'd5'},
    {fen: ending, color: 'b', from: 'g8', to: 'f8'}, {fen: ending, color: 'w', from: 'd5', to: 'd6'}];
  const bests = positions.slice(1).map((position, i) => ({bestmove: i === 0 ? 'e2e4' : 'different',
    score: {cp: 100}, playedScore: {cp: i === 2 ? -200 : 50}}));
  const calibrated = Object.fromEntries(['w', 'b'].map(color => [color, {complete: true,
    moves: positions.flatMap((position, ply) => position.color === color ? [{ply, eligible: true, engine, quality: 100 - ply * 10}] : [])}]));
  return {positions, bests, calibrated};
}

test('phases use board development and material, begin at the pre-move position, and never regress', () => {
  assert.deepEqual(gamePhases([opening, middle, ending, middle, opening].map(fen => ({fen}))),
    ['opening', 'middlegame', 'endgame', 'endgame', 'endgame']);
  const f = fixture(), stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.phases.opening.accuracy, 90);
  assert.equal(stats.b.phases.middlegame.accuracy, 80);
  assert.equal(stats.w.phases.endgame.accuracy, 60);
  assert.equal(stats.b.phases.opening.accuracy, null);
});

test('a custom black-to-move FEN can begin in the endgame without fabricating earlier phases', () => {
  const f = fixture(); f.positions[0].fen = ending.replace(' w ', ' b '); f.positions[1].color = 'b';
  const phases = gamePhases(f.positions);
  assert.ok(phases.every(phase => phase === 'endgame'));
  const stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.phases.opening.moves, 0);
  assert.equal(stats.w.phases.opening.accuracy, null);
});

test('each phase uses its engine scorer and missing observations never become perfect scores', () => {
  const f = fixture('sf19lite');
  const stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.phases.endgame.accuracy, sf19GameAccuracy(f.calibrated.w.moves.slice(1)));
  f.calibrated.w.complete = false; f.calibrated.w.moves.pop();
  const partial = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(partial.w.phases.opening.accuracy, 90);
  assert.equal(partial.w.phases.endgame.accuracy, null);
  assert.equal(partial.w.averageCpLoss, null);
  assert.equal(partial.w.topMatch, null);
});

test('centipawn losses are mover-relative, top matches use the best score, and largest loss retains the ply', () => {
  const f = fixture(), stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.averageCpLoss, 350 / 3);
  assert.equal(stats.b.averageCpLoss, 50);
  assert.equal(stats.w.topMatch, 100 / 3);
  assert.equal(stats.b.topMatch, 0);
  assert.deepEqual(stats.w.largestLoss, {ply: 3, loss: 300});
  f.bests[1].playedScore.cp = 150;
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated).b.averageCpLoss, 25);
});

test('forced decisions and mate scores do not pollute centipawn units or top-move matches', () => {
  const f = fixture();
  f.calibrated.w.moves[1].eligible = false;
  f.bests[4].playedScore = {mate: -3};
  const stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.averageCpLoss, 0); assert.equal(stats.w.cpMoves, 1);
  assert.equal(stats.w.topMatch, 50);
  assert.equal(stats.w.phases.endgame.accuracy, 50);
  f.calibrated.w.moves.forEach(move => { move.eligible = false; });
  const forced = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(forced.w.phases.opening.accuracy, null);
  assert.equal(forced.w.phases.endgame.accuracy, null);
  assert.equal(forced.w.averageCpLoss, null); assert.equal(forced.w.topMatch, null);
});

test('missing and mixed-engine evidence produces unavailable statistics', () => {
  const f = fixture(); f.calibrated.w.moves.at(-1).engine = 'sf19lite';
  const stats = gameStatistics(f.positions, f.bests, f.calibrated);
  assert.equal(stats.w.phases.endgame.accuracy, null);
  assert.equal(stats.w.averageCpLoss, null);
  const empty = gameStatistics([{fen: opening}], [], null);
  for (const side of ['w', 'b']) {
    assert.equal(empty[side].topMatch, null);
    assert.equal(empty[side].averageCpLoss, null);
    assert.equal(empty[side].phases.opening.accuracy, null);
  }
});

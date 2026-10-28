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

test('clean streaks follow the player’s decisions, skip forced replies, break on errors, and retain earliest ties', () => {
  const f = fixture();
  const classifications = [null, 'book', 'blunder', 'best', 'good', 'excellent'];
  let stats = gameStatistics(f.positions, f.bests, f.calibrated, {classifications});
  assert.deepEqual(stats.w.cleanStreak, {count: 3, startPly: 1, endPly: 5});
  assert.deepEqual(stats.b.cleanStreak, {count: 1, startPly: 4, endPly: 4});
  f.calibrated.w.moves[1].eligible = false;
  classifications[3] = 'best';
  stats = gameStatistics(f.positions, f.bests, f.calibrated, {classifications});
  assert.deepEqual(stats.w.cleanStreak, {count: 2, startPly: 1, endPly: 5});
  f.calibrated.w.moves[1].eligible = true; classifications[3] = 'miss';
  assert.deepEqual(gameStatistics(f.positions, f.bests, f.calibrated, {classifications}).w.cleanStreak,
    {count: 1, startPly: 1, endPly: 1});
  classifications[5] = null;
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated, {classifications}).w.cleanStreak, null);
});

test('clock advantage compares paired turns with ties in the denominator, independent of time control', () => {
  const f = fixture();
  const options = {clocks: [null, '1:35', '1:25', '1:20', '1:20', '1:10']};
  const stats = gameStatistics(f.positions, f.bests, f.calibrated, options);
  assert.deepEqual(stats.w.clock.advantage, {percent: 50, ahead: 1, samples: 2, total: 2});
  assert.equal(stats.b.clock.advantage.percent, 0);
  assert.deepEqual(stats.w.clock.largestLead, {seconds: 10, ply: 2});
  assert.equal(stats.w.clock.averageThink, null, 'Unknown increment must not produce thinking times');
  const staged = gameStatistics(f.positions, f.bests, f.calibrated, {...options, headers: {TimeControl: '40/7200:3600'}});
  assert.equal(staged.w.clock.advantage.percent, 50, 'Remaining clocks can still be compared with staged controls');
});

test('clock pairs never bridge gaps, handle black-to-move starts, and preserve fractions', () => {
  const f = fixture();
  const missing = gameStatistics(f.positions, f.bests, f.calibrated, {clocks: [null, '1:30', null, '1:20', '1:10']});
  assert.deepEqual(missing.w.clock.advantage, {percent: 100, ahead: 1, samples: 1, total: 2});
  const excerpt = [{fen: opening.replace(' w ', ' b ')},
    ...['b', 'w', 'b', 'w'].map(color => ({fen: ending, color, from: 'a1', to: 'a2'}))];
  const clock = gameStatistics(excerpt, [], null, {clocks: [null, '1:35.5', '1:35.25', '1:20', '1:30']}).b.clock;
  assert.equal(clock.advantage.percent, 50);
  assert.equal(clock.largestLead.seconds, .25);
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated).w.clock.advantage, null);
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated, {clocks: [null, '1:99', '1:00']}).w.clock.advantage, null);
});

test('thinking times remove increments, include zero-second moves, and do not bridge missing clocks', () => {
  const f = fixture(), headers = {TimeControl: '100+5'};
  const stats = gameStatistics(f.positions, f.bests, f.calibrated,
    {clocks: [null, '1:35.5', '1:45', '1:20', null, '1:00'], headers});
  assert.equal(stats.w.clock.thinkMoves, 3);
  assert.equal(stats.w.clock.averageThink, 55 / 3);
  assert.deepEqual(stats.w.clock.longestThink, {seconds: 25, ply: 5});
  assert.equal(stats.b.clock.averageThink, 0);
  const gap = gameStatistics(f.positions, f.bests, f.calibrated,
    {clocks: [null, null, '1:35', '1:20', '1:10', '1:00'], headers}).w.clock;
  assert.equal(gap.thinkMoves, 1);
  assert.equal(gap.longestThink.ply, 5);
  assert.equal(gap.longestThink.seconds, 25);
});

test('decision insights use mover-relative starting positions and only eligible decisions', () => {
  const f = fixture();
  f.bests[0].score.cp = 0; f.bests[2].score.cp = -100; f.bests[4].score.cp = 100;
  const stats = gameStatistics(f.positions, f.bests, f.calibrated,
    {classifications: [null, 'book', 'good', 'mistake', 'inaccuracy', 'excellent']});
  assert.equal(stats.w.insights.balanced.accuracy, 90);
  assert.equal(stats.w.insights.defending.accuracy, 70);
  assert.equal(stats.w.insights.winning.accuracy, 50);
  assert.equal(stats.w.insights.cleanShare, 200 / 3);
  assert.equal(stats.w.insights.bestStretch, null);
  assert.equal(stats.b.insights.defending.accuracy, null, 'No matching sample is unavailable, not zero');
  f.calibrated.w.moves[1].eligible = false;
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated).w.insights.defending.count, 0);
  f.calibrated.w.complete = false;
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated).w.insights, null);
});

test('best five-decision stretch keeps the earliest tie and uses the engine’s actual accuracy aggregator', () => {
  const positions = [{fen: opening}], moves = [];
  for (let i = 1; i <= 12; i++) {
    positions.push({fen: opening, color: i % 2 ? 'w' : 'b', from: 'a1', to: 'a2'});
    if (i % 2) moves.push({ply: i, eligible: true, quality: 90, engine: 'sf19lite'});
  }
  const calibrated = {w: {complete: true, moves}};
  const stats = gameStatistics(positions, [], calibrated);
  assert.equal(stats.w.insights.bestStretch.startPly, 1);
  assert.equal(stats.w.insights.bestStretch.endPly, 9);
  assert.equal(stats.w.insights.bestStretch.accuracy, sf19GameAccuracy(moves.slice(0, 5)));
});

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

test('Time ahead integrates seconds across clock crossovers and excludes increment time', () => {
  const f = fixture(), positions = f.positions.slice(0, 4);
  for (const side of ['w', 'b']) f.calibrated[side].moves = f.calibrated[side].moves.filter(move => move.ply < 4);
  const stats = gameStatistics(positions, f.bests, f.calibrated,
    {clocks: [null, '1:35', '1:25', '1:20'], headers: {TimeControl: '100+5'}});
  assert.equal(stats.w.timeAhead.percent, 50);
  assert.equal(stats.b.timeAhead.percent, 50);
  assert.equal(stats.w.timeAhead.seconds, 50);
  assert.equal(stats.w.timeAhead.turns, 3);
  assert.equal(stats.w.timeAhead.totalTurns, 3);
  assert.deepEqual(stats.w.timeAhead.ahead, {w: 25, b: 25});
});

test('clock gaps, excerpts, zero elapsed time and unsupported controls are never imputed', () => {
  const f = fixture(), headers = {TimeControl: '100+5'};
  const calculate = (clocks, h = headers) => gameStatistics(f.positions, f.bests, f.calibrated, {clocks, headers: h}).w.timeAhead;
  assert.equal(calculate([]), null);
  assert.equal(calculate([null, '1:45', '1:45']), null, 'Increments alone consume no time');
  assert.equal(calculate([null, '1:35'], {TimeControl: '40/7200:3600'}), null);
  assert.equal(calculate([null, '1:35'], {...headers, FEN: opening, SetUp: '1'}), null);
  const gap = calculate([null, '1:35', null, '1:20', '1:10', '1:00']);
  assert.equal(gap.turns, 2, 'Missing clock invalidates adjacent turns until fresh samples exist');
  assert.equal(gap.seconds, 35);
  assert.equal(calculate([null, '1:99']), null);
});

test('clock integration preserves fractional seconds and waits for both clocks in a black-to-move excerpt', () => {
  const f = fixture(), headers = {TimeControl: '100+5'};
  const stats = gameStatistics(f.positions, f.bests, f.calibrated,
    {clocks: [null, '1:35.5'], headers});
  assert.equal(stats.w.timeAhead.seconds, 9.5);
  assert.equal(stats.w.timeAhead.percent, 0);
  const excerpt = [{fen: opening.replace(' w ', ' b ')},
    ...['b', 'w', 'b', 'w'].map(color => ({fen: ending, color, from: 'a1', to: 'a2'}))];
  const clock = gameStatistics(excerpt, [], null,
    {clocks: [null, '1:35', '1:30', '1:20', '1:10'], headers: {...headers, SetUp: '1'}}).w.timeAhead;
  assert.equal(clock.turns, 2);
  assert.equal(clock.seconds, 45);
  assert.ok(Math.abs(clock.percent - 100 * 25 / 45) < 1e-9);
});

test('comeback measures recovery retained at the finish, respects actual results, and requires a clear deficit', () => {
  const f = fixture(), evals = [0, -400, -200, 100, 300, 0].map(cp => ({cp}));
  const calculate = result => gameStatistics(f.positions, f.bests, f.calibrated, {evals, headers: {Result: result}});
  const win = calculate('1-0');
  assert.equal(win.w.comeback.ply, 1);
  assert.ok(win.w.comeback.score > 80 && win.w.comeback.score < 82);
  assert.equal(win.b.comeback.score, 0);
  const draw = calculate('1/2-1/2').w.comeback;
  assert.ok(draw.score > 30 && draw.score < 32);
  assert.equal(calculate('0-1').w.comeback.score, 0, 'A brief rebound cannot earn comeback credit after a loss');
  assert.equal(calculate('*').w.comeback.finalResult, false);
  assert.equal(calculate('*').w.comeback.finish, .5);
  const level = gameStatistics(f.positions, f.bests, f.calibrated, {evals: evals.map(() => ({cp: 0}))});
  assert.equal(level.w.comeback.score, 0); assert.equal(level.w.comeback.hadDeficit, false);
  evals[2] = null;
  assert.equal(calculate('*').w.comeback, null);
});

test('mate scores map to endpoints for recovery and mixed-engine games cannot get a comeback score', () => {
  const f = fixture(), evals = [0, 0, 0, 0, 0, 0].map(cp => ({cp}));
  evals[1] = {mate: -4}; evals[5] = {mate: 1};
  const stats = gameStatistics(f.positions, f.bests, f.calibrated, {evals});
  assert.equal(stats.w.comeback.score, 100);
  assert.equal(stats.b.comeback.score, 0);
  f.calibrated.b.moves.forEach(move => { move.engine = 'sf19lite'; });
  assert.equal(gameStatistics(f.positions, f.bests, f.calibrated, {evals}).w.comeback, null);
});

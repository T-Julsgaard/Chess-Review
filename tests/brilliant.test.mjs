import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Chess } from '../lib/chess.js';
import { app, loadGame, branch } from './helpers/app.mjs';

const offerFen = '7k/8/4p3/8/8/8/8/K2Q4 w - - 0 1';
const pgn = (fen, moves) => `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves}`;
function moveAt(fen, uci) {
  return new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
}
function offerGame(a, evals = [{ cp: 0 }, { cp: 0 }]) {
  return loadGame(a, pgn(offerFen, '1. Qd5'), evals);
}

// Scores in these fixtures are synthetic classifier inputs, not claims that the offers are sound.
test('a sound offer needs no preceding opponent mistake, and Explore agrees', t => {
  const a = app(t), S = offerGame(a);
  a.call('computeDerived');
  assert.equal(S.classif[1], 'brilliant');
  const v = branch(a); a.call('classifyVariationMoves');
  assert.equal(v.positions[1].classif, 'brilliant');
});

test('a sacrifice in a losing position cannot become Brilliant after an opponent error', t => {
  const a = app(t), S = loadGame(a, pgn(offerFen, '1. Ka2 Kh7 2. Qd5'), [-700, -700, -500, -500].map(cp => ({ cp })));
  a.call('computeDerived');
  assert.notEqual(S.classif[3], 'brilliant');
});

test('a materially costly move with an evaluation error is not a sound brilliant', t => {
  const a = app(t), S = offerGame(a, [{ cp: 0 }, { cp: -100 }]);
  a.call('computeDerived');
  assert.equal(S._sacCache[1], true);
  assert.notEqual(S.classif[1], 'brilliant');
});

test('the only legal blocking move remains Best rather than a voluntary sacrifice', t => {
  const a = app(t), fen = 'k5rr/8/8/8/8/3B4/8/7K w - - 0 1';
  assert.deepEqual(new Chess(fen).moves(), ['Bh7']);
  const S = loadGame(a, pgn(fen, '1. Bh7'), [{ cp: 0 }, { cp: 0 }]);
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
});

test('clearly winning positions require scored alternatives and reject another easy win', t => {
  const a = app(t), S = offerGame(a, [{ cp: 1000 }, { cp: 1000 }]);
  S.bests[0].bestmove = 'd1d5';
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines = [{ score: { cp: 1000 }, pv: 'd1d5', depth: 16, bound: 'exact', multipv: 1 }, { score: { cp: 900 }, pv: 'd1e1', depth: 16, bound: 'exact', multipv: 2 }];
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines[1].score = { cp: 0 };
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
});

test('bounded, stale or metadata-free alternatives do not certify competitive relevance', t => {
  const a = app(t), S = offerGame(a, [{ cp: 1000 }, { cp: 1000 }]);
  S.bests[0] = { bestmove: 'd1d5', lines: [
    { score: { cp: 1000 }, pv: 'd1d5', depth: 16, bound: 'exact', multipv: 1 },
    { score: { cp: 0 }, pv: 'd1e1', depth: 15, bound: 'exact', multipv: 2 },
  ] };
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines[1].depth = 16; S.bests[0].lines[1].bound = 'lowerbound';
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines[1].bound = 'upperbound';
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines = S.bests[0].lines.map(({ score, pv }) => ({ score, pv }));
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
});

test('an explicitly bounded score cannot certify a brilliant in an undecided position', t => {
  const a = app(t), S = offerGame(a);
  S.bests[0].lines = [{ score: { cp: 0 }, pv: 'd1d5', bound: 'lowerbound' }];
  a.call('computeDerived'); assert.notEqual(S.classif[1], 'brilliant');
  S.bests[0].lines = []; S.bests[1].lines = [{ score: { cp: 0 }, pv: 'h8h7', bound: 'upperbound' }];
  a.call('computeDerived'); assert.notEqual(S.classif[1], 'brilliant');
});

test('mate maintenance is not automatically brilliant, and mate delays stay Good', t => {
  const a = app(t), S = offerGame(a, [{ mate: 3 }, { mate: 2 }]);
  S.bests[0].bestmove = 'd1d5';
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines = [{ score: { mate: 3 }, pv: 'd1d5', depth: 16, bound: 'exact', multipv: 1 }, { score: { mate: 5 }, pv: 'd1e1', depth: 16, bound: 'exact', multipv: 2 }];
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines[1].score = { cp: 0 };
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
  S.evals[1] = { mate: 5 }; S.bests[0].bestmove = 'd1e1'; S.bests[0].lines = [];
  a.call('computeDerived'); assert.equal(S.classif[1], 'good');
});

test('escaping a negative mate is eligible, but disappearing winning-mate evidence is not', t => {
  const a = app(t), S = offerGame(a, [{ mate: -3 }, { cp: 0 }]);
  S.bests[0].bestmove = 'd1d5';
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
  S.evals = [{ mate: 3 }, { cp: 1500 }];
  S.bests[0].lines = [{ score: { mate: 3 }, pv: 'd1d5' }, { score: { cp: 0 }, pv: 'd1e1' }];
  a.call('computeDerived'); assert.notEqual(S.classif[1], 'brilliant');
});

test('black root alternatives use mover-relative rather than white-relative scores', t => {
  const a = app(t), fen = 'k2q4/8/8/8/8/4P3/8/7K b - - 0 1';
  const S = loadGame(a, pgn(fen, '1... Qd4'), [{ cp: -1000 }, { cp: -1000 }]);
  S.bests[0] = { bestmove: 'd8d4', lines: [{ score: { cp: 1000 }, pv: 'd8d4', depth: 16, bound: 'exact', multipv: 1 }, { score: { cp: 900 }, pv: 'd8e8', depth: 16, bound: 'exact', multipv: 2 }] };
  a.call('computeDerived'); assert.equal(S.classif[1], 'best');
  S.bests[0].lines[1].score = { cp: 0 };
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
});

test('sacrifice evidence credits captures and follows legal recapture chains', t => {
  const a = app(t);
  const exchange = moveAt('7k/8/4p3/3n4/2B5/8/8/K2R4 w - - 0 1', 'd1d5');
  assert.equal(a.call('isSacrifice', exchange), true); // rook for minor and pawn: one pawn net
  const trade = moveAt('7k/8/4p3/3r4/2B5/8/8/K2R4 w - - 0 1', 'd1d5');
  assert.equal(a.call('isSacrifice', trade), false);
  const xray = moveAt('3r3k/8/4p3/3n4/2B5/8/8/K2R4 w - - 0 1', 'd1d5');
  assert.equal(a.call('isSacrifice', xray), true);
  // The bishop can decline a losing recapture, so the opponent's gain is 5, not 7.
  assert.equal(a.call('exchangeGain', new Chess(xray.after), 'd5', { nodes: 0, maxNodes: 1200 }), 5);
});

test('pinned attackers, pawn offers and unavoidable piece losses do not count', t => {
  const a = app(t);
  assert.equal(a.call('isSacrifice', moveAt('4k3/8/4p3/8/8/8/8/K2QR3 w - - 0 1', 'd1d5')), false);
  assert.equal(a.call('isSacrifice', moveAt('7k/8/4p3/8/8/3P4/8/K7 w - - 0 1', 'd3d4')), false);
  assert.equal(a.call('isSacrifice', moveAt('7k/8/8/8/3q4/8/8/3N3K w - - 0 1', 'h1h2')), false);
  const trapped = 'k7/8/8/8/2b5/8/5q2/N6K w - - 0 1';
  assert.equal(new Chess(trapped).moves().length, 2);
  assert.equal(a.call('isSacrifice', moveAt(trapped, 'a1b3')), false);
});

test('offered material does not depend on the opponent accepting it', t => {
  const a = app(t), S = loadGame(a, pgn(offerFen, '1. Qd5 Kh7'), [{ cp: 0 }, { cp: 0 }, { cp: 0 }]);
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
  S.positions.length = 2; S.evals.length = 2; S.bests.length = 2; S.total = 1;
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
});

test('quiet moves do not inherit Brilliant from an unrelated hanging piece', t => {
  const a = app(t), fen = '1k5r/8/8/8/8/8/P7/K6Q w - - 0 1';
  assert.equal(a.call('isSacrifice', moveAt(fen, 'a2a3')), false);
  const S = loadGame(a, pgn(fen, '1. a3'), [{ cp: 0 }, { cp: 0 }]);
  a.call('computeDerived'); assert.notEqual(S.classif[1], 'brilliant');
});

test('history distinguishes ignoring a new opponent threat from a persistent declined offer', t => {
  const a = app(t), fresh = '1k4r1/8/8/8/8/8/P7/K6Q w - - 0 1';
  // Synthetic equal scores isolate tempo-sacrifice eligibility, not soundness of this pawn move.
  const S = loadGame(a, pgn(fresh, '1. a3 Rh8 2. a4'));
  a.call('computeDerived'); assert.equal(S.classif[3], 'brilliant');
  const v = branch(a, 1); a.call('classifyVariationMoves');
  assert.equal(v.positions[2].classif, 'brilliant');
  loadGame(a, pgn('1k5r/8/8/8/8/8/P7/K6Q w - - 0 1', '1. a3 Kc8 2. a4'));
  a.call('computeDerived'); assert.notEqual(S.classif[3], 'brilliant');
});

test('removing a pin or defender creates an offer of an unmoved piece', t => {
  const a = app(t);
  const releasePin = moveAt('k7/8/b7/1Q6/8/8/8/R6K w - - 0 1', 'a1b1');
  assert.equal(a.call('isSacrifice', releasePin), true);
  const releaseDefender = moveAt('3r3k/8/8/3Q4/8/8/8/K2R4 w - - 0 1', 'd1e1');
  assert.equal(a.call('isSacrifice', releaseDefender), true);
});

test('defensive checking rook offers draw by stalemate when accepted and can be repeated', t => {
  const a = app(t), fen = '8/8/8/8/R7/6k1/5q2/7K w - - 0 1';
  const accepted = loadGame(a, pgn(fen, '1. Rg4+ Kxg4'), [{ cp: 0 }, { cp: 0 }, { cp: 0 }]);
  a.call('computeDerived');
  assert.equal(accepted.classif[1], 'brilliant');
  assert.equal(accepted.positions[2].draw, 'stalemate');
  const S = loadGame(a, pgn(fen, '1. Rg4+ Kh3 2. Rh4+ Kg3 3. Rg4+ Kh3 4. Rh4+ Kg3'));
  a.call('computeDerived');
  for (const ply of [1, 3, 5, 7]) assert.equal(S.classif[ply], 'brilliant');
  const v = branch(a); a.call('classifyVariationMoves');
  for (const ply of [1, 3, 5, 7]) assert.equal(v.positions[ply].classif, 'brilliant');
});

test('promotion gains are credited, and promoted pieces are not automatically sacrifices', t => {
  const a = app(t);
  assert.equal(a.call('isSacrifice', moveAt('8/P6k/8/8/8/4p3/3R4/K7 w - - 0 1', 'a7a8q')), false);
  // An unrelated promotion does not newly offer an already hanging rook.
  assert.equal(a.call('isSacrifice', moveAt('8/P6k/8/8/8/4p3/3R4/K7 w - - 0 1', 'a7a8n')), false);
  // Moving a defending pawn can offer an existing queen; credit the promotion first.
  assert.equal(a.call('isSacrifice', moveAt('1Q5r/P7/6k1/8/8/8/8/K7 w - - 0 1', 'a7a8n')), true);
  assert.equal(a.call('isSacrifice', moveAt('1Q5r/P7/6k1/8/8/8/8/K7 w - - 0 1', 'a7a8q')), false);
  assert.equal(a.call('isSacrifice', moveAt('1r5k/P7/8/8/8/8/8/7K w - - 0 1', 'a7a8q')), false);
});

test('exchange budgets conservatively return unknown and do not mutate the board', t => {
  const a = app(t), move = moveAt(offerFen, 'd1d5'), chess = new Chess(move.after), original = chess.fen();
  assert.equal(a.call('exchangeGain', chess, 'd5', { nodes: 0, maxNodes: 0 }), null);
  assert.equal(a.call('exchangeGain', chess, 'd5', { nodes: 0, maxNodes: 100 }), 9);
  assert.equal(chess.fen(), original);
});

test('completed exchange evidence can be reused but unknown branches are not cached', t => {
  const a = app(t), move = moveAt(offerFen, 'd1d5'), chess = new Chess(move.after);
  const budget = { nodes: 0, maxNodes: 128 };
  assert.equal(a.call('exchangeGain', chess, 'd5', budget), 9);
  const count = budget.nodes;
  assert.equal(a.call('exchangeGain', chess, 'd5', budget), 9);
  assert.equal(budget.nodes, count);
  const unknown = { nodes: 0, maxNodes: 0 };
  assert.equal(a.call('exchangeGain', chess, 'd5', unknown), null);
  unknown.nodes = 0; unknown.maxNodes = 128;
  assert.equal(a.call('exchangeGain', chess, 'd5', unknown), 9);
});

test('exchange trees require forced recaptures and count pawn-promotion material', t => {
  const a = app(t), forced = new Chess('kq6/R7/8/2B5/8/8/8/7K b - - 0 1');
  assert.deepEqual(forced.moves(), ['Qxa7']);
  // Qxa7 Bxa7 Kxa7: the checked side must accept a net loss of one pawn.
  assert.equal(a.call('exchangeGain', forced, 'a7', { nodes: 0, maxNodes: 128 }), -1);
  const promotion = new Chess('7K/8/7k/8/8/8/1p6/R7 b - - 0 1');
  assert.equal(a.call('exchangeGain', promotion, 'a1', { nodes: 0, maxNodes: 128 }), 13);
});

test('evaluation-dependent eligibility is refreshed without invalidating material evidence', t => {
  const a = app(t), S = offerGame(a);
  a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
  S.evals[1] = { cp: -500 };
  a.call('computeDerived'); assert.notEqual(S.classif[1], 'brilliant');
  assert.equal(S._sacCache[1], true);
  S.evals[1] = null;
  a.call('computeDerived'); assert.equal(S.classif[1], null);
});

test('brilliant annotations preserve evaluation-based accuracy and rating predictions', t => {
  const a = app(t), S = offerGame(a);
  a.context.__calibration = JSON.parse(fs.readFileSync(new URL('../data/calibration.json', import.meta.url)));
  a.run('CALIB = __calibration'); S.players.w.rating = 1600;
  S._sacCache[1] = false; a.call('computeDerived');
  const rating = () => a.call('estimateElo', S.accElo.w, S.players.w.rating);
  const before = { accuracy: S.acc.w, rating: rating(), moveAccuracy: S.accMove[1] };
  assert.equal(S.classif[1], 'excellent');
  S._sacCache[1] = true; a.call('computeDerived'); assert.equal(S.classif[1], 'brilliant');
  assert.deepEqual({ accuracy: S.acc.w, rating: rating(), moveAccuracy: S.accMove[1] }, before);
  a.run('CALIB = { ...CALIB, display: "categories" }'); a.call('computeDerived'); assert.equal(S.acc.w, 100);
  S._sacCache[1] = false; a.call('computeDerived'); assert.equal(S.acc.w, S.settings.accExcellent);
  assert.equal(rating(), before.rating);
});

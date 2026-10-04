import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, branch, fakeEngine } from './helpers/app.mjs';

function alternative(a, color) {
  const white = color === 'w';
  const S = loadGame(a, white ? '1. e4' : '1. e4 e5');
  const ply = white ? 1 : 2;
  const move = white ? 'g1f3' : 'g8f6';
  S.bests[ply - 1] = {
    bestmove: white ? 'd2d4' : 'c7c5', score: { cp: 0 },
    playedScore: { cp: -600 }, calibration: { build: S.settings.enginePath }, lines: [],
  };
  a.call('computeDerived');
  const v = branch(a, ply - 1);
  const positions = a.call('buildPositions', `[SetUp "1"]\n[FEN "${S.positions[ply - 1].fen}"]\n\n${white ? '1. Nf3' : '1... Nf6'}`);
  v.positions = [v.positions[0], { ...positions[1], eval: null, best: null }];
  v.idx = 1;
  return { S, v, ply, move };
}

for (const engine of ['nnue', 'sf19lite']) for (const color of ['w', 'b']) {
  test(`${engine} ${color}: a different branch move uses its own evaluation and waits for evidence`, t => {
    const a = app(t);
    a.state.settings.enginePath = engine;
    const { S, v, ply } = alternative(a, color);
    const saved = JSON.stringify({ evals: S.evals, bests: S.bests, classif: S.classif, grades: S.moveGrades, acc: S.acc, rating: S.accElo });
    a.call('classifyVariationMoves');
    assert.equal(v.positions[1].classif, null, 'the original move score cannot label an unevaluated alternative');
    for (const [score, expected] of [[{ cp: 0 }, 'excellent'], [{ cp: -600 }, 'blunder'], [{ mate: -3 }, 'mistake']]) {
      v.positions[1].eval = a.call('whiteRel', score, S.positions[ply - 1].fen);
      a.call('classifyVariationMoves');
      assert.equal(v.positions[1].classif, expected);
    }
    assert.equal(JSON.stringify({ evals: S.evals, bests: S.bests, classif: S.classif, grades: S.moveGrades, acc: S.acc, rating: S.accElo }), saved);
  });
}

test('a branch can use a matching root candidate without inheriting the original paired score', t => {
  const a = app(t), { S, v, move } = alternative(a, 'w');
  S.bests[0].lines = [
    { multipv: 1, score: { cp: 0 }, pv: 'd2d4', depth: 16, bound: 'exact' },
    { multipv: 2, score: { cp: -50 }, pv: move, depth: 16, bound: 'exact' },
  ];
  v.positions[1].eval = { cp: 600 };
  a.call('classifyVariationMoves');
  assert.equal(v.positions[1].classif, 'good');
});

test('later branch moves do not inherit a false Miss from the original game mistake', t => {
  const a = app(t), { v } = alternative(a, 'b');
  v.positions[1].eval = { cp: 0 };
  v.positions[1].best = { bestmove: 'd2d4', score: { cp: 0 }, lines: [] };
  const reply = a.call('buildPositions', `[SetUp "1"]\n[FEN "${v.positions[1].fen}"]\n\n2. Nc3`)[1];
  v.positions.push({ ...reply, eval: { cp: -600 }, best: null });
  v.idx = 2;
  a.call('classifyVariationMoves');
  assert.deepEqual(Array.from(v.positions.slice(1), p => p.classif), ['excellent', 'blunder']);
});

test('a branch preserves promotion identity when deciding whether to reuse a paired score', t => {
  const a = app(t), S = loadGame(a, '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=Q+');
  S.bests[0] = { bestmove: 'h1g1', score: { cp: 0 }, playedScore: { cp: -600 }, lines: [] };
  const v = branch(a);
  const alt = a.call('buildPositions', '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=N');
  v.positions[1] = { ...alt[1], eval: { cp: 0 }, best: null };
  a.call('classifyVariationMoves');
  assert.equal(v.positions[1].classif, 'excellent');
  assert.equal(S.bests[0].playedScore.cp, -600);
});

for (const entry of ['board move', 'engine line']) {
  test(`${entry}: live grades reflect streamed and completed alternative scores on the board`, async t => {
    const a = app(t), S = loadGame(a, '1. e4 e5');
    S.bests[1] = { bestmove: 'c7c5', score: { cp: 0 }, playedScore: { cp: -600 }, lines: [] };
    a.call('computeDerived'); S.idx = 1;
    a.call('buildUI'); a.call('renderAll');
    const saved = JSON.stringify({ bests: S.bests, classif: S.classif, grades: S.moveGrades });
    S.liveEngine = fakeEngine(async (fen, depth, lines, history, progress) => {
      assert.deepEqual(Array.from(history.moves), ['e2e4', 'g8f6']);
      assert.equal(S.variation.positions[1].classif, null);
      progress({ score: { cp: 50 }, bestmove: 'g1f3', lines: [] });
      assert.equal(S.variation.positions[1].classif, 'good');
      assert.match(a.dom.window.document.querySelector('.sq-badge').getAttribute('aria-label'), /^Good, score/);
      return { score: { cp: 0 }, bestmove: 'g1f3', lines: [] };
    });
    let pending;
    const request = a.run('requestLiveEval');
    a.replace('requestLiveEval', () => (pending = request()));
    if (entry === 'board move') a.call('applyUserMove', 'g8', 'f6', false);
    else a.call('playLine', 'g8f6');
    a.call('stopLineWalk');
    await pending;
    assert.equal(S.variation.positions[1].classif, 'excellent');
    assert.match(a.dom.window.document.querySelector('.sq-badge').getAttribute('aria-label'), /^Excellent, score/);
    assert.equal(JSON.stringify({ bests: S.bests, classif: S.classif, grades: S.moveGrades }), saved);
  });
}

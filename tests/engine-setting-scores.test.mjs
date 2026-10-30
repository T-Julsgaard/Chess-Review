import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Chess} from '../lib/chess.js';
import {analyseCalibratedPosition} from '../lib/calibrated-search.js';
import {calibratedReview} from '../lib/calibrated-review.js';
import {gameStatistics, GAME_PHASES} from '../lib/game-statistics.js';
import {app, loadGame, fakeEngine} from './helpers/app.mjs';

const calibration = JSON.parse(await readFile(new URL('../data/calibration.json', import.meta.url)));
// Public training game oneIHkm8, already included in the bundled calibration data.
// Includes decisions by both players in all three phases.
const pgn = '1. d4 d5 2. c3 Nc6 3. f3 Nf6 4. h4 e6 5. a4 g6 6. g4 Bd6 7. g5 Nh5 8. a5 Nf4 9. Nh3 Nh5 10. b4 b6 11. axb6 cxb6 12. e3 O-O 13. b5 Ng3 14. Rg1 Nxf1 15. Rxf1 e5 16. bxc6 Bxh3 17. Rh1 Bf5 18. dxe5 Bxe5 19. f4 Bg7 20. h5 Qd6 21. hxg6 Qxg6 22. Qxd5 Rfd8 23. Qb5 Rac8 24. Nd2 Rxc6 25. Kd1 Rxc3 26. Rxa7 Bc2+ 27. Ke2 Bd3+ 28. Qxd3 Rdxd3 29. Ra8+ Bf8 30. Bb2 Rc7 31. Ne4 Rb3 32. Be5 Rc2+ 33. Kf3 f5 34. Nf2 Kf7 35. Rh6 Bxh6 36. gxh6 Qxh6 37. Ra7+ Ke8 38. Ra8+ Kd7 39. Ra7+ Kc6 40. Nd1 Rc1 41. Nf2 Rb2 42. Ra8 Qh2 43. Rc8+ Kb7 44. Rxc1 Qxf2#';
const chess = new Chess(); chess.loadPgn(pgn);
const replay = new Chess(), positions = [{fen: replay.fen()}], moves = [];
for (const move of chess.history({verbose: true})) {
  moves.push(move.lan); replay.move(move);
  positions.push({...move, fen: replay.fen()});
}
const roots = new Map(positions.slice(0, -1).map((position, i) => [position.fen, {
  bestmove: new Chess(position.fen).moves({verbose: true}).find(move => move.lan !== moves[i])?.lan || moves[i],
  cp: [0, 180, -180][Math.floor(i / 2) % 3],
}]));
function engine(build) {
  return {...fakeEngine(async (fen, depth, count, history, progress, config) => {
    const root = roots.get(fen), bestmove = config.searchMove || root.bestmove;
    const score = {cp: root.cp - (config.searchMove ? 50 : 0), wdl: config.searchMove ? [300, 400, 300] : [400, 400, 200]};
    return {bestmove, score, lines: [{pv: bestmove, score, depth, multipv: 1, bound: 'exact'}]};
  }), buildKey: build};
}
const defaults = {engineDepth: 16, engineHash: 16, engineSkill: 20, engineWorkers: 1, classifyLines: 1};
const cases = [
  ['default', {}],
  ...Array.from({length: 15}, (_, i) => ['depth ' + (i + 8), {engineDepth: i + 8}]),
  ...Array.from({length: 16}, (_, i) => ['hash ' + (i + 1) * 16, {engineHash: (i + 1) * 16}]),
  ...Array.from({length: 21}, (_, engineSkill) => ['skill ' + engineSkill, {engineSkill}]),
  ['workers 8', {engineWorkers: 8}], ['lines 3', {classifyLines: 3}],
  ['combined custom settings', {engineDepth: 8, engineHash: 256, engineSkill: 0, classifyLines: 3}],
];

for (const build of ['nnue', 'sf19lite']) for (const mode of ['context', 'moves']) {
  test(`${build}, ${mode}: engine settings retain overall, phase, rating and advanced scores`, async t => {
    for (const [name, patch] of cases) await t.test(name, async () => {
      const settings = {...defaults, ...patch, enginePath: build}, eng = engine(build), bests = [];
      for (let i = 0; i < moves.length; i++) bests.push(await analyseCalibratedPosition(eng, {
        fen: positions[i].fen, history: {initialFen: positions[0].fen, moves: moves.slice(0, i)},
        played: moves[i], settings, calibration, needMovesOnly: mode === 'moves',
      }));
      const review = calibratedReview(positions, bests, calibration, {w: {rating: 1500}, b: {rating: 1500}}, mode);
      const stats = gameStatistics(positions, bests, review, {classifications: positions.map(() => 'good')});
      for (const color of ['w', 'b']) {
        assert.equal(review[color].complete, true);
        assert.ok(Number.isFinite(review[color].accuracy), color + ' overall accuracy');
        assert.ok(Number.isFinite(review[color].rating), color + ' estimated rating');
        assert.equal(review[color].ratingMethod, mode);
        for (const phase of GAME_PHASES) {
          assert.ok(stats[color].phases[phase].moves > 0, color + ' ' + phase + ' fixture');
          assert.ok(Number.isFinite(stats[color].phases[phase].accuracy), color + ' ' + phase + ' accuracy');
        }
        assert.ok(Number.isFinite(stats[color].averageCpLoss));
        assert.ok(Number.isFinite(stats[color].topMatch));
        assert.ok(stats[color].largestLoss);
        assert.ok(stats[color].cleanStreak);
        for (const key of ['balanced', 'winning', 'defending']) assert.ok(Number.isFinite(stats[color].insights[key].accuracy));
        assert.ok(Number.isFinite(stats[color].insights.bestStretch.accuracy));
      }
    });
  });
}

test('changing builds and then returning to custom SF18 settings retains complete scores', async t => {
  const a = app(t), S = loadGame(a, pgn);
  S.players.w.rating = S.players.b.rating = 1500;
  Object.assign(S.settings, {...defaults, engineDepth: 8, engineHash: 64, engineSkill: 10});
  a.call('computeDerived'); a.call('buildUI');
  a.replace('calibrationWarning', async () => true);
  a.replace('schedulePanelPrecalculation', () => {});
  a.replace('renderEngineCurrent', () => {});
  a.replace('createEngine', async () => engine(S.settings.enginePath));
  let pending;
  a.replace('scheduleReanalyze', () => {pending = a.call('startAnalysis');});
  await a.call('startAnalysis');
  for (const build of ['sf19lite', 'nnue']) {
    await a.call('setEngineSetting', 'enginePath', build); await pending;
    assert.equal(S.analysisError, null);
    assert.ok(S.bests.slice(0, S.total).every(root => root.calibration.build === build));
    for (const color of ['w', 'b']) {
      assert.ok(Number.isFinite(S.acc[color]));
      assert.ok(Number.isFinite(S.calibrated[color].rating));
      assert.ok(Number.isFinite(S.gameStats[color].averageCpLoss));
    }
  }
});

test('custom SF18 estimates still reject stale models, invalid scores and setup-FEN excerpts', async () => {
  const bests = [], eng = engine('nnue'), settings = {...defaults, enginePath: 'nnue', engineDepth: 8};
  for (let i = 0; i < moves.length; i++) bests.push(await analyseCalibratedPosition(eng, {
    fen: positions[i].fen, history: {initialFen: positions[0].fen, moves: moves.slice(0, i)},
    played: moves[i], settings, calibration,
  }));
  assert.ok(bests.every(root => root.calibration.qualityVersion === null));
  const players = {w: {rating: 1500}, b: {rating: 1500}};
  for (const mutate of [
    root => {root.calibration.qualityVersion = 'stale';},
    root => {delete root.calibration.qualityVersion;},
    root => {root.calibration.version = 'stale';},
    root => {root.score.cp = NaN;},
    root => {root.playedScore = {mate: 0};},
  ]) {
    const damaged = structuredClone(bests); mutate(damaged[0]);
    const scored = calibratedReview(positions, damaged, calibration, players);
    assert.equal(scored.w.complete, false);
    assert.equal(scored.w.accuracy, null);
    assert.equal(scored.w.rating, null);
  }
  const excerpt = calibratedReview(positions.slice(1), bests.slice(1), calibration, players);
  for (const color of ['w', 'b']) {
    assert.equal(excerpt[color].accuracy, null);
    assert.equal(excerpt[color].rating, null);
  }
});

for (const design of ['original', 'pages', 'dials', 'phases', 'phases2', 'phases-modern', 'phases-modern-v2']) {
  test(`${design}: a custom-settings analysis renders scores and restores them from the library`, async t => {
    const a = app(t), S = loadGame(a, pgn);
    S.players.w.rating = S.players.b.rating = 1500;
    Object.assign(S.settings, {...defaults, engineDepth: 8, engineHash: 64, engineSkill: 10, accuracyDesign: design});
    a.call('computeDerived'); a.call('buildUI');
    a.replace('schedulePanelPrecalculation', () => {});
    a.replace('renderEngineCurrent', () => {});
    a.replace('createEngine', async () => engine('nnue'));
    await a.call('startAnalysis');
    assert.equal(S.analysisError, null);
    for (const color of ['w', 'b']) {
      assert.ok(Number.isFinite(S.acc[color]));
      assert.ok(Number.isFinite(S.calibrated[color].rating));
    }
    const doc = a.dom.window.document;
    a.call('renderStats');
    assert.equal(doc.querySelectorAll('.acc-val').length, 2);
    assert.ok([...doc.querySelectorAll('.acc-val')].every(node => /\d/.test(node.textContent)));
    const rating = doc.querySelectorAll('.acc-elo, .est-rating');
    assert.equal(rating.length, 2);
    assert.ok([...rating].every(node => /≈\s*\d/.test(node.textContent)));
    if (design !== 'original') {
      assert.equal(doc.querySelectorAll('[data-phase]').length, 3);
      assert.ok([...doc.querySelectorAll('[data-phase]')].every(node => !node.textContent.includes('—')));
      a.call('setAccuracyPage', 2);
      assert.doesNotMatch(doc.querySelector('.acc-advanced').textContent, /No scored decisions/);
      if (design.startsWith('phases-modern')) for (const metric of ['loss', 'match', 'largest', 'best-five', 'balanced', 'winning', 'defending']) {
        assert.ok([...doc.querySelectorAll(`[data-metric="${metric}"] .acc-stat-value`)].every(node => /\d/.test(node.textContent)), metric);
      }
    }
    const saved = {pgn: S.pgn, settingsKey: a.call('analysisSettingsKey'), engineBuild: 'nnue',
      bests: structuredClone(S.bests), evals: structuredClone(S.evals)};
    assert.equal(a.call('canRestoreAnalysis', saved), true);
    const accuracy = {...S.acc}, stats = JSON.stringify(S.gameStats);
    a.replace('startAnalysis', () => {throw Error('Valid custom-settings cache should restore');});
    await a.call('applyGame', {pgn: S.pgn, meta: {myName: 'White'}, source: 'library', analysis: saved});
    assert.equal(S.acc.w, accuracy.w); assert.equal(S.acc.b, accuracy.b);
    assert.equal(JSON.stringify(S.gameStats), stats);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';
import {gameStatistics, GAME_PHASES} from '../lib/game-statistics.js';

const opening = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const middle = 'r2q1rk1/ppp2ppp/2nbpn2/3p4/3P4/2NBPN2/PPPQ1PPP/R4RK1 w - - 0 10';
const ending = '6k1/pp3ppp/8/3r4/3R4/8/PP3PPP/6K1 w - - 0 30';
// Two decisions per phase; completion can arrive out of order from the pool.
const positions = [opening, opening, middle, middle, ending, ending, ending].map((fen, ply) =>
  ({fen, color: ply % 2 ? 'w' : 'b'}));
const scores = (plies) => gameStatistics(positions, [], Object.fromEntries(['w', 'b'].map(side =>
  [side, {moves: plies.filter(ply => positions[ply].color === side).map(ply =>
    ({ply, eligible: true, engine: 'nnue', quality: 90}))}])));

for (const design of ['dials', 'phases-modern', 'phases-modern-v2']) {
  test(`${design} counts up each completed phase without interrupting earlier reveals`, t => {
    const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
    a.call('computeDerived'); a.call('buildUI');
    const callbacks = new Map(); let id = 0;
    a.context.requestAnimationFrame = callback => { callbacks.set(++id, callback); return id; };
    a.context.cancelAnimationFrame = id => callbacks.delete(id);
    const tick = now => { const work = [...callbacks.values()]; callbacks.clear(); work.forEach(fn => fn(now)); };
    Object.assign(a.state, {analyzing: true, progressiveAccuracy: true, gameStats: scores([])});
    Object.assign(a.state.settings, {accuracyDesign: design, moveAnim: true});
    a.call('renderStats');
    const doc = a.dom.window.document, loader = doc.querySelector('.acc-val');
    a.state.gameStats = scores([1, 2]); a.call('renderStats');
    const openingRow = doc.querySelector('[data-phase="opening"]');
    const ink = openingRow.querySelector('.acc-reveal-ink');
    assert.equal(ink.textContent, '0.0');
    tick(0); tick(300);
    assert.ok(+ink.textContent > 0 && +ink.textContent < 90);
    a.state.gameStats = scores([1, 2, 3, 4]); a.call('renderStats');
    assert.equal(doc.querySelector('[data-phase="opening"]'), openingRow);
    assert.equal(doc.querySelector('.acc-val'), loader);
    assert.equal(doc.querySelector('[data-phase="middlegame"] .acc-reveal-ink').textContent, '0.0');
    tick(600); tick(1200);
    assert.equal(openingRow.querySelector('.acc-reveal-slot'), null);
    a.state.gameStats = scores([1, 2, 3, 4, 5, 6]); a.call('renderStats');
    const endgameRow = doc.querySelector('[data-phase="endgame"]');
    a.state.analyzing = false; a.state.acc = {w: 90, b: 90}; a.call('renderStats');
    assert.equal(doc.querySelector('[data-phase="endgame"]'), endgameRow);
    assert.equal(endgameRow.querySelector('.acc-reveal-ink').textContent, '0.0');
    tick(1300); tick(2500);
    assert.equal(doc.querySelector('[data-phase] .acc-reveal-slot'), null);
    assert.equal(endgameRow.querySelector('strong').textContent, '90.0');
    a.call('setAccuracyPage', 1); a.call('setAccuracyPage', 0);
    assert.equal(doc.querySelector('[data-phase] .acc-reveal-slot'), null);
  });
}

test('turning animations off settles an in-progress phase reveal', async t => {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI');
  Object.assign(a.state, {analyzing: true, progressiveAccuracy: true, gameStats: scores([])});
  Object.assign(a.state.settings, {accuracyDesign: 'phases-modern', moveAnim: true});
  a.call('renderStats'); a.state.gameStats = scores([1, 2]); a.call('renderStats');
  assert.ok(a.dom.window.document.querySelector('[data-phase="opening"] .acc-reveal-slot'));
  await a.call('setSetting', 'moveAnim', false);
  assert.equal(a.dom.window.document.querySelector('[data-phase] .acc-reveal-slot'), null);
  assert.equal(a.dom.window.document.querySelector('[data-phase="opening"] strong').textContent, '90.0');
});

for (const design of ['pages', 'dials', 'reveal', 'phases', 'phases2', 'phases-modern', 'phases-modern-v2']) {
  test(`${design} reveals completed phases in order while preserving loaders, tabs and focus`, t => {
    const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
    a.call('computeDerived'); a.call('buildUI');
    Object.assign(a.state, {analyzing: true, progressiveAccuracy: true, gameStats: scores([])});
    a.state.settings.accuracyDesign = design;
    a.call('renderStats');
    const doc = a.dom.window.document, loader = doc.querySelector('.acc-val');
    const rail = doc.querySelector('.acc-navigation'); rail.querySelector('button').focus();
    const focused = doc.activeElement;
    const text = phase => doc.querySelector(`[data-phase="${phase}"]`).textContent;
    assert.ok(GAME_PHASES.every(phase => text(phase).includes('···')));
    // A later phase must wait for the opening's missing Black observation.
    a.state.gameStats = scores([1, 3, 4]); a.call('renderStats');
    assert.ok(GAME_PHASES.every(phase => text(phase).includes('···')));
    a.state.gameStats = scores([1, 2, 3, 4]); a.call('renderStats');
    for (const phase of ['opening', 'middlegame']) {
      assert.doesNotMatch(text(phase), /···/); assert.match(text(phase), /90\.0/);
    }
    assert.match(text('endgame'), /···/);
    assert.equal(doc.querySelector('.acc-val'), loader);
    assert.equal(doc.querySelector('.acc-navigation'), rail);
    assert.equal(doc.activeElement, focused);
    a.state.gameStats = scores([1, 2, 3, 4, 5, 6]); a.call('renderStats');
    assert.doesNotMatch(text('endgame'), /···/); assert.match(text('endgame'), /90\.0/);
    if (design === 'dials' || design === 'reveal') {
      assert.equal(doc.querySelector('.acc-phase-bars i').style.width, '90%');
    }
    a.state.analyzing = false; a.state.acc = {w: 90, b: 90};
    a.state.settings.moveAnim = true; a.call('renderStats');
    assert.equal(doc.querySelector('[data-phase] .acc-reveal-slot'), null, 'Completed phases must not restart at zero');
    assert.ok(GAME_PHASES.every(phase => text(phase).includes('90.0')));
  });
}

for (const source of ['library', 'cached import']) {
  test(`${source} restores all phase scores immediately without a staged reveal or new analysis`, async t => {
    const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
    const calibration = a.run('CALIB');
    a.state.bests.forEach(root => Object.assign(root, {playedScore: {cp: 0},
      calibration: {version: calibration.version, build: 'nnue', qualityVersion: calibration.quality.candidateVersion}}));
    a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
    const saved = {pgn: a.state.pgn, settingsKey: a.call('analysisSettingsKey'),
      bests: structuredClone(a.state.bests), evals: structuredClone(a.state.evals)};
    a.state.settings.moveAnim = true;
    a.replace('startAnalysis', () => {throw Error('Restored reviews must not start analysis');});
    const meta = {gameId: 'saved-review'};
    if (source === 'library') await a.call('applyGame', {pgn: saved.pgn, meta, analysis: saved});
    else {
      a.store['analysis:saved-review'] = saved;
      await a.call('applyGame', {pgn: saved.pgn, meta});
    }
    assert.equal(a.state.analyzing, false);
    assert.equal(a.state.restoredAnalysis, true);
    const panel = a.dom.window.document.querySelector('.accuracy-panel');
    assert.equal(panel.querySelector('[data-revealing],.acc-reveal-slot,.ld'), null);
    assert.doesNotMatch(panel.textContent, /···/);
    assert.match(panel.querySelector('[data-phase="opening"]').textContent, /100\.0/);
    assert.match(panel.querySelector('[data-phase="endgame"]').textContent, /—/);
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, branch, fakeEngine, settle} from './helpers/app.mjs';
import {panelDesign} from '../lib/panel-designs.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.state.settings.evalbarDesign = 'balance';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Tabs offers only Evaluation bar styles and saves without changing analysis or layout', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting', 'evalbarDesign', 'original');
  assert.equal(panelDesign('evalbar', {}), 'original');
  await a.call('toggleSettings');
  const section = [...doc.querySelectorAll('.set-section')].find(n => n.querySelector('.set-sect-head').textContent === 'Tabs');
  section.querySelector('.set-sect-head').click();
  assert.equal(section.querySelector('[data-setting="evalbarDesign"]'), null);
  assert.equal(section.querySelector('[data-setting="barStyle"]').getAttribute('aria-label'), 'Evaluation bar');
  assert.deepEqual([...section.querySelectorAll('.lib-dd-opt[data-setting="barStyle"]')].map(n => n.textContent), ['Gradient', 'Solid', 'Mono', 'Accent', 'Flat', 'Flat v2']);
  const before = JSON.stringify({evals: a.state.evals, bests: a.state.bests, idx: a.state.idx, layout: a.state.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design choices must not start analysis'); });
  for (const value of ['classic', 'mono', 'accent', 'flat', 'flat2', 'gradient']) {
    doc.querySelector('[data-setting="barStyle"][data-value="'+value+'"]').click();
    await settle(); await a.run('_settingsWriteQueue');
    assert.equal(a.store.settings.barStyle, value);
    assert.equal(doc.querySelector('.evalbar').dataset.design, 'original');
    assert.ok(doc.querySelector('.evalbar').classList.contains('eb-' + value));
    assert.equal(JSON.stringify({evals: a.state.evals, bests: a.state.bests, idx: a.state.idx, layout: a.state.layout}), before);
  }
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {evalbarDesign: 'balance'};
  await restored.start();
  assert.equal(restored.store.settings.evalbarDesign, 'original');
});

for (const style of ['flat', 'flat2']) test(`${style} keeps scores, mates and board orientation live and restores the saved style`, async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting', 'evalbarDesign', 'original');
  await a.call('setSetting', 'barStyle', style);
  const bar = doc.querySelector('.evalbar'), fill = bar.querySelector('.white-fill');
  for (const [evaluation, text, share, side] of [
    [{cp: 0}, '0.0', 50, 'bot'],
    [{cp: 120}, '1.2', 59.2, 'bot'],
    [{cp: -230}, '2.3', 32.36666666666667, 'top'],
    [{cp: 1800}, '18.0', 96, 'bot'],
    [{mate: 3}, '#3', 100, 'bot'],
    [{mate: -2}, '#2', 0, 'top'],
  ]) {
    a.state.evals[0] = evaluation;
    for (const flipped of [false, true]) {
      a.state.flipped = flipped; a.call('renderEvalBar');
      assert.equal(doc.querySelector('.evalbar'), bar);
      assert.equal(bar.querySelector('.white-fill'), fill);
      assert.equal(bar.classList.contains('flipped'), flipped);
      assert.equal(bar.querySelector('.score.' + side).textContent, text);
      assert.equal(bar.querySelector('.score.' + (side === 'bot' ? 'top' : 'bot')).textContent, '');
      assert.ok(Math.abs(parseFloat(fill.style.height) - share) < .001);
    }
  }
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {barStyle: a.store.settings.barStyle};
  await restored.start();
  assert.ok(restored.dom.window.document.querySelector('.evalbar.eb-' + style));
});

test('Balance explains signs and mates, follows flips, and keeps live nodes mounted', t => {
  const a = review(t), doc = a.dom.window.document;
  const bar = doc.querySelector('.eval-balance'), fill = bar.querySelector('.white-fill');
  for (const [e, text, description, share] of [
    [{cp: 0}, '0.0', /Equal position/, 50],
    [{cp: 120}, '+1.2', /White is ahead by 1.2 pawns/, 59.2],
    [{cp: -230}, '-2.3', /Black is ahead by 2.3 pawns/, 32.36666666666667],
    [{cp: 1800}, '+18.0', /White is ahead by 18.0 pawns/, 96],
    [{mate: 3}, 'M3', /White has mate in 3/, 100],
    [{mate: -2}, 'M2', /Black has mate in 2/, 0],
  ]) {
    a.state.evals[0] = e; a.call('renderEvalBar');
    assert.equal(bar.querySelector('.eval-balance-score').textContent, text);
    assert.match(bar.getAttribute('aria-label'), description);
    assert.equal(bar.dataset.favored, e.cp === 0 ? 'equal' : (e.cp ?? e.mate) > 0 ? 'white' : 'black');
    assert.ok(Math.abs(parseFloat(fill.style.height) - share) < .001);
    a.state.flipped = !a.state.flipped; a.call('renderEvalBar');
    assert.equal(bar.classList.contains('flipped'), a.state.flipped);
    assert.equal(doc.querySelector('.evalbar'), bar);
    assert.equal(bar.querySelector('.white-fill'), fill);
  }
});

test('pending variation search retains the rail but replaces stale score with a calculating state', t => {
  const a = review(t), bar = a.dom.window.document.querySelector('.eval-balance');
  a.state.evals[0] = {cp: 230}; a.call('renderEvalBar');
  const height = bar.querySelector('.white-fill').style.height;
  const variation = branch(a); variation.positions[variation.idx].eval = null;
  a.call('renderEvalBar');
  assert.equal(bar.querySelector('.white-fill').style.height, height);
  assert.equal(bar.querySelector('.eval-balance-score').textContent, '…');
  assert.match(bar.getAttribute('aria-label'), /calculating/);
  variation.positions[variation.idx].eval = {cp: -80}; a.call('renderEvalBar');
  assert.equal(bar.querySelector('.eval-balance-score').textContent, '-0.8');
  assert.equal(bar.dataset.pending, 'false');
});

for (const design of ['original', 'balance']) for (const [winner, pgn, share] of [
  ['White', '1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7#', '100%'],
  ['Black', '1. f3 e5 2. g4 Qh4#', '0%'],
]) {
  test(`${design}: ${winner}'s checkmate keeps its color when live analysis is reused`, async t => {
    const a = app(t), S = loadGame(a, pgn);
    Object.assign(S.settings, {evalbarDesign: design, engineLines: 1});
    S.bests[S.total] = null; S.evals[S.total] = null;
    a.call('computeDerived'); a.call('buildUI');
    const v = branch(a), node = v.positions[v.idx];
    a.replace('ensureLiveEngine', async () => fakeEngine(() => {
      throw Error('Checkmate must be evaluated from the board');
    }));
    for (let visit = 0; visit < 3; visit++) {
      await a.call('requestLiveEval');
      assert.equal(S.liveError, null);
      assert.equal(node.eval.mate, winner === 'White' ? 1 : -1);
      for (const flipped of [false, true]) {
        S.flipped = flipped; a.call('renderEvalBar');
        const bar = a.dom.window.document.querySelector('.evalbar');
        assert.equal(bar.querySelector('.white-fill').style.height, share);
        if (design === 'balance') assert.equal(bar.dataset.favored, winner.toLowerCase());
      }
      // Reopening a branch must also recover the correct score from the cache.
      node.eval = null; node.best = null;
    }
  });
}

test('visibility and animation settings apply to Balance and saved choices restore on startup', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting', 'evalView', 'graph');
  assert.equal(doc.querySelector('.mod[data-mod="evalbar"]').style.display, 'none');
  await a.call('setSetting', 'evalView', 'both');
  await a.call('setSetting', 'moveAnim', false);
  assert.equal(doc.querySelector('.eval-balance').dataset.motion, 'off');
  const b = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  b.replace('resetSettingsForRelease', async () => {});
  b.store.settings = {evalbarDesign: 'original'}; await b.start();
  assert.equal(b.dom.window.document.querySelector('.evalbar').dataset.design, 'original');
});

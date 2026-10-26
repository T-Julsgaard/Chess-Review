import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {normalizePanelDesigns, panelDesign} from '../lib/panel-designs.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Visual > Tabs exposes independent Accuracy and Move list design choices', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('toggleSettings');
  const section = () => [...doc.querySelectorAll('.set-section')].find(node => node.querySelector('.set-sect-head').textContent === 'Tabs');
  section().querySelector('.set-sect-head').click();
  assert.deepEqual([...section().querySelectorAll('[data-setting="accuracyDesign"]')].map(node => node.textContent), ['Original', 'Page tabs', 'Dials']);
  assert.deepEqual([...section().querySelectorAll('[data-setting="movesDesign"]')].map(node => node.textContent), ['Original', 'Full height']);
  const option = section().querySelector('[data-setting="accuracyDesign"][data-value="original"]');
  option.focus(); option.click(); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.accuracyDesign, 'original');
  assert.equal(a.state.settings.movesDesign, 'full');
  assert.equal(doc.activeElement.dataset.setting, 'accuracyDesign');
  assert.equal(doc.activeElement.dataset.value, 'original');
});

test('all Accuracy iterations use the same scores and fixed layout without engine work', async t => {
  const a = review(t), doc = a.dom.window.document, S = a.state;
  S.acc = {w: 93.6, b: 81.2}; S.idx = 3;
  const before = JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, acc: S.acc, classif: S.classif, idx: S.idx, layout: S.layout});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not reanalyze'); });
  for (const design of ['original', 'pages', 'dials', 'original', 'dials']) {
    await a.call('setSetting', 'accuracyDesign', design);
    assert.equal(doc.querySelector('.accuracy-panel').dataset.design, design);
    assert.match(doc.querySelector('.accuracy-panel').textContent, /93\.6/);
    assert.equal(JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, acc: S.acc, classif: S.classif, idx: S.idx, layout: S.layout}), before);
  }
});

test('Original Accuracy restores the summary, expander and explainer; current designs keep their own navigation', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('setSetting', 'accuracyDesign', 'original');
  assert.match(doc.querySelector('.accuracy-panel .panel-head').textContent, /Accuracy/);
  assert.equal(doc.querySelectorAll('.accuracy-original .qbreak-row').length, 7);
  doc.querySelector('.qbreak-toggle').click();
  assert.equal(doc.querySelectorAll('.accuracy-original .qbreak-row').length, 10);
  assert.equal(a.state.qbreakExpanded, false);
  doc.querySelector('[data-category="brilliant"]').dispatchEvent(new a.dom.window.MouseEvent('mouseenter'));
  assert.ok(doc.querySelector('.q-tip.show'));
  await a.call('setSetting', 'accuracyDesign', 'pages');
  assert.equal(doc.querySelector('.q-tip.show'), null);
  assert.equal(doc.querySelectorAll('.acc-tabs [role="tab"]').length, 3);
  doc.querySelector('#accuracy-tab-1').click(); assert.equal(doc.querySelectorAll('.qbreak-row').length, 10);
  await a.call('setSetting', 'accuracyDesign', 'dials');
  assert.ok(doc.querySelector('.acc-pager')); assert.equal(doc.querySelector('.acc-tabs'), null);
  assert.equal(a.state.accuracyPage, 1);
});

test('Full height moves remove both frame strips and retain the mounted moves and current position', async t => {
  const a = review(t), doc = a.dom.window.document, list = doc.querySelector('#movesBody').firstChild;
  a.state.idx = 3;
  assert.equal(doc.querySelector('.moves-head,.moves-foot'), null);
  await a.call('setSetting', 'movesDesign', 'original');
  assert.equal(doc.querySelector('.moves-panel').dataset.design, 'original');
  assert.equal(doc.querySelector('.moves-head').textContent, 'Moves');
  assert.ok(doc.querySelector('.moves-foot'));
  assert.equal(doc.querySelector('#movesBody').firstChild, list);
  await a.call('setSetting', 'movesDesign', 'full');
  assert.equal(doc.querySelector('.moves-head,.moves-foot'), null);
  assert.equal(doc.querySelector('.moves-panel').lastElementChild.id, 'movesBody');
  assert.equal(doc.querySelector('#movesBody').firstChild, list);
  assert.equal(a.state.idx, 3); assert.equal(a.state.settings.accuracyDesign, 'dials');
});

test('switching designs during analysis rebuilds the correct counters and keeps updates live', async t => {
  const a = review(t), doc = a.dom.window.document; a.state.analyzing = true;
  for (const design of ['original', 'pages', 'dials']) {
    await a.call('setSetting', 'accuracyDesign', design);
    if (design !== 'original') a.call('setAccuracyPage', 1);
    a.state.counts.w.blunder = 4;
    a.call('renderStats');
    assert.equal(doc.querySelector('[data-category="blunder"]').closest('.qbreak-row').querySelector('.ct.left').textContent, '4');
    a.state.counts.w.blunder = 1;
  }
});

test('saved choices survive startup and Visual reset restores the latest designs', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {accuracyDesign: 'original', movesDesign: 'original'};
  await a.start();
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'original');
  assert.equal(doc.querySelector('.moves-panel').dataset.design, 'original');
  await a.call('resetVisualSettings');
  assert.equal(a.store.settings.accuracyDesign, 'dials');
  assert.equal(a.store.settings.movesDesign, 'full');
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'dials');
  assert.equal(doc.querySelector('.moves-foot,.moves-head'), null);
});

test('invalid or missing saved designs fall back to supported defaults', () => {
  const settings = {accuracyDesign: 'deleted', movesDesign: null};
  assert.equal(normalizePanelDesigns(settings), true);
  assert.deepEqual(settings, {accuracyDesign: 'dials', movesDesign: 'full'});
  assert.equal(normalizePanelDesigns(settings), false);
  assert.equal(panelDesign('accuracy', {}), 'dials');
});

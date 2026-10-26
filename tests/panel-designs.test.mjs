import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {PANEL_DESIGNS, normalizePanelDesigns, panelDesign} from '../lib/panel-designs.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Visual > Tabs distinguishes Accuracy overview, move quality and advanced designs', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('toggleSettings');
  const section = () => [...doc.querySelectorAll('.set-section')].find(node => node.querySelector('.set-sect-head').textContent === 'Tabs');
  section().querySelector('.set-sect-head').click();
  const labels = [...section().querySelectorAll('.set-lbl')].map(node => node.textContent);
  for (const label of ['Accuracy overview', 'Accuracy move quality', 'Accuracy advanced']) assert.ok(labels.includes(label), label);
  assert.deepEqual([...section().querySelectorAll('[data-setting="accuracyDesign"]')].map(node => node.textContent), ['Original', 'Page tabs', 'Dials', 'Reveal', 'Phase report', 'Phase report 2']);
  assert.deepEqual([...section().querySelectorAll('[data-setting="accuracyQualityDesign"]')].map(node => node.textContent), ['Original', 'Distribution']);
  assert.deepEqual([...section().querySelectorAll('[data-setting="accuracyAdvancedDesign"]')].map(node => node.textContent), ['Original']);
  assert.deepEqual([...section().querySelectorAll('[data-setting="movesDesign"]')].map(node => node.textContent), ['Original', 'Full height', 'Zoomed in', 'Zoom +20%']);
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
  for (const design of ['original', 'pages', 'dials', 'reveal', 'phases', 'phases2', 'original', 'phases']) {
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
  assert.equal(a.state.idx, 3); assert.equal(a.state.settings.accuracyDesign, 'phases');
});

test('switching designs during analysis rebuilds the correct counters and keeps updates live', async t => {
  const a = review(t), doc = a.dom.window.document; a.state.analyzing = true;
  for (const design of ['original', 'pages', 'dials', 'reveal', 'phases', 'phases2']) {
    await a.call('setSetting', 'accuracyDesign', design);
    if (design !== 'original') a.call('setAccuracyPage', 1);
    a.state.counts.w.blunder = 4;
    a.call('renderStats');
    assert.equal(doc.querySelector('[data-category="blunder"]').closest('.qbreak-row').querySelector('.ct.left').textContent, '4');
    a.state.counts.w.blunder = 1;
  }
});

for (const design of ['zoomed', 'zoom20']) test(`${design} keeps move cells mounted and the selected move visible when rows grow`, async t => {
  const a = review(t), doc = a.dom.window.document, S = a.state;
  S.idx = 6;
  a.call('highlightCurrentMove');
  const body = doc.querySelector('#movesBody'), list = body.firstChild, cell = body.querySelector('[data-ply="6"]');
  const before = JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, idx: S.idx, layout: S.layout});
  Object.defineProperties(body, {offsetHeight: {value: 100}, clientHeight: {value: 100}, clientTop: {value: 0}});
  body.getBoundingClientRect = () => ({top: 0, bottom: 100, height: 100});
  cell.getBoundingClientRect = () => ({top: 100 - body.scrollTop, bottom: 148 - body.scrollTop});
  a.replace('scheduleReanalyze', () => { throw Error('Design changes must not reanalyze'); });
  await a.call('setSetting', 'movesDesign', design);
  assert.equal(a.store.settings.movesDesign, design);
  assert.equal(doc.querySelector('.moves-panel').dataset.design, design);
  assert.equal(doc.querySelector('.moves-head,.moves-foot'), null);
  assert.equal(body.firstChild, list);
  assert.equal(body.querySelector('.current'), cell);
  assert.equal(body.scrollTop, 56);
  assert.equal(JSON.stringify({positions: S.positions, bests: S.bests, evals: S.evals, idx: S.idx, layout: S.layout}), before);
});

for (const design of ['zoomed', 'zoom20']) test(`saved ${design} choice is restored on startup`, async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {movesDesign: design};
  await a.start();
  assert.equal(a.dom.window.document.querySelector('.moves-panel').dataset.design, design);
});

test('saved choices survive startup and Visual reset restores the latest designs', async t => {
  const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'}), doc = a.dom.window.document;
  a.replace('resetSettingsForRelease', async () => {});
  a.store.settings = {accuracyDesign: 'original', movesDesign: 'original'};
  await a.start();
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'original');
  assert.equal(doc.querySelector('.moves-panel').dataset.design, 'original');
  await a.call('resetVisualSettings');
  assert.equal(a.store.settings.accuracyDesign, 'phases');
  assert.equal(a.store.settings.movesDesign, 'full');
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'phases');
  assert.equal(doc.querySelector('.moves-foot,.moves-head'), null);
});

test('invalid or missing saved designs fall back to supported defaults', () => {
  const settings = {accuracyDesign: 'deleted', movesDesign: null};
  assert.equal(normalizePanelDesigns(settings), true);
  assert.deepEqual(settings, Object.fromEntries(PANEL_DESIGNS.map(design => [design.setting, design.default])));
  assert.equal(normalizePanelDesigns(settings), false);
  assert.equal(panelDesign('accuracy', {}), 'phases');
});

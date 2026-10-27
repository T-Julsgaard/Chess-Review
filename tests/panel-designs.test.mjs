import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, settle} from './helpers/app.mjs';
import {PANEL_DESIGNS, normalizePanelDesigns, panelDesign} from '../lib/panel-designs.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('Visual > Tabs offers compact dropdowns for Accuracy and Move list designs', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('toggleSettings');
  const section = () => [...doc.querySelectorAll('.set-section')].find(node => node.querySelector('.set-sect-head').textContent === 'Tabs');
  section().querySelector('.set-sect-head').click();
  assert.equal(section().querySelector('.set-seg'), null);
  assert.equal(section().querySelectorAll('.set-dropdown').length, 7);
  const labels = [...section().querySelectorAll('.set-lbl')].map(node => node.textContent);
  for (const label of ['Accuracy overview', 'Accuracy move quality']) assert.ok(labels.includes(label), label);
  assert.deepEqual([...section().querySelectorAll('.lib-dd-opt[data-setting="accuracyDesign"]')].map(node => node.textContent), ['Original', 'Game phases']);
  assert.deepEqual([...section().querySelectorAll('.lib-dd-opt[data-setting="accuracyQualityDesign"]')].map(node => node.textContent), ['Original', 'Category bars']);
  assert.deepEqual([...section().querySelectorAll('.lib-dd-opt[data-setting="accuracyAdvancedDesign"]')].map(node => node.textContent), []);
  assert.deepEqual([...section().querySelectorAll('.lib-dd-opt[data-setting="movesDesign"]')].map(node => node.textContent), ['Original', 'Edge-to-edge', 'Large text', 'Comfortable']);
  const option = section().querySelector('[data-setting="accuracyDesign"][data-value="original"]');
  option.focus(); option.click(); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.accuracyDesign, 'original');
  assert.equal(a.state.settings.movesDesign, 'full');
  assert.equal(doc.activeElement.dataset.setting, 'accuracyDesign');
  assert.equal(doc.activeElement.className, 'lib-dd-btn');
});

test('Tabs dropdowns support keyboard navigation, selection and outside dismissal', async t => {
  const a = review(t), doc = a.dom.window.document, win = a.dom.window;
  await a.call('toggleSettings');
  [...doc.querySelectorAll('.set-sect-head')].find(n => n.textContent === 'Tabs').click();
  const trigger = () => doc.querySelector('.lib-dd-btn[data-setting="accuracyDesign"]');
  trigger().focus();
  trigger().dispatchEvent(new win.KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
  assert.equal(trigger().getAttribute('aria-expanded'), 'true');
  assert.equal(doc.activeElement.getAttribute('aria-selected'), 'true');
  doc.activeElement.dispatchEvent(new win.KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
  assert.equal(doc.activeElement.textContent, 'Original');
  doc.activeElement.click(); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.accuracyDesign, 'original');
  assert.equal(doc.activeElement, trigger());
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  trigger().click();
  doc.body.dispatchEvent(new win.MouseEvent('mousedown', {bubbles: true}));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  trigger().click();
  trigger().dispatchEvent(new win.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(trigger().getAttribute('aria-expanded'), 'false');
  assert.equal(doc.getElementById('settings').hidden, false);
});

test('removed panel choices migrate to supported designs on startup', async t => {
  for (const accuracyDesign of ['pages', 'dials', 'reveal', 'phases', 'phases2', 'phases-modern-v2']) {
    const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease', async () => {});
    a.store.settings = {accuracyDesign, graphDesign: 'timeline2', engineDesign: 'focus'};
    await a.start();
    assert.equal(a.store.settings.accuracyDesign, 'phases-modern');
    assert.equal(a.store.settings.graphDesign, 'timeline');
    assert.equal(a.store.settings.engineDesign, 'original');
  }
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
  assert.equal(doc.querySelectorAll('.acc-navigation [role="tab"]').length, 3);
  doc.querySelector('#accuracy-tab-1').click(); assert.equal(doc.querySelectorAll('.qbreak-row').length, 10);
  await a.call('setSetting', 'accuracyDesign', 'dials');
  assert.ok(doc.querySelector('.acc-pager')); assert.equal(doc.querySelector('.acc-tabs'), null);
  assert.equal(a.state.accuracyPage, 1);
});

test('Original Accuracy expansion moves Engine and Solve puzzles down and restores their positions', async t => {
  const a = review(t), doc = a.dom.window.document;
  Object.defineProperties(a.dom.window, {innerWidth: {value:1920,configurable:true}, innerHeight: {value:1080,configurable:true}});
  a.call('applyLayoutMode');
  await a.call('setSetting', 'accuracyDesign', 'original');
  const geometry = () => Object.fromEntries(['accuracy','engine','learn','controls'].map(key => {
    const node = doc.querySelector('[data-mod="'+key+'"]');
    return [key, {top:parseFloat(node.style.top),height:parseFloat(node.style.height)}];
  }));
  const nearBoxes = (actual, expected) => {
    assert.deepEqual(Object.keys(actual), Object.keys(expected));
    for (const key of Object.keys(expected)) for (const field of Object.keys(expected[key])) {
      assert.ok(Math.abs(actual[key][field]-expected[key][field])<1e-8, `${key}.${field} must not drift`);
    }
  };
  for (const custom of [false,true]) {
    if(custom){a.call('toggleReorganize');a.call('toggleReorganize');}
    const before = geometry(), saved = structuredClone(a.call('layoutForSave'));
    for(let i=0;i<3;i++) {
      doc.querySelector('.qbreak-toggle').click();
      const expanded = geometry(), delta = expanded.accuracy.height-before.accuracy.height;
      assert.ok(delta>70);
      assert.ok(Math.abs(expanded.engine.top-before.engine.top-delta)<1e-8);
      // The automatic desktop layout may trim Engine to keep the puzzle button on screen.
      const gap = boxes => boxes.learn.top-boxes.engine.top-boxes.engine.height;
      assert.ok(Math.abs(gap(expanded)-gap(before))<1e-8);
      assert.deepEqual(expanded.controls,before.controls);
      doc.querySelector('.qbreak-toggle').click();
      nearBoxes(geometry(),before);
      nearBoxes(a.call('layoutForSave'),saved);
    }
  }
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
  assert.equal(a.state.idx, 3); assert.equal(a.state.settings.accuracyDesign, 'phases-modern');
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
  assert.equal(a.store.settings.accuracyDesign, 'phases-modern');
  assert.equal(a.store.settings.movesDesign, 'full');
  assert.equal(doc.querySelector('.accuracy-panel').dataset.design, 'phases-modern');
  assert.equal(doc.querySelector('.moves-foot,.moves-head'), null);
});

test('invalid or missing saved designs fall back to supported defaults', () => {
  const settings = {accuracyDesign: 'deleted', movesDesign: null};
  assert.equal(normalizePanelDesigns(settings), true);
  assert.deepEqual(settings, Object.fromEntries(PANEL_DESIGNS.map(design => [design.setting, design.default])));
  assert.equal(normalizePanelDesigns(settings), false);
  assert.equal(panelDesign('accuracy', {}), 'phases-modern');
});

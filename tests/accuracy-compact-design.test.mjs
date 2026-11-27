import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';
import {PANEL_DESIGNS, panelDesign, normalizePanelDesigns} from '../lib/panel-designs.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

// jsdom has no layout. Model the overview's own height growing with --acc-room.
function measure(doc, height, {base = 300, growth = 60} = {}) {
  const page = doc.querySelector('.acc-fit-page'), content = page.querySelector('.acc-fit-content');
  page.style.padding = '14px 12px 8px';
  const natural = () => base + growth * Number(content.style.getPropertyValue('--acc-room') || 0);
  Object.defineProperty(content, 'offsetHeight', {configurable: true, get: () => content.style.flexGrow === '0' ? natural() : Math.max(natural(), height - 22)});
  Object.defineProperties(page, {
    clientHeight: {configurable: true, get: () => height},
    scrollHeight: {configurable: true, get: () => Math.max(height, Math.ceil(22 + natural()))},
  });
  return {page, content};
}

test('Default version 2 is offered between Default and Original and survives a reload', async t => {
  const accuracy = PANEL_DESIGNS.find(design => design.panel === 'accuracy');
  assert.deepEqual(accuracy.versions.map(version => version.label), ['Default', 'Default version 2', 'Default version 3', 'Default version 4', 'Original']);
  assert.equal(accuracy.versions[1].id, 'phases-compact');
  const settings = {accuracyDesign: 'phases-compact'};
  normalizePanelDesigns(settings);
  assert.equal(settings.accuracyDesign, 'phases-compact');
  assert.equal(panelDesign('accuracy', settings), 'phases-compact');

  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  const before = JSON.stringify({acc: a.state.acc, stats: a.state.gameStats, idx: a.state.idx});
  await a.call('setSetting', 'accuracyDesign', 'phases-compact');
  assert.equal(a.store.settings.accuracyDesign, 'phases-compact');
  assert.equal(a.store.settings.uiSetup, 'custom', 'Choosing another design makes the setup Custom, as for every Tabs choice');
  const panel = doc.querySelector('.accuracy-panel');
  assert.equal(panel.dataset.design, 'phases-compact');
  assert.ok(panel.matches('.accuracy-phase-modern.accuracy-phase-compact'));
  assert.equal(doc.querySelectorAll('.phase-summary .acc-dial-fill').length, 2);
  assert.equal(doc.querySelectorAll('.phase-report-cell').length, 6);
  assert.equal(JSON.stringify({acc: a.state.acc, stats: a.state.gameStats, idx: a.state.idx}), before);
  // Quality and Advanced are Default's pages, with the same names header.
  a.call('setAccuracyPage', 1);
  assert.ok(doc.querySelector('.acc-page-quality.acc-fit-page .quality-distribution'));
  assert.equal(doc.querySelector('.quality-summary'), null);
  a.call('setAccuracyPage', 2);
  assert.ok(doc.querySelector('.acc-page-advanced .advanced-report'));
  a.call('setAccuracyPage', 0);

  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {...a.store.settings};
  await restored.start();
  assert.equal(restored.state.settings.accuracyDesign, 'phases-compact');
});

test('Default version 2 stays compact at every height and grows its rows into spare room', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  await a.call('setSetting', 'accuracyDesign', 'phases-compact');
  const fit = async height => {
    const nodes = measure(doc, height);
    a.call('scheduleAccuracyFit'); await Promise.resolve();
    return nodes;
  };
  // Tall: full growth, full-size dials, nothing zoomed.
  let {content, page} = await fit(500);
  assert.ok(content.classList.contains('acc-compact'));
  assert.equal(content.style.getPropertyValue('--acc-dial'), '100px');
  assert.equal(content.style.getPropertyValue('--acc-room'), '1');
  assert.equal(content.style.zoom, '1');
  assert.equal(content.style.flexGrow, '', 'Measuring leaves the spare height to the section gaps');
  assert.equal(page.scrollHeight, page.clientHeight);
  // Shorter: the rows take only the room there is.
  ({content, page} = await fit(352));
  const room = Number(content.style.getPropertyValue('--acc-room'));
  assert.ok(room > .45 && room < .5, String(room));
  assert.equal(page.scrollHeight, page.clientHeight);
  // Default keeps its full arrangement when the panel has room for it.
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  ({content} = await fit(500));
  assert.equal(content.classList.contains('acc-compact'), false);
  assert.equal(content.style.getPropertyValue('--acc-room'), '');
});

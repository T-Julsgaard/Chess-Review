import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {app, loadGame} from './helpers/app.mjs';
import {PANEL_DESIGNS, panelDesign, normalizePanelDesigns} from '../lib/panel-designs.js';
import {createOverviewReveal} from '../lib/overview-reveal.js';

function review(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}
function phases(a, values) {
  for (const side of ['w', 'b']) {
    a.state.gameStats[side].phases = Object.fromEntries(['opening', 'middlegame', 'endgame'].map((phase, i) =>
      [phase, values[side][i] == null ? {accuracy: null, decisions: 0} : {accuracy: values[side][i], decisions: 6}]));
  }
}

test('Default version 3 is offered after Default version 2 and survives a reload', async t => {
  const accuracy = PANEL_DESIGNS.find(design => design.panel === 'accuracy');
  assert.deepEqual(accuracy.versions.map(version => version.label), ['Default', 'Default version 2', 'Default version 3', 'Original']);
  assert.equal(accuracy.versions[2].id, 'phases-gauge');
  const settings = {accuracyDesign: 'phases-gauge'};
  normalizePanelDesigns(settings);
  assert.equal(settings.accuracyDesign, 'phases-gauge');
  assert.equal(panelDesign('accuracy', settings), 'phases-gauge');

  const a = review(t);
  await a.call('applyUiSetup', 'modern');
  await a.call('setSetting', 'accuracyDesign', 'phases-gauge');
  assert.equal(a.store.settings.accuracyDesign, 'phases-gauge');
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {...a.store.settings};
  await restored.start();
  assert.equal(restored.state.settings.accuracyDesign, 'phases-gauge');
});

test('Default version 3 shows gauge dials, phase meters and the stronger side of each phase', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  const defaultText = doc.querySelector('.phase-overview').textContent;
  assert.equal(doc.querySelector('.acc-gauge,.phase-meter,.phase-lead,.acc-gauge-thumb'), null, 'Default is unchanged');

  const before = JSON.stringify({acc: a.state.acc, idx: a.state.idx});
  await a.call('setSetting', 'accuracyDesign', 'phases-gauge');
  const panel = doc.querySelector('.accuracy-panel');
  assert.equal(panel.dataset.design, 'phases-gauge');
  assert.ok(panel.matches('.accuracy-phase-modern.accuracy-phase-gauge'), 'Shares Default\'s layout and fit');
  assert.equal(doc.querySelector('.phase-overview').textContent, defaultText, 'Same figures and labels as Default');
  assert.equal(JSON.stringify({acc: a.state.acc, idx: a.state.idx}), before);

  // Each dial: a notched track (ten notches), a gradient fill and a thumb at the score.
  a.state.acc = {w: 85.2, b: 50}; a.call('renderStats');
  const dials = [...doc.querySelectorAll('.phase-summary .acc-dial.acc-gauge')];
  assert.equal(dials.length, 2);
  const track = dials[0].querySelector('.acc-dial-track').getAttribute('stroke-dasharray').split(' ').map(Number);
  assert.equal(track.length, 20);
  assert.equal(track.reduce((sum, value) => sum + value, 0), 100);
  const fill = dials[0].querySelector('.acc-dial-fill');
  const gradient = fill.getAttribute('stroke').match(/^url\(#(.+)\)$/)[1];
  assert.ok(dials[0].querySelector('linearGradient#' + gradient));
  assert.notEqual(gradient, dials[1].querySelector('.acc-dial-fill').getAttribute('stroke').match(/^url\(#(.+)\)$/)[1]);
  assert.equal(fill.getAttribute('stroke-dasharray'), (.75 * 85.2) + ' 100');
  // 50% lands at the top of the 270° arc.
  const thumb = dials[1].querySelector('.acc-gauge-thumb');
  assert.deepEqual([Number(thumb.getAttribute('cx')), Number(thumb.getAttribute('cy'))], [60, 9]);
  // No score: no thumb, an empty fill.
  a.state.acc.w = null; a.call('renderStats');
  assert.equal(doc.querySelector('.acc-dial').querySelector('.acc-gauge-thumb'), null);
  assert.equal(doc.querySelector('.acc-dial-fill').getAttribute('stroke-dasharray'), '0 100');

  // Phase meters follow the score; the stronger side is marked, ties and gaps are not.
  phases(a, {w: [83.1, 85.7, 100], b: [84.9, 85.7, null]}); a.call('renderStats');
  const rows = [...doc.querySelectorAll('.phase-report-row')];
  const meters = row => [...row.querySelectorAll('.phase-meter > i')].map(node => node.style.width);
  const leads = row => [...row.querySelectorAll('.phase-report-cell')].map(node => node.classList.contains('phase-lead'));
  assert.deepEqual(meters(rows[0]), ['83.1%', '84.9%']);
  assert.deepEqual(leads(rows[0]), [false, true]);
  assert.deepEqual(leads(rows[1]), [false, false], 'A tie marks neither side');
  assert.deepEqual(meters(rows[2]), ['100%', '0%']);
  assert.deepEqual(leads(rows[2]), [false, false], 'An unscored phase marks neither side');
  assert.ok(rows[0].querySelector('.phase-meter').getAttribute('aria-hidden'));
  assert.match(rows[0].querySelector('.phase-report-cell').getAttribute('aria-label'), /83\.1 accuracy/);

  // While analysing, dials show the loader and no thumb.
  a.state.analyzing = true; a.call('renderStats');
  assert.ok(doc.querySelector('.acc-gauge .acc-val.ld'));
  assert.equal(doc.querySelector('.acc-gauge-thumb'), null);
  a.state.analyzing = false;

  // Quality and Advanced are Default's pages.
  a.call('setAccuracyPage', 1);
  assert.ok(doc.querySelector('.acc-page-quality.acc-fit-page .quality-distribution'));
  a.call('setAccuracyPage', 2);
  assert.ok(doc.querySelector('.acc-page-advanced .advanced-report'));
  a.call('setAccuracyPage', 0);

  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  assert.equal(doc.querySelector('.accuracy-phase-gauge,.phase-meter'), null);
});

test('the overview reveal fills phase meters from zero with the scores', () => {
  const dom = new JSDOM('<!doctype html><div class="accuracy-panel"><strong class="phase-report-score">80.0</strong><span class="phase-meter"><i style="width:80%"></i></span></div>', {pretendToBeVisual: true});
  const frames = [];
  const reveal = createOverviewReveal({requestFrame: callback => frames.push(callback), cancelFrame: () => {}});
  const panel = dom.window.document.querySelector('.accuracy-panel');
  reveal.mount(panel, {game: {}, key: 'k'});
  assert.equal(panel.querySelector('.phase-meter > i').style.width, '0%');
  frames.shift()(0); frames.shift()(600);
  const mid = parseFloat(panel.querySelector('.phase-meter > i').style.width);
  assert.ok(mid > 0 && mid < 80, String(mid));
  frames.shift()(1200);
  assert.equal(panel.querySelector('.phase-meter > i').style.width, '80%');
  assert.equal(panel.hasAttribute('data-revealing'), false);
});

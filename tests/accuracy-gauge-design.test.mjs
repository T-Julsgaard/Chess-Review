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

test('Accuracy overview offers Default (band colours), Default v2 and Original; Default is the default', async t => {
  const accuracy = PANEL_DESIGNS.find(design => design.panel === 'accuracy');
  assert.deepEqual(accuracy.versions.map(version => [version.id, version.label]),
    [['phases-band', 'Default'], ['phases-modern', 'Default v2'], ['original', 'Original']]);
  assert.equal(accuracy.default, 'phases-band');
  assert.equal(panelDesign('accuracy', {}), 'phases-band');
  // Retired versions still render but migrate to Default on load.
  for (const accuracyDesign of ['phases-gauge', 'phases-compact']) {
    assert.equal(panelDesign('accuracy', {accuracyDesign}), accuracyDesign);
    const settings = {accuracyDesign}; normalizePanelDesigns(settings);
    assert.equal(settings.accuracyDesign, 'phases-band');
  }
  // Default v2 is a choice that sticks.
  const a = review(t);
  await a.call('applyUiSetup', 'modern');
  assert.equal(a.state.settings.accuracyDesign, 'phases-band');
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {...a.store.settings};
  await restored.start();
  assert.equal(restored.state.settings.accuracyDesign, 'phases-modern');
});

test('Modern users on the former Default move to the new Default once; Custom choices are kept', async t => {
  const start = async settings => {
    const a = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
    a.replace('resetSettingsForRelease', async () => {});
    a.store.settings = settings;
    await a.start();
    return a;
  };
  let a = await start({uiSetup: 'modern', uiSetupBase: 'modern', accuracyDesign: 'phases-modern'});
  assert.equal(a.store.settings.accuracyDesign, 'phases-band');
  assert.equal(a.store.settings.modernAccuracyVersion, 1);
  // Choosing Default v2 afterwards sticks across restarts.
  a = await start({...a.store.settings, accuracyDesign: 'phases-modern', uiSetup: 'custom'});
  assert.equal(a.store.settings.accuracyDesign, 'phases-modern');
  a = await start({uiSetup: 'modern', uiSetupBase: 'modern', accuracyDesign: 'phases-modern', modernAccuracyVersion: 1});
  assert.equal(a.store.settings.accuracyDesign, 'phases-modern');
  a = await start({uiSetup: 'custom', uiSetupBase: 'modern', accuracyDesign: 'phases-modern'});
  assert.equal(a.store.settings.accuracyDesign, 'phases-modern', 'A Custom setup keeps its design');
  a = await start({uiSetup: 'modern', uiSetupBase: 'modern', accuracyDesign: 'original'});
  assert.equal(a.store.settings.accuracyDesign, 'original');
});

test('retired Default version 3 changes only the overall scores: a whole number with a smaller decimal', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  const strip = node => { const copy = node.cloneNode(true); copy.querySelector('.phase-summary').remove(); return copy.innerHTML; };
  const defaultOverview = doc.querySelector('.phase-overview'), defaultRest = strip(defaultOverview);
  const defaultDials = [...defaultOverview.querySelectorAll('.acc-dial svg')].map(svg => svg.outerHTML);
  assert.equal(doc.querySelector('.acc-val-split'), null, 'Default is unchanged');

  const before = JSON.stringify({acc: a.state.acc, idx: a.state.idx});
  await a.call('setSetting', 'accuracyDesign', 'phases-gauge');
  const panel = doc.querySelector('.accuracy-panel');
  assert.equal(panel.dataset.design, 'phases-gauge');
  assert.ok(panel.matches('.accuracy-phase-modern.accuracy-phase-gauge'), 'Shares Default\'s layout and fit');
  const overview = doc.querySelector('.phase-overview');
  assert.equal(strip(overview), defaultRest, 'Phases and ratings are Default\'s');
  assert.deepEqual([...overview.querySelectorAll('.acc-dial svg')].map(svg => svg.outerHTML), defaultDials, 'Same arcs');
  assert.equal(overview.textContent, defaultOverview.textContent);
  assert.equal(JSON.stringify({acc: a.state.acc, idx: a.state.idx}), before);

  a.state.acc = {w: 85.2, b: 100}; a.call('renderStats');
  const values = [...doc.querySelectorAll('.phase-summary .acc-val')];
  assert.deepEqual([...values[0].children].map(node => [node.className, node.textContent]),
    [['acc-val-whole', '85'], ['acc-val-decimal', '.2']]);
  assert.equal(values[0].textContent, '85.2');
  assert.equal(values[1].textContent, '100');
  assert.equal(values[1].classList.contains('acc-val-split'), false, 'A whole 100 has no decimal to set');
  a.state.acc.w = null; a.call('renderStats');
  assert.equal(doc.querySelector('.phase-summary .acc-val').textContent, '—');
  a.state.analyzing = true; a.call('renderStats');
  assert.ok(doc.querySelector('.phase-summary .acc-val.ld'));
  a.state.analyzing = false;

  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  assert.equal(doc.querySelector('.accuracy-phase-gauge,.acc-val-split'), null);
});

test('the overview reveal counts a split score up in its own two sizes', () => {
  const dom = new JSDOM('<!doctype html><div class="accuracy-panel"><strong class="acc-val acc-val-split"><span class="acc-val-whole">85</span><span class="acc-val-decimal">.2</span></strong></div>', {pretendToBeVisual: true});
  const frames = [];
  const reveal = createOverviewReveal({requestFrame: callback => frames.push(callback), cancelFrame: () => {}});
  const panel = dom.window.document.querySelector('.accuracy-panel'), value = panel.querySelector('.acc-val');
  reveal.mount(panel, {game: {}, key: 'k'});
  const ink = () => [...value.querySelector('.acc-reveal-ink').children].map(node => [node.className, node.textContent]);
  assert.deepEqual(ink(), [['acc-val-whole', '0'], ['acc-val-decimal', '.0']]);
  assert.equal(value.querySelector('.acc-reveal-accessible').textContent, '85.2');
  assert.equal(value.querySelector('.acc-reveal-ghost .acc-val-decimal').textContent, '.2', 'The final size is reserved');
  frames.shift()(0); frames.shift()(600);
  const mid = Number(ink().map(([, text]) => text).join(''));
  assert.ok(mid > 0 && mid < 85.2, String(mid));
  frames.shift()(1200);
  assert.equal(value.innerHTML, '<span class="acc-val-whole">85</span><span class="acc-val-decimal">.2</span>');
  assert.equal(panel.hasAttribute('data-revealing'), false);
});

test('Default colours each overall score and rating by its performance band, like the phase cards', async t => {
  const a = review(t), doc = a.dom.window.document;
  await a.call('applyUiSetup', 'modern');
  await a.call('setSetting', 'accuracyDesign', 'phases-gauge');
  const v3 = doc.querySelector('.phase-overview').cloneNode(true);
  assert.equal(v3.querySelector('.acc-dial').style.getPropertyValue('--score-color'), '', 'Version 3 keeps the player colours');

  await a.call('setSetting', 'accuracyDesign', 'phases-band');
  const panel = doc.querySelector('.accuracy-panel');
  assert.ok(panel.matches('.accuracy-phase-modern.accuracy-phase-gauge.accuracy-phase-band'), 'Version 3 with colour');
  const strip = node => { const copy = node.cloneNode(true); copy.querySelector('.phase-summary').remove(); return copy.innerHTML; };
  const unrated = node => { const copy = node.cloneNode(true); copy.querySelector('.phase-rating').remove(); return strip(copy); };
  assert.equal(unrated(doc.querySelector('.phase-overview')), unrated(v3), 'Phases are unchanged');

  const colours = () => [...doc.querySelectorAll('.phase-summary .acc-dial')].map(dial => [dial.dataset.phaseCategory, dial.style.getPropertyValue('--score-color')]);
  for (const [w, b, expected] of [
    [84.3, 71.6, [['good', 'var(--q-good)'], ['inacc', 'var(--q-inacc)']]],
    [93.4, 58.1, [['excellent', 'var(--q-excellent)'], ['mistake', 'var(--q-mistake)']]],
    [42, 90, [['blunder', 'var(--q-blunder)'], ['excellent', 'var(--q-excellent)']]],
  ]) {
    a.state.acc = {w, b}; a.call('renderStats');
    assert.deepEqual(colours(), expected);
    assert.deepEqual([...doc.querySelectorAll('.phase-rating-values .acc-elo')].map(node => [node.dataset.phaseCategory, node.style.color]),
      expected, 'Each rating takes its player overall colour');
    assert.ok(doc.querySelector('.phase-summary .acc-val-split'), 'Keeps Version 3\'s split number');
  }
  // Same bands as the phase cards.
  a.state.gameStats.w.phases.opening = {accuracy: 71.6, decisions: 6}; a.state.acc = {w: 71.6, b: 50}; a.call('renderStats');
  assert.equal(doc.querySelector('.phase-report-cell').dataset.phaseCategory, colours()[0][0]);
  // No score or still analysing: the usual player colours.
  a.state.acc = {w: null, b: 80}; a.call('renderStats');
  assert.deepEqual(colours()[0], [undefined, '']);
  a.state.analyzing = true; a.call('renderStats');
  assert.deepEqual(colours(), [[undefined, ''], [undefined, '']]);
  assert.equal(doc.querySelector('.phase-rating-values .acc-elo[style]'), null);
  a.state.analyzing = false;
  await a.call('setSetting', 'accuracyDesign', 'phases-modern');
  assert.equal(doc.querySelector('.accuracy-phase-band,[data-phase-category].acc-dial,.acc-elo[data-phase-category]'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame, settle } from './helpers/app.mjs';

function settings(t) {
  const a = app(t); loadGame(a, '1. e4 e5');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  a.call('toggleSettings');
  const doc = a.dom.window.document;
  const section = title => [...doc.querySelectorAll('.set-section')].find(s => s.querySelector('.set-sect-head').textContent === title);
  const open = title => { section(title).querySelector('.set-sect-head').click(); return section(title); };
  return { a, doc, section, open };
}

test('loading controls are removed and only active loading indicators remain', async t => {
  const {a, doc, section} = settings(t);
  assert.equal(section('Loading'), undefined);
  assert.equal(doc.querySelector('.set-loader-preview'), null);
  for (const retired of ['dots', 'spinner']) {
    assert.equal(a.call('loaderNode', '', null, retired).className, 'ld ld-wave');
  }
  assert.equal(a.call('accuracyPendingValue').className, 'ld ld-bounce');
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {loaderStyle: 'spinner'};
  await restored.start();
  assert.equal(Object.hasOwn(restored.store.settings, 'loaderStyle'), false);
});

test('opening a settings section collapses the previous one and keeps its header focused', t => {
  const { doc, section, open } = settings(t);
  open('Move animation');
  const head = section('Category badges').querySelector('.set-sect-head');
  head.focus(); head.click();
  assert.equal(section('Move animation').querySelector('.set-sect-head').getAttribute('aria-expanded'), 'false');
  assert.equal(doc.querySelectorAll('.set-section.open').length, 1);
  assert.equal(doc.activeElement, section('Category badges').querySelector('.set-sect-head'));
  section('Category badges').querySelector('.set-sect-head').click();
  assert.equal(doc.querySelectorAll('.set-section.open').length, 0);
  open('Move list'); open('Theme');
  assert.equal(section('Move list').classList.contains('open'), false);
  assert.equal(section('Theme').classList.contains('open'), true);
});

test('badge size lives in Category badges and saves and applies the existing scale preference', async t => {
  const { a, doc, section, open } = settings(t);
  assert.equal(section('Move list').querySelector('input[type="range"]'), null);
  const slider = open('Category badges').querySelector('input[type="range"]');
  assert.equal(slider.closest('.set-ctrl').querySelector('.set-lbl').textContent, 'Badge size');
  slider.value = '1.25'; slider.dispatchEvent(new a.dom.window.Event('input'));
  await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.badgeScale, 1.25);
  assert.equal(doc.documentElement.style.getPropertyValue('--badge-scale'), '1.25');
  assert.equal(slider.closest('.set-ctrl').querySelector('b').textContent, '125 %');
});

test('custom accent and arrow buttons open pickers and update their framed swatches', async t => {
  const { a, doc, section, open } = settings(t);
  assert.equal(a.state.settings.accent, '#7fb45f');
  open('Theme');
  const accent = section('Theme').querySelector('.set-chip');
  assert.ok(accent.classList.contains('chip-custom'));
  assert.equal(accent.classList.contains('on'), false);
  for (const [title, key] of [['Theme', 'accentCustom'], ['Best-move/Threat arrow', 'bestArrowColor']]) {
    if (title !== 'Theme') open(title);
    const chip = section(title).querySelector('.chip-custom');
    assert.equal(chip.getAttribute('aria-haspopup'), 'dialog');
    chip.click();
    const input = doc.querySelector('[role="dialog"] .cpick-hexin');
    assert.ok(input);
    input.value = '#123456'; input.dispatchEvent(new a.dom.window.Event('input'));
    input.dispatchEvent(new a.dom.window.Event('change'));
    await settle();
    await a.run('_settingsWriteQueue');
    assert.equal(chip.querySelector('.chip-swatch').style.background, 'rgb(18, 52, 86)');
    assert.equal(chip.style.background, '');
    assert.equal(a.store.settings[key], '#123456');
    doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(doc.querySelector('.board-cpick'), null);
  }
});

test('custom board picker keeps its button mounted and previews both square colors', async t => {
  const { a, doc, section, open } = settings(t);
  open('Board & Pieces');
  const chip = section('Board & Pieces').querySelector('.chip-custom');
  chip.click(); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.boardTheme, 'custom');
  assert.equal(section('Board & Pieces').querySelector('.chip-custom'), chip);
  const input = doc.querySelector('[role="dialog"] .cpick-hexin');
  const edit = color => {
    input.value = color; input.dispatchEvent(new a.dom.window.Event('input'));
    input.dispatchEvent(new a.dom.window.Event('change'));
  };
  edit('#123456');
  [...doc.querySelectorAll('.cpick-target')].find(b => b.textContent === 'Dark').click();
  edit('#654321'); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(chip.querySelector('.chip-swatch').style.background, 'rgb(18, 52, 86)');
  assert.equal(chip.querySelector('.chip-swatch .half.r').style.background, 'rgb(101, 67, 33)');
  assert.equal(a.store.settings.boardCustomLight, '#123456');
  assert.equal(a.store.settings.boardCustomDark, '#654321');
  a.call('closeBoardColorPicker');
  assert.equal(doc.querySelector('.board-cpick'), null);
});

test('Visual sections stay concise, remove the purple accent and offer Porcelain', async t => {
  const {a, doc, section, open} = settings(t);
  assert.equal(section('Interface presets').querySelector('.set-note'), null);
  assert.deepEqual([...section('Interface presets').querySelectorAll('[data-setting="uiSetup"]')].map(n => n.textContent), ['Old', 'Modern', 'Custom']);
  assert.equal([...doc.querySelectorAll('.set-sect-head')].at(-1).querySelector('span').textContent, 'Developer debugger');
  const visualReset = doc.querySelector('#settings > div:last-child > button:last-child');
  assert.equal(visualReset.textContent, 'Reset all visual settings');
  assert.equal(visualReset.previousElementSibling, section('Developer debugger'));
  [...doc.querySelectorAll('.set-tab')].find(n => n.textContent === 'Engine').click();
  assert.equal(doc.querySelector('#settings > div:last-child > button:last-child').textContent, 'Reset all engine settings');
  [...doc.querySelectorAll('.set-tab')].find(n => n.textContent === 'Visual').click();
  assert.equal(section('Theme').querySelectorAll('.set-chip').length, 4);
  assert.equal(section('Theme').querySelector('[title="#c77edb"]'), null);
  open('Board & Pieces');
  const porcelain = section('Board & Pieces').querySelector('[title="Porcelain"]');
  assert.ok(porcelain);
  porcelain.click(); await settle(); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.boardTheme, 'porcelain');
  assert.equal(doc.documentElement.style.getPropertyValue('--sq-light'), '#f1eee6');
  const restored = app(t, {url: 'https://extension.test/analysis.html?workspace=blank'});
  restored.replace('resetSettingsForRelease', async () => {});
  restored.store.settings = {accent: '#c77edb', boardTheme: 'porcelain'};
  await restored.start();
  assert.equal(restored.store.settings.accent, '#7fb45f');
  assert.equal(restored.state.settings.boardTheme, 'porcelain');
});

test('threat color previews, saves and resets independently of best-move and user arrows', async t => {
  const {a, doc, section, open} = settings(t);
  a.state.settings.showThreat = true;
  a.replace('getHelperEngine', async () => ({stop() {}, analyse: async () => ({bestmove: 'e7e5'})}));
  await a.call('renderThreatArrow');
  open('Best-move/Threat arrow');
  const rows = section('Best-move/Threat arrow').querySelectorAll('.set-row');
  assert.equal(rows[0].querySelector('.set-lbl').textContent, 'Show best-move arrow');
  assert.equal(rows[2].querySelector('.set-lbl').textContent, 'Show threat arrow');
  const bestColor = a.state.settings.bestArrowColor;
  const chip = rows[3].querySelector('.chip-custom'); chip.click();
  assert.ok(doc.querySelector('[aria-label="Threat arrow color"]'));
  const input = doc.querySelector('.cpick-hexin');
  input.value = '#123456'; input.dispatchEvent(new a.dom.window.Event('input'));
  input.dispatchEvent(new a.dom.window.Event('change'));
  await settle(); await a.run('_settingsWriteQueue');
  assert.equal(doc.querySelector('.threat-arrow g').getAttribute('fill'), '#123456');
  assert.equal(a.store.settings.threatArrowColor, '#123456');
  assert.equal(a.state.settings.bestArrowColor, bestColor);
  a.call('toggleUserArrow', 'a2', 'a4'); a.call('renderUserArrows');
  assert.equal(doc.querySelector('.user-arrows g').getAttribute('fill'), '#E89B3C');
  await a.call('resetArrowSettings'); await a.run('_settingsWriteQueue');
  assert.equal(a.store.settings.threatArrowColor, '#E89B3C');
  assert.equal(a.store.settings.bestArrowColor, bestColor);
  assert.equal(doc.querySelector('.threat-arrow'), null);
});

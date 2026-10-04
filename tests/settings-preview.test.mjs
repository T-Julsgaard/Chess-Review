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

test('loading preview plays automatically and follows the selected animation without changing the review', async t => {
  const { a, section, open } = settings(t);
  const before = JSON.stringify({ evals: a.state.evals, grades: a.state.moveGrades, analyzing: a.state.analyzing, progress: a.state.progress });
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  open('Loading');
  assert.equal(section('Loading').querySelector('.set-test'), null);
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-wave'));
  section('Loading').querySelectorAll('.set-seg button')[3].click();
  await settle();
  assert.equal(a.store.settings.loaderStyle, 'spinner');
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-spin'));
  section('Loading').querySelector('.set-sect-head').click();
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  assert.equal(JSON.stringify({ evals: a.state.evals, grades: a.state.moveGrades, analyzing: a.state.analyzing, progress: a.state.progress }), before);
});

test('loading preview resumes when its section becomes visible again', t => {
  const { a, doc, section, open } = settings(t);
  open('Loading');
  section('Loading').querySelector('.set-sect-head').click();
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  assert.ok(open('Loading').querySelector('.set-loader-preview .ld-wave'));
  a.call('toggleSettings');
  assert.equal(doc.getElementById('settings').hidden, true);
  a.call('toggleSettings');
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-wave'));
  [...doc.querySelectorAll('.set-tab')].find(b => b.textContent === 'Engine').click();
  assert.equal(doc.querySelector('.set-loader-preview'), null);
  [...doc.querySelectorAll('.set-tab')].find(b => b.textContent === 'Visual').click();
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-wave'));
});

test('opening a settings section collapses the previous one and keeps its header focused', t => {
  const { doc, section, open } = settings(t);
  open('Loading');
  const head = section('Category badges').querySelector('.set-sect-head');
  head.focus(); head.click();
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  assert.equal(section('Loading').querySelector('.set-sect-head').getAttribute('aria-expanded'), 'false');
  assert.equal(doc.querySelectorAll('.set-section.open').length, 1);
  assert.equal(doc.activeElement, section('Category badges').querySelector('.set-sect-head'));
  section('Category badges').querySelector('.set-sect-head').click();
  assert.equal(doc.querySelectorAll('.set-section.open').length, 0);
  open('Move list'); open('Theme');
  assert.equal(section('Move list').classList.contains('open'), false);
  assert.equal(section('Theme').classList.contains('open'), true);
});

test('badge size lives in Category badges and saves and applies the existing scale preference', t => {
  const { a, doc, section, open } = settings(t);
  assert.equal(section('Move list').querySelector('input[type="range"]'), null);
  const slider = open('Category badges').querySelector('input[type="range"]');
  assert.equal(slider.closest('.set-ctrl').querySelector('.set-lbl').textContent, 'Badge size');
  slider.value = '1.25'; slider.dispatchEvent(new a.dom.window.Event('input'));
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
  for (const [title, key] of [['Theme', 'accentCustom'], ['Best-move arrow', 'bestArrowColor']]) {
    if (title !== 'Theme') open(title);
    const chip = section(title).querySelector('.chip-custom');
    assert.equal(chip.getAttribute('aria-haspopup'), 'dialog');
    chip.click();
    const input = doc.querySelector('[role="dialog"] .cpick-hexin');
    assert.ok(input);
    input.value = '#123456'; input.dispatchEvent(new a.dom.window.Event('input'));
    input.dispatchEvent(new a.dom.window.Event('change'));
    await settle();
    assert.equal(chip.querySelector('.chip-swatch').style.background, 'rgb(18, 52, 86)');
    assert.equal(chip.style.background, '');
    assert.equal(a.store.settings[key], '#123456');
    doc.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(doc.querySelector('.board-cpick'), null);
  }
});

test('custom board picker keeps its button mounted and previews both square colors', async t => {
  const { a, doc, section, open } = settings(t);
  open('Board / Pieces');
  const chip = section('Board / Pieces').querySelector('.chip-custom');
  chip.click(); await settle();
  assert.equal(a.store.settings.boardTheme, 'custom');
  assert.equal(section('Board / Pieces').querySelector('.chip-custom'), chip);
  const input = doc.querySelector('[role="dialog"] .cpick-hexin');
  const edit = color => {
    input.value = color; input.dispatchEvent(new a.dom.window.Event('input'));
    input.dispatchEvent(new a.dom.window.Event('change'));
  };
  edit('#123456');
  [...doc.querySelectorAll('.cpick-target')].find(b => b.textContent === 'Dark').click();
  edit('#654321'); await settle();
  assert.equal(chip.querySelector('.chip-swatch').style.background, 'rgb(18, 52, 86)');
  assert.equal(chip.querySelector('.chip-swatch .half.r').style.background, 'rgb(101, 67, 33)');
  assert.equal(a.store.settings.boardCustomLight, '#123456');
  assert.equal(a.store.settings.boardCustomDark, '#654321');
  a.call('closeBoardColorPicker');
  assert.equal(doc.querySelector('.board-cpick'), null);
});

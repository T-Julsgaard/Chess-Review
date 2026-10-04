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

test('loading preview starts, follows the selected animation, and stops without changing the review', async t => {
  const { a, section, open } = settings(t);
  const before = JSON.stringify({ evals: a.state.evals, grades: a.state.moveGrades, analyzing: a.state.analyzing, progress: a.state.progress });
  open('Loading').querySelector('.set-test').click();
  assert.equal(section('Loading').querySelector('.set-test').textContent, 'Stop');
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-wave'));
  section('Loading').querySelectorAll('.set-seg button')[3].click();
  await settle();
  assert.equal(a.store.settings.loaderStyle, 'spinner');
  assert.ok(section('Loading').querySelector('.set-loader-preview .ld-spin'));
  assert.equal(section('Loading').querySelector('.set-test').getAttribute('aria-pressed'), 'true');
  section('Loading').querySelector('.set-test').click();
  assert.equal(section('Loading').querySelector('.set-test').textContent, 'Test animation');
  assert.equal(section('Loading').querySelector('.set-loader-preview').hidden, true);
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  assert.equal(JSON.stringify({ evals: a.state.evals, grades: a.state.moveGrades, analyzing: a.state.analyzing, progress: a.state.progress }), before);
  assert.equal(Object.hasOwn(a.store.settings, 'loadingPreviewActive'), false);
});

test('loading preview stops when its section, settings panel, or visual tab closes', t => {
  const { a, doc, section, open } = settings(t);
  open('Loading').querySelector('.set-test').click();
  section('Loading').querySelector('.set-sect-head').click();
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  open('Loading').querySelector('.set-test').click();
  a.call('toggleSettings'); a.call('toggleSettings');
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
  section('Loading').querySelector('.set-test').click();
  [...doc.querySelectorAll('.set-tab')].find(b => b.textContent === 'Engine').click();
  [...doc.querySelectorAll('.set-tab')].find(b => b.textContent === 'Visual').click();
  assert.equal(section('Loading').querySelector('.set-loader-preview .ld'), null);
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

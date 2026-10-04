import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { app, loadGame, settle } from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  a.state.settings.badgeTooltip = 'original';
  loadGame(a, '1. e4 e5 2. Nf3'); a.call('computeDerived');
  a.state.idx = 1; a.state.classif[1] = 'brilliant';
  a.call('buildUI'); a.call('buildBoard');
  return a;
}
function reveal(a) {
  const tip = a.dom.window.document.getElementById('boardBadgeTip');
  tip.querySelector('img').dispatchEvent(new a.dom.window.Event('load'));
  return tip;
}

test('every category automatically displays its transparent PNG without hovering', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const [cls, cfg] of Object.entries(a.run('QUALITY'))) {
    a.state.classif[1] = cls; a.call('paintBoard');
    const tip = reveal(a), img = tip.querySelector('img');
    assert.equal(tip.getAttribute('aria-label'), cfg.name);
    assert.match(img.src, new RegExp(`/icons/labels/${cls}\\.png$`));
    assert.equal(tip.parentElement, doc.body);
    assert.equal(tip.getAttribute('role'), 'img');
    assert.equal(tip.getAttribute('aria-hidden'), 'false');
    assert.ok(tip.classList.contains('show'));
    const png = fs.readFileSync(new URL(`../icons/labels/${cls}.png`, import.meta.url));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), 840); assert.equal(png.readUInt32BE(20), 180);
    assert.equal(png[25], 6, 'PNG contains an alpha channel');
  }
  assert.equal(doc.querySelectorAll('.board-badge-tip').length, 1);
});

test('labels pop out and disappear after two seconds without repainting or hover restarting them', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = review(t), doc = a.dom.window.document, tip = reveal(a);
  const img = tip.querySelector('img');
  t.mock.timers.tick(1000); a.call('paintBoard');
  doc.querySelector('.sq-badge').focus();
  assert.equal(tip.querySelector('img'), img);
  t.mock.timers.tick(799); assert.ok(tip.classList.contains('show'));
  t.mock.timers.tick(1); assert.ok(tip.classList.contains('leaving'));
  assert.equal(tip.classList.contains('show'), false);
  t.mock.timers.tick(200); assert.equal(tip.getAttribute('aria-hidden'), 'true');
  assert.equal(tip.classList.contains('leaving'), false);
  a.call('paintBoard'); assert.equal(tip.getAttribute('aria-hidden'), 'true');
});

test('changing the number font preserves a move label and its original expiry time', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = review(t), tip = reveal(a);
  t.mock.timers.tick(1000);
  await a.call('setSetting', 'badgeFont', 'sora');
  assert.ok(tip.classList.contains('show'));
  t.mock.timers.tick(1000);
  assert.equal(tip.getAttribute('aria-hidden'), 'true');
});

test('rapid navigation cancels old loads and timers, including consecutive moves with the same category', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = review(t), doc = a.dom.window.document;
  const stale = doc.querySelector('#boardBadgeTip img');
  a.state.idx = 2; a.state.classif[2] = 'brilliant'; a.call('paintBoard');
  const current = doc.querySelector('#boardBadgeTip img');
  assert.notEqual(current, stale);
  stale.dispatchEvent(new a.dom.window.Event('load'));
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
  const tip = reveal(a);
  t.mock.timers.tick(1400);
  a.state.idx = 3; a.state.classif[3] = 'great'; a.call('paintBoard'); reveal(a);
  t.mock.timers.tick(600); assert.ok(tip.classList.contains('show'));
  assert.equal(tip.getAttribute('aria-label'), 'Great');
  t.mock.timers.tick(1400); assert.equal(tip.getAttribute('aria-hidden'), 'true');
});

test('a pending category appears when classified and resets when returning to the initial position', t => {
  const a = review(t), doc = a.dom.window.document;
  a.state.idx = 2; a.state.classif[2] = null; a.call('paintBoard');
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
  a.state.classif[2] = 'book'; a.call('paintBoard');
  assert.equal(reveal(a).getAttribute('aria-label'), 'Book');
  a.state.idx = 0; a.call('paintBoard');
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
});

test('placement flips below top-edge badges and stays within the viewport', t => {
  const a = review(t), doc = a.dom.window.document;
  const badge = doc.querySelector('.sq-badge'), tip = doc.getElementById('boardBadgeTip');
  Object.defineProperties(tip, { offsetWidth: { get: () => 280 }, offsetHeight: { get: () => 60 } });
  const w = a.dom.window.innerWidth, h = a.dom.window.innerHeight;
  badge.getBoundingClientRect = () => ({ left: w - 20, top: 2, width: 24, bottom: 26 });
  reveal(a);
  assert.equal(tip.style.left, `${w - 300}px`); assert.equal(tip.style.top, '28px');
  badge.getBoundingClientRect = () => ({ left: -2, top: h - 30, width: 24, bottom: h - 6 });
  a.call('positionBoardBadgeTip');
  assert.equal(tip.style.left, '20px'); assert.equal(tip.style.top, `${h - 92}px`);
});

test('board rebuilds and scrolling keep labels anchored; Escape and window blur dismiss them', t => {
  const a = review(t), doc = a.dom.window.document, win = a.dom.window;
  const tip = reveal(a);
  a.call('buildBoard'); assert.ok(tip.classList.contains('show'));
  win.dispatchEvent(new win.Event('scroll')); assert.ok(tip.classList.contains('show'));
  doc.querySelector('.sq-badge').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(tip.classList.contains('show'), false);
  a.call('syncBoardBadgeLabel', true); reveal(a);
  win.dispatchEvent(new win.Event('blur')); assert.equal(tip.getAttribute('aria-hidden'), 'true');
});

test('custom names use the same PNG renderer and late renamed artwork cannot replace the next move', async t => {
  const a = review(t), doc = a.dom.window.document;
  const renders = [];
  a.replace('categoryLabelPng', (document, name, color) => {
    renders.push({ name, color }); return 'data:image/png;base64,custom';
  });
  a.state.settings.categoryNames.brilliant = '<b>Inspired</b>';
  a.call('paintBoard'); await settle();
  const tip = reveal(a);
  assert.equal(tip.getAttribute('aria-label'), '<b>Inspired</b>');
  assert.equal(tip.querySelector('b'), null);
  assert.match(tip.querySelector('img').src, /^data:image\/png/);
  assert.equal(renders[0].name, '<b>Inspired</b>');
  a.state.settings.categoryNames.brilliant = 'Another'; a.call('paintBoard');
  a.state.idx = 2; a.state.classif[2] = 'great'; a.call('paintBoard'); await settle();
  assert.match(tip.querySelector('img').src, /great\.png$/);
  reveal(a); assert.equal(tip.getAttribute('aria-label'), 'Great');
});

test('all four text styles render every category immediately and retain safe custom names', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const style of ['editorial', 'studio', 'soft', 'minimal']) {
    a.state.settings.badgeTooltip = style;
    for (const [cls, cfg] of Object.entries(a.run('QUALITY'))) {
      a.state.classif[1] = cls; a.call('paintBoard');
      const tip = doc.getElementById('boardBadgeTip');
      assert.equal(tip.dataset.style, style);
      assert.equal(tip.getAttribute('aria-hidden'), 'false');
      assert.equal(tip.getAttribute('aria-label'), cfg.name);
      assert.equal(tip.querySelector('.category-label-name').textContent, cfg.name);
      assert.ok(tip.querySelector(`.category-label--${style}`));
      if (style === 'soft') assert.equal(tip.querySelector('.category-label-mark'), null);
      assert.equal(tip.querySelector('img'), null);
    }
    a.state.classif[1] = 'brilliant';
    a.state.settings.categoryNames.brilliant = '<b>Inspired</b>';
    a.call('paintBoard');
    assert.equal(doc.querySelector('#boardBadgeTip .category-label-name').textContent, '<b>Inspired</b>');
    assert.equal(doc.querySelector('#boardBadgeTip b'), null);
    delete a.state.settings.categoryNames.brilliant;
  }
});

test('style switching cancels stale artwork and each text label expires without repaint restarting it', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const a = review(t), doc = a.dom.window.document;
  const stale = doc.querySelector('#boardBadgeTip img');
  for (const style of ['editorial', 'studio', 'soft', 'minimal']) {
    await a.call('setSetting', 'badgeTooltip', style);
    const tip = doc.getElementById('boardBadgeTip');
    stale.dispatchEvent(new a.dom.window.Event('load'));
    const label = tip.firstElementChild;
    assert.equal(tip.dataset.style, style);
    t.mock.timers.tick(1000); a.call('paintBoard');
    assert.equal(tip.firstElementChild, label);
    t.mock.timers.tick(800); assert.ok(tip.classList.contains('leaving'));
    t.mock.timers.tick(200); assert.equal(tip.getAttribute('aria-hidden'), 'true');
    a.call('paintBoard'); assert.equal(tip.getAttribute('aria-hidden'), 'true');
  }
  await a.call('setSetting', 'badgeTooltip', 'off');
  stale.dispatchEvent(new a.dom.window.Event('load'));
  assert.equal(doc.getElementById('boardBadgeTip').getAttribute('aria-hidden'), 'true');
});

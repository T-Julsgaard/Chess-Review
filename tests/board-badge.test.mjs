import test from 'node:test';
import assert from 'node:assert/strict';
import { app, loadGame } from './helpers/app.mjs';

function review(t) {
  const a = app(t);
  a.state.settings.badgeTooltip = true;
  loadGame(a, '1. e4 e5');
  a.call('computeDerived');
  a.state.idx = 1;
  a.state.classif[1] = 'brilliant';
  a.call('buildUI');
  a.call('buildBoard');
  return a;
}
function pointer(a, target, type, props = {}) {
  const event = new a.dom.window.Event(type, { bubbles: type === 'pointerdown', cancelable: true });
  Object.assign(event, { pointerType: 'mouse', buttons: 0 }, props);
  target.dispatchEvent(event);
  return event;
}

test('hovering each board badge shows only its current category name', t => {
  const a = review(t), doc = a.dom.window.document;
  for (const [cls, cfg] of Object.entries(a.run('QUALITY'))) {
    a.state.classif[1] = cls;
    a.call('paintBoard');
    const badge = doc.querySelector('.sq-badge');
    pointer(a, badge, 'pointerenter');
    const tip = doc.getElementById('boardBadgeTip');
    assert.equal(tip.textContent, cfg.name);
    assert.equal(tip.childElementCount, 0);
    assert.equal(tip.parentElement, doc.body);
    assert.equal(tip.getAttribute('role'), 'tooltip');
    assert.equal(tip.getAttribute('aria-hidden'), 'false');
    assert.ok(tip.classList.contains('show'));
    pointer(a, badge, 'pointerleave');
    assert.equal(tip.classList.contains('show'), false);
  }
  assert.equal(doc.querySelectorAll('.board-badge-tip').length, 1);
});

test('changing moves and rebuilding the board dismisses the old category label', t => {
  const a = review(t), doc = a.dom.window.document;
  pointer(a, doc.querySelector('.sq-badge'), 'pointerenter');
  const tip = doc.getElementById('boardBadgeTip');
  a.state.idx = 2;
  a.state.classif[2] = 'great';
  a.call('paintBoard');
  assert.equal(tip.getAttribute('aria-hidden'), 'true');
  pointer(a, doc.querySelector('.sq-badge'), 'pointerenter');
  assert.equal(tip.textContent, 'Great');
  a.call('buildBoard');
  assert.equal(tip.classList.contains('show'), false);
});

test('the label flips below top-edge badges and stays inside the viewport', t => {
  const a = review(t), doc = a.dom.window.document;
  const badge = doc.querySelector('.sq-badge');
  pointer(a, badge, 'pointerenter');
  const tip = doc.getElementById('boardBadgeTip');
  Object.defineProperties(tip, { offsetWidth: { get: () => 120 }, offsetHeight: { get: () => 26 } });
  const w = a.dom.window.innerWidth, h = a.dom.window.innerHeight;
  badge.getBoundingClientRect = () => ({ left: w - 20, top: 2, width: 24, bottom: 26 });
  pointer(a, badge, 'pointerenter');
  assert.equal(tip.style.left, `${w - 128}px`);
  assert.equal(tip.style.top, '34px');
  badge.getBoundingClientRect = () => ({ left: -2, top: h - 30, width: 24, bottom: h - 6 });
  pointer(a, badge, 'pointerenter');
  assert.equal(tip.style.left, '8px');
  assert.equal(tip.style.top, `${h - 64}px`);
});

test('keyboard focus shows the label; Escape and blur dismiss it', t => {
  const a = review(t), doc = a.dom.window.document;
  const badge = doc.querySelector('.sq-badge');
  badge.focus();
  const tip = doc.getElementById('boardBadgeTip');
  assert.equal(tip.classList.contains('show'), true);
  badge.dispatchEvent(new a.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(tip.classList.contains('show'), false);
  badge.blur(); badge.focus(); badge.blur();
  assert.equal(tip.getAttribute('aria-hidden'), 'true');
});

test('touch and dragging do not open a hover label, and badge presses still bubble', t => {
  const a = app(t), doc = a.dom.window.document;
  a.state.settings.badgeTooltip = true;
  const badge = a.call('makeBoardBadge', 'best');
  doc.body.append(badge);
  pointer(a, badge, 'pointerenter', { pointerType: 'touch' });
  pointer(a, badge, 'pointerenter', { buttons: 1 });
  assert.equal(doc.getElementById('boardBadgeTip'), null);
  pointer(a, badge, 'pointerenter');
  let presses = 0;
  doc.body.addEventListener('pointerdown', () => presses++);
  const event = pointer(a, badge, 'pointerdown', { buttons: 1 });
  assert.equal(presses, 1);
  assert.equal(event.defaultPrevented, false);
  assert.equal(doc.getElementById('boardBadgeTip').classList.contains('show'), false);
});

test('scrolling and losing window focus dismiss the tooltip', t => {
  const a = review(t), doc = a.dom.window.document, win = a.dom.window;
  const badge = doc.querySelector('.sq-badge');
  for (const type of ['scroll', 'blur']) {
    pointer(a, badge, 'pointerenter');
    win.dispatchEvent(new win.Event(type));
    assert.equal(doc.getElementById('boardBadgeTip').classList.contains('show'), false);
  }
});

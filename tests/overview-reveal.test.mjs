import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createOverviewReveal, OVERVIEW_REVEAL_DURATION} from '../lib/overview-reveal.js';
import {app, loadGame} from './helpers/app.mjs';

function clock() {
  let id = 0; const pending = new Map();
  return {
    requestFrame: callback => { pending.set(++id, callback); return id; },
    cancelFrame: key => pending.delete(key),
    tick(now) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(now)); },
    get size() { return pending.size; },
  };
}

function fixture(t) {
  const dom = new JSDOM('<!doctype html><div class="accuracy-panel"><span class="acc-name">Player name</span><strong class="acc-val">94.5<span class="acc-unit">%</span></strong><strong class="acc-elo">≈ 2350</strong><span class="acc-elo-label">Estimated rating</span><div class="acc-phase-values"><strong>100.0%</strong><span>Opening</span><strong>—</strong></div><svg><circle class="acc-dial-fill" stroke-dasharray="70.875 100"></circle></svg><div class="acc-phase-bars"><i style="width:94.5%"></i></div></div>', {pretendToBeVisual: true});
  t.after(() => dom.window.close());
  const frames = clock(), reveal = createOverviewReveal(frames), panel = dom.window.document.querySelector('.accuracy-panel');
  return {dom, frames, reveal, panel, game: {}, key: 'review:1'};
}

test('one synchronized clock counts stats up, fills meters and types player names while labels stay visible', t => {
  const f = fixture(t), {panel, reveal, frames} = f, before = panel.innerHTML;
  reveal.mount(panel, f);
  assert.equal(panel.querySelector('.acc-val .acc-reveal-ink').textContent, '0.0%');
  assert.equal(panel.querySelector('.acc-name .acc-reveal-ink').textContent, '');
  assert.equal(panel.querySelector('.acc-elo-label').textContent, 'Estimated rating');
  assert.equal(panel.querySelector('.acc-elo-label .acc-reveal-slot'), null);
  assert.equal(panel.querySelector('.acc-phase-values > span').textContent, 'Opening');
  assert.equal(panel.querySelector('.acc-phase-values > span .acc-reveal-slot'), null);
  assert.equal(panel.querySelector('.acc-val .acc-reveal-accessible').textContent, '94.5%');
  assert.equal(panel.querySelector('.acc-val .acc-reveal-ghost .acc-unit').textContent, '%');
  assert.equal(panel.querySelector('.acc-dial-fill').getAttribute('stroke-dasharray'), '0 100');
  frames.tick(0); frames.tick(300);
  const value = parseFloat(panel.querySelector('.acc-val .acc-reveal-ink').textContent);
  assert.ok(value > 0 && value < 94.5);
  assert.ok(parseFloat(panel.querySelector('.acc-elo .acc-reveal-ink').textContent.replace('≈ ', '')) > 0);
  for (const selector of ['.acc-name']) {
    const text = panel.querySelector(selector + ' .acc-reveal-ink').textContent;
    assert.ok(text.length > 0); assert.ok(text.length < panel.querySelector(selector + ' .acc-reveal-accessible').textContent.length);
  }
  const arc = parseFloat(panel.querySelector('.acc-dial-fill').getAttribute('stroke-dasharray'));
  const bar = parseFloat(panel.querySelector('.acc-phase-bars i').style.width);
  assert.ok(Math.abs(arc / 70.875 - bar / 94.5) < 1e-9);
  frames.tick(OVERVIEW_REVEAL_DURATION);
  assert.equal(panel.innerHTML, before); assert.equal(panel.dataset.revealing, undefined); assert.equal(frames.size, 0);
});

test('reveal plays once per game/results key, while new results and a different game can reveal', t => {
  const f = fixture(t);
  f.reveal.mount(f.panel, f); f.frames.tick(0); f.frames.tick(OVERVIEW_REVEAL_DURATION);
  f.reveal.mount(f.panel, f); assert.equal(f.frames.size, 0);
  f.reveal.mount(f.panel, {...f, key: 'review:2'}); assert.equal(f.frames.size, 1);
  f.reveal.stop();
  f.reveal.mount(f.panel, {...f, game: {}}); assert.equal(f.frames.size, 1);
  f.reveal.stop();
});

test('stopping or removing the panel restores exact values and cancels pending work', t => {
  const f = fixture(t), before = f.panel.innerHTML;
  f.reveal.mount(f.panel, f); assert.equal(f.reveal.matches(f.panel, f.game, f.key), true);
  f.frames.tick(0); f.frames.tick(400); f.reveal.stop();
  assert.equal(f.panel.innerHTML, before); assert.equal(f.frames.size, 0);
  f.reveal.mount(f.panel, {...f, key: 'new'}); f.panel.remove(); f.frames.tick(500);
  assert.equal(f.panel.innerHTML, before); assert.equal(f.frames.size, 0);
});

test('disabled motion and a live reduced-motion change show completed stats immediately', t => {
  const f = fixture(t), before = f.panel.innerHTML;
  f.reveal.mount(f.panel, {...f, enabled: false}); assert.equal(f.panel.innerHTML, before); assert.equal(f.frames.size, 0);
  f.reveal.mount(f.panel, {...f, key: 'new'});
  f.dom.window.matchMedia = () => ({matches: true});
  f.frames.tick(0); assert.equal(f.panel.innerHTML, before); assert.equal(f.frames.size, 0);
});

test('cached reviews wait for startup shutters and background tabs wait until visible', t => {
  const f = fixture(t), doc = f.dom.window.document;
  const shutter = doc.createElement('div'); shutter.id = 'startup'; doc.body.append(shutter);
  f.reveal.mount(f.panel, f); f.frames.tick(1000); f.frames.tick(2500);
  assert.equal(f.panel.querySelector('.acc-val .acc-reveal-ink').textContent, '0.0%');
  shutter.remove(); Object.defineProperty(doc, 'hidden', {configurable: true, value: true}); f.frames.tick(4000);
  Object.defineProperty(doc, 'hidden', {configurable: true, value: false}); f.frames.tick(5000); f.frames.tick(5300);
  assert.ok(parseFloat(f.panel.querySelector('.acc-val .acc-reveal-ink').textContent) < 94.5);
  f.frames.tick(6200); assert.equal(f.panel.querySelector('.acc-val').textContent, '94.5%');
});

test('rerenders preserve a running overview and page changes do not replay it or mutate analysis', t => {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.state.settings.accuracyDesign = 'reveal';
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  const frames = clock(); a.context.requestAnimationFrame = frames.requestFrame; a.context.cancelAnimationFrame = frames.cancelFrame;
  a.state.acc = {w: 94.5, b: 82}; a.state.settings.moveAnim = true;
  const before = JSON.stringify({acc: a.state.acc, evals: a.state.evals, bests: a.state.bests, idx: a.state.idx});
  a.call('renderStats'); const panel = a.dom.window.document.querySelector('.accuracy-reveal');
  assert.equal(panel.dataset.revealing, 'true');
  for (const selector of ['.acc-dial-label', '.acc-elo-label', '.acc-phase-values > span', '.acc-navigation button']) {
    assert.equal(panel.querySelector(selector + ' .acc-reveal-slot'), null);
  }
  assert.equal(panel.querySelector('.acc-navigation [aria-selected="true"]').textContent, 'Overview');
  a.call('renderStats'); assert.equal(a.dom.window.document.querySelector('.accuracy-reveal'), panel);
  frames.tick(0); frames.tick(1200);
  a.call('setAccuracyPage', 1); a.call('setAccuracyPage', 0);
  assert.equal(a.dom.window.document.querySelector('[data-revealing]'), null);
  assert.equal(JSON.stringify({acc: a.state.acc, evals: a.state.evals, bests: a.state.bests, idx: a.state.idx}), before);
  a.state.batchGen++; a.call('renderStats'); assert.ok(a.dom.window.document.querySelector('[data-revealing]'));
  a.call('setAccuracyPage', 2); assert.equal(a.dom.window.document.querySelector('[data-revealing]'), null);
});

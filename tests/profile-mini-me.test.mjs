import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {figurePoints, waveLift, waveSwing, createMiniMe} from '../lib/profile/mini-me.js';

test('mini-me: every character has a front and a back point, and the arm is marked', () => {
  const points = figurePoints();
  assert.equal(points.length % 2, 0);
  assert.ok(points.length > 1500, 'the figure keeps its detail: ' + points.length);
  assert.ok(points.some(p => p.arm === 1) && points.some(p => p.arm === 2), 'upper arm and forearm both wave');
  for (let i = 0; i < points.length; i += 2) {
    assert.ok(points[i].z >= 0 && points[i + 1].z <= 0, 'front then back');
    assert.ok(points[i].nz >= 0 && points[i + 1].nz <= 0, 'each faces its own way');
  }
  // Centred, so he turns about his own middle.
  const xs = points.map(p => p.x);
  assert.ok(Math.abs(Math.max(...xs) + Math.min(...xs)) < .2);
});

test('mini-me: the wave raises the arm, swings it, and puts it back down', () => {
  assert.equal(waveLift(-1), 0);
  assert.ok(waveLift(1000) > .99, 'up during the wiggle');
  assert.equal(waveLift(10000), 0, 'down afterwards');
  assert.equal(waveSwing(100), 0, 'no swing while rising');
  assert.ok([...Array(30)].some((_, i) => Math.abs(waveSwing(500 + i * 40)) > .1), 'swings while up');
});

test('mini-me: a page without canvas drawing still gets a labelled, focusable figure', () => {
  const {window} = new JSDOM('<body></body>');
  const mini = createMiniMe({doc: window.document, win: window});
  window.document.body.append(mini.element);
  assert.equal(mini.element.tagName, 'CANVAS');
  assert.equal(mini.element.getAttribute('role'), 'img');
  assert.match(mini.element.getAttribute('aria-label'), /Thomas/);
  assert.equal(mini.element.tabIndex, 0);
  assert.doesNotThrow(() => mini.start());
});

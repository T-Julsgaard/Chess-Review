import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame, branch} from './helpers/app.mjs';

function board(t) {
  const a = app(t);
  loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  a.call('computeDerived'); a.call('buildUI'); a.call('renderAll');
  return a;
}

test('engine progress preserves the pressed navigation button, icon and focus', t => {
  const a = board(t), S = a.state, doc = a.dom.window.document;
  S.analyzing = true; S.progress = 2; a.call('renderControls');
  const next = doc.querySelector('#controls [aria-label="Next"]');
  const svg = next.querySelector('svg');
  next.focus();
  svg.dispatchEvent(new a.dom.window.MouseEvent('mousedown', {bubbles: true}));
  for (const progress of [2, 3, 4]) {
    S.progress = progress; a.call('flushProgress', S.batchGen);
    assert.equal(doc.querySelector('#controls [aria-label="Next"]'), next);
    assert.equal(next.querySelector('svg'), svg);
    assert.equal(doc.activeElement, next);
  }
  svg.dispatchEvent(new a.dom.window.MouseEvent('mouseup', {bubbles: true}));
  svg.dispatchEvent(new a.dom.window.MouseEvent('click', {bubbles: true}));
  assert.equal(S.idx, 1);
  next.click(); next.click();
  assert.equal(S.idx, 3);
  assert.equal(doc.querySelector('#controls [aria-label="Next"]'), next);
});

test('retained controls follow the furthest score independently of contiguous progress', t => {
  const a = board(t), S = a.state, controls = a.dom.window.document.getElementById('controls');
  const next = controls.querySelector('[aria-label="Next"]');
  const end = controls.querySelector('[aria-label="End"]');
  S.analyzing = true; S.progress = 0; S.evals = [null, null, {cp:30}, null, null]; a.call('renderControls');
  assert.equal(next.disabled, false); assert.equal(end.disabled, false);
  next.click(); assert.equal(S.idx, 1);
  S.progress = 2; a.call('renderControls');
  assert.equal(next.disabled, false); end.click(); assert.equal(S.idx, 2);
  assert.equal(next.disabled, true);
  S.evals[3] = {cp:20}; a.call('renderControls');
  assert.equal(next.disabled, false); end.click(); assert.equal(S.idx, 3);
  S.evals[4] = {cp:0};
  S.analyzing = false; a.call('renderControls'); end.click(); assert.equal(S.idx, 4);
  assert.equal(controls.querySelector('[aria-label="End"]'), end);
  a.call('go', 0); assert.equal(next.disabled, false);
});

test('play and pause update in place without replacing the surrounding buttons', t => {
  const a = board(t), S = a.state, controls = a.dom.window.document.getElementById('controls');
  const buttons = Array.from(controls.children), play = buttons[2], svg = play.querySelector('svg');
  S.autoTimer = 1; a.call('renderControls');
  assert.equal(play.getAttribute('aria-label'), 'Pause');
  assert.notEqual(play.querySelector('svg'), svg);
  const pauseSvg = play.querySelector('svg');
  a.call('renderControls'); assert.equal(play.querySelector('svg'), pauseSvg);
  S.autoTimer = null; a.call('renderControls');
  assert.equal(play.getAttribute('aria-label'), 'Play');
  assert.deepEqual(Array.from(controls.children), buttons);
});

test('variation and practice controls retain their nodes and refresh their current state', t => {
  const a = board(t), S = a.state, controls = a.dom.window.document.getElementById('controls');
  const v = branch(a, 0, 1); a.call('renderControls');
  const end = controls.querySelector('[aria-label="Variation end"]');
  const extra = {...v.positions.at(-1)}; v.positions.push(extra);
  a.call('renderControls');
  assert.equal(controls.querySelector('[aria-label="Variation end"]'), end);
  a.replace('requestLiveEval', () => {});
  end.click(); assert.equal(v.idx, v.positions.length - 1); assert.equal(end.disabled, true);
  v.idx = 0; a.call('renderControls');
  assert.equal(controls.querySelector('[aria-label="Variation start"]').disabled, true);
  S.practice = {i: 0, spots: [1, 2], solving: true}; a.call('renderControls');
  const exit = controls.querySelector('button'), status = controls.querySelector('.practice-status');
  S.practice.i = 1; S.practice.busy = true; a.call('renderControls');
  assert.equal(controls.querySelector('button'), exit);
  assert.equal(controls.querySelector('.practice-status'), status);
  assert.equal(status.textContent, 'Checking…');
  assert.equal(controls.querySelector('.practice-pos').textContent, 'Practice 2/2');
  S.practice = null; S.analysisMode = false; S.variation = null; a.call('renderControls');
  assert.equal(controls.querySelectorAll('button').length, 5);
  assert.ok(controls.querySelector('[aria-label="Next"]'));
});

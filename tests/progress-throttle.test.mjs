import test from 'node:test';
import assert from 'node:assert/strict';
import {app, loadGame} from './helpers/app.mjs';

// Progress refreshes during analysis: hidden tabs draw nothing until they return, and a
// machine where one refresh is expensive waits longer between refreshes. Content is unchanged.
function harness(t) {
  const a = app(t); loadGame(a, '1. e4 e5 2. Nf3 Nc6');
  const doc = a.dom.window.document;
  let hidden = false;
  Object.defineProperty(doc, 'hidden', {configurable: true, get: () => hidden});
  const flushes = [];
  a.replace('flushProgress', gen => { flushes.push(gen); a.run('_progScheduled = false; _progDeferred = null'); });
  return {a, doc, flushes, hide: () => { hidden = true; }, show() { hidden = false; doc.dispatchEvent(new a.dom.window.Event('visibilitychange')); }};
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('a hidden tab defers progress refreshes and catches up once when it becomes visible', async t => {
  const h = harness(t);
  h.hide();
  for (let i = 0; i < 5; i++) h.a.call('requestProgress', 7);
  await wait(200);
  assert.deepEqual(h.flushes, [], 'no refresh is scheduled while the tab is hidden');
  h.show();
  await wait(200);
  assert.deepEqual(h.flushes, [7], 'exactly one catch-up refresh after the tab is shown');
  h.show();
  await wait(200);
  assert.deepEqual(h.flushes, [7], 'becoming visible without pending progress schedules nothing');
});

test('a visible tab keeps the existing ~7 fps cadence and coalesces bursts into one refresh', async t => {
  const h = harness(t);
  for (let i = 0; i < 5; i++) h.a.call('requestProgress', 3);
  await wait(250);
  assert.deepEqual(h.flushes, [3]);
});

test('the refresh interval only grows when a refresh measured expensive, and is capped', t => {
  const a = app(t);
  const delay = (cost, last, now) => { a.run(`_progCost = ${cost}; _progLast = ${last}`); return a.call('progressDelay', now); };
  assert.equal(delay(0, 0, 1000), 0, 'an old refresh never delays the next');
  assert.equal(delay(0, 1000, 1000), 140, 'cheap refreshes keep the 140 ms interval');
  assert.equal(delay(50, 1000, 1000), 140, 'a refresh cheaper than the interval does not change it');
  assert.equal(delay(200, 1000, 1000), 400, 'an expensive refresh waits twice its cost');
  assert.equal(delay(200, 1000, 1300), 100, 'time already elapsed counts toward the wait');
  assert.equal(delay(5000, 1000, 1000), 1000, 'the wait never exceeds one second');
});

test('completion renders directly even while hidden, and records the refresh cost', t => {
  const a = app(t); const S = loadGame(a, '1. e4 e5');
  Object.defineProperty(a.dom.window.document, 'hidden', {configurable: true, value: true});
  a.call('buildUI');
  S.batchGen = 1; S.analyzing = false;
  a.call('flushProgress', 1);
  assert.ok(a.run('_progCost') >= 0);
  assert.equal(a.run('_progDeferred'), null);
  assert.ok(a.dom.window.document.querySelector('.movelist'), 'the direct flush rendered the move list');
});

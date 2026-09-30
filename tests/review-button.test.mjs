import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync(new URL('../content.js', import.meta.url), 'utf8');

test('modal action follows primary-action width through resize without replacing its busy state', async t => {
  const dom = new JSDOM(`<div class="game-over-modal-shell-buttons">
    <a href="/analysis?tab=review">Platform review</a>
    <div class="game-over-secondary-actions-row-component"></div>
  </div><div class="game-review-emphasis-content"><div class="game-review-buttons-component">
    <a href="/analysis?tab=review">Platform review</a>
  </div></div>`, { url: 'https://www.chess.com/game/live/12345678', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, sent = [], timers = [];
  let width = 288;
  Object.defineProperty(w.document.querySelector('.game-over-modal-shell-buttons a'), 'offsetWidth', { get: () => width });
  w.console = { log() {}, info() {}, warn() {} };
  w.setTimeout = (callback, delay) => { timers.push({ callback, delay }); return timers.length; };
  w.clearTimeout = () => {};
  w.chrome = { runtime: {
    getURL: path => `chrome-extension://test/${path}`,
    sendMessage: async message => { sent.push(message); },
    onMessage: { addListener() {} },
  } };
  w.eval(source);
  const modal = w.document.querySelector('.chess-analyzer-free-review--modal');
  const sidebar = w.document.querySelector('.chess-analyzer-free-review--sidebar');
  assert.equal(modal.style.getPropertyValue('--chess-review-modal-width'), '288px');
  assert.equal(sidebar.style.getPropertyValue('--chess-review-modal-width'), '');
  assert.equal(modal.textContent, 'Analyze with Chess Review');
  assert.equal(sidebar.textContent, 'Analyze with Chess Review');
  assert.ok([...modal.classList].every(name => name.startsWith('chess-analyzer-free-review')));
  modal.click();
  await Promise.resolve();
  assert.equal(modal.disabled, true);
  assert.equal(modal.textContent, 'Opening review…');
  assert.equal(sent[0].type, 'freeGameReview');
  width = 224;
  w.dispatchEvent(new w.Event('resize'));
  assert.equal(w.document.querySelector('.chess-analyzer-free-review--modal'), modal);
  assert.equal(w.document.querySelectorAll('.chess-analyzer-free-review').length, 2);
  assert.equal(modal.style.getPropertyValue('--chess-review-modal-width'), '224px');
  assert.equal(modal.disabled, true);
  assert.equal(modal.textContent, 'Opening review…');
  timers.find(timer => timer.delay === 5000).callback();
  assert.equal(modal.disabled, false);
  assert.equal(modal.textContent, 'Analyze with Chess Review');
});

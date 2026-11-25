import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Chess} from '../lib/chess.js';
import {createProfileGameView} from '../lib/profile/game-view.js';

function setup(t, createEngine) {
  const dom = new JSDOM('<!doctype html>'); t.after(() => dom.window.close());
  const doc = dom.window.document, timers = new Map(); let id = 0;
  dom.window.setTimeout = fn => { timers.set(++id, fn); return id; };
  dom.window.clearTimeout = key => timers.delete(key);
  const h = (tag, attrs = {}, ...children) => {
    const node = doc.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') node.className = value;
      else if (key === 'style') Object.assign(node.style, value);
      else node.setAttribute(key, value);
    }
    node.append(...children.filter(c => c != null)); return node;
  };
  const view = createProfileGameView({h, doc, settings: () => ({engineDepth: 8}), motion: () => false, createEngine});
  t.after(() => view.destroy());
  return {doc, view, flush: () => { const fns = [...timers.values()]; timers.clear(); return Promise.all(fns.map(fn => fn())); }};
}

test('profile game evaluation follows the position and ignores an older search result', async t => {
  const requests = []; let terminated = 0;
  const engine = {analyse: (...args) => new Promise(resolve => requests.push({args, resolve})), stop() {}, cancelPending() {}, terminate() { terminated++; }};
  const {doc, view, flush} = setup(t, async () => engine);
  const chess = new Chess(); chess.move('e4');
  view.players({white: 'Alice', black: 'Bob', whiteRating: 1600, blackRating: 1700, me: 'b'});
  assert.match(doc.querySelector('.profile-game-player-top').textContent, /Alice1600/);
  assert.ok(doc.querySelector('.profile-game-eval').classList.contains('flipped'));
  const settleRequests = async n => { for (let i = 0; i < 12 && requests.length < n; i++) await Promise.resolve(); assert.equal(requests.length, n); };
  view.update(chess.fen()); const first = flush(); await settleRequests(1);
  chess.move('e5'); view.update(chess.fen()); const second = flush(); await settleRequests(2);
  requests[1].resolve({score: {cp: 75}}); await second;
  const bar = doc.querySelector('.profile-game-eval');
  assert.equal(bar.getAttribute('aria-label'), 'Evaluation: 0.75 pawns for White');
  requests[0].resolve({score: {cp: 900}}); await first;
  assert.equal(bar.getAttribute('aria-label'), 'Evaluation: 0.75 pawns for White');
  view.update(chess.fen()); const third = flush(); await settleRequests(3);
  view.destroy(); requests[2].resolve({score: {cp: -100}}); await third;
  assert.equal(doc.querySelector('.profile-game-chrome'), null); assert.equal(terminated, 1);
});

test('profile evaluation converts Black scores and handles checkmate without an engine', async t => {
  let calls = 0;
  const {doc, view, flush} = setup(t, async () => ({analyse: async () => { calls++; return {score: {cp: 125}}; }, terminate() {}}));
  const chess = new Chess(); chess.move('e4'); view.update(chess.fen()); await flush();
  assert.equal(doc.querySelector('.profile-game-eval').getAttribute('aria-label'), 'Evaluation: -1.25 pawns for White');
  chess.loadPgn('1. f3 e5 2. g4 Qh4#'); view.update(chess.fen()); await flush();
  assert.equal(calls, 1); assert.equal(doc.querySelector('.profile-game-eval').getAttribute('aria-label'), 'Checkmate');
  assert.equal(doc.querySelector('.white-fill').style.height, '0%');
});

test('profile evaluation bar takes the review bar size, keeps its proportions when unmeasurable, and slides back under the board', async t => {
  const dom = new JSDOM('<!doctype html>'); t.after(() => dom.window.close());
  const doc = dom.window.document;
  const h = (tag, attrs = {}, ...children) => { const node = doc.createElement(tag); for (const [key, value] of Object.entries(attrs)) if (key === 'class') node.className = value; else if (key !== 'style') node.setAttribute(key, value); node.append(...children.filter(c => c != null)); return node; };
  let layout = {width: 30, gap: 20, board: 600};
  const animations = [];
  const make = motion => createProfileGameView({h, doc, settings: () => ({}), motion: () => motion, geometry: () => layout});
  const view = make(true);
  const bar = doc.querySelector('.profile-game-eval'), rail = doc.querySelector('.profile-game-rail');
  bar.animate = (frames, options) => { const a = {frames, options, onfinish: null, oncancel: null}; animations.push(a); return a; };
  for (const node of doc.querySelectorAll('.profile-game-player, .profile-game-center, .profile-game-dock')) node.animate = () => ({});
  assert.ok(!rail.classList.contains('is-shown'), 'no bar before it has its size');
  view.position({left: 100, top: 50, width: 600, height: 600});
  assert.equal(bar.style.width, '30px'); assert.equal(rail.style.width, '50px');
  assert.ok(rail.classList.contains('is-shown'));
  assert.deepEqual(animations[0].frames.map(f => f.translate), ['50px 0', '0 0'], 'the bar slides out from under the board');
  // The review bar cannot be measured: same proportions of a smaller board, never the old fixed 26 px.
  layout = null;
  view.position({left: 0, top: 0, width: 300, height: 300});
  assert.equal(bar.style.width, '15px'); assert.equal(rail.style.width, '25px');
  view.destroy({animate: true});
  assert.ok(doc.querySelector('.profile-game-chrome'), 'stays while the bar slides back');
  assert.deepEqual(animations[1].frames.map(f => f.translate), ['0 0', '25px 0']);
  animations[1].onfinish();
  assert.equal(doc.querySelector('.profile-game-chrome'), null);
  const still = make(false); still.position({left: 0, top: 0, width: 300, height: 300}); still.destroy({animate: true});
  assert.equal(doc.querySelector('.profile-game-chrome'), null, 'without motion it goes at once');
});

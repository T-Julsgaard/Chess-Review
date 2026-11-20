import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {PORTRAITS} from '../lib/profile/portraits.js';
import {portraitContours, traceContours, sampleContour} from '../lib/profile/portrait-contours.js';
import {createPortrait, planSculpture, sculptureState, portraitTones, PIECE_FILL, glideEase, GLIDE} from '../lib/profile/portrait.js';
import {nearestBoardEdge} from '../lib/learning/piece-transition.js';

const opening = () => Array.from({length: 32}, (_, i) => {
  const row = Math.floor(i / 8), file = i % 8, rank = row === 0 || row === 3 ? 'RNBQKBNR'[file] : 'P';
  return {code: (row < 2 ? 'b' : 'w') + rank, x: file + .5, y: [0, 1, 6, 7][row] + .5, size: PIECE_FILL};
});
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('sculpted portraits use every actual piece once, with a small number of extra pieces', () => {
  const sources = opening();
  for (const id of Object.keys(PORTRAITS)) {
    const plan = planSculpture(portraitTones(id, 64), 64, {sources});
    const moved = plan.cells.filter(c => c.kind === 'move'), entering = plan.cells.filter(c => c.kind === 'enter');
    assert.equal(moved.length, sources.length, id);
    assert.equal(new Set(moved.map(c => c.source)).size, sources.length, id);
    assert.equal(plan.leaves.length, 0, 'neither army is discarded');
    assert.ok(entering.length <= 20, `${id}: ${entering.length} extra pieces`);
    assert.ok(plan.duration > 1800 && plan.duration < 2600, `${id}: ${plan.duration} ms`);
    assert.ok(plan.cells.every(c => c.rings.length && c.rings.every(r => r.length >= 3 && r.every(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 8 && p.y >= 0 && p.y <= 8))), id);
    for (const c of moved) {
      const source = sources[c.source], start = sculptureState(c, 0), end = sculptureState(c, plan.duration);
      assert.equal(c.code, source.code, 'retain the original army and rank');
      assert.deepEqual(c.from, {x: source.x, y: source.y});
      assert.deepEqual([start.x, start.y, start.size, start.morph], [source.x, source.y, source.size, 0]);
      close(end.x, c.x); close(end.y, c.y); assert.equal(end.morph, 1); assert.equal(end.moving, false);
    }
    for (const c of entering) {
      assert.deepEqual(c.from, nearestBoardEdge(c));
      assert.equal(sculptureState(c, c.start - 1).visible, false);
    }
  }
});

test('the sculpture preserves the board glide while each silhouette unfolds continuously', () => {
  const options = {sources: opening(), seed: 42}, tones = portraitTones('tal', 64), plan = planSculpture(tones, 64, options);
  assert.deepEqual(planSculpture(tones, 64, options), plan, 'replay choreography is deterministic');
  for (const c of plan.cells) {
    const [base, per, cap] = c.kind === 'move' ? GLIDE.move : GLIDE.route;
    assert.equal(c.dur, base + Math.min(Math.hypot(c.x - c.from.x, c.y - c.from.y) * per, cap));
    let previous = sculptureState(c, 0);
    for (let ms = 16; ms <= plan.duration; ms += 16) {
      const state = sculptureState(c, ms);
      close(state.x, c.from.x + (c.x - c.from.x) * glideEase(state.p));
      close(state.y, c.from.y + (c.y - c.from.y) * glideEase(state.p));
      assert.ok(state.morph >= previous.morph && state.morph - previous.morph < .05, 'a continuous material transformation');
      previous = state;
    }
    const justArrived = sculptureState(c, c.start + c.dur);
    assert.ok(justArrived.morph > 0 && justArrived.morph < 1 && justArrived.moving, 'material settles after the glide');
    assert.equal(sculptureState(c, c.end).morph, 1);
  }
});

test('contours keep real holes, separate islands and a consistent winding for morphing', () => {
  const n = 10, mask = new Uint8Array(n * n);
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) if (!(x >= 3 && x <= 4 && y >= 3 && y <= 4)) mask[y * n + x] = 1;
  mask[8 * n + 8] = 1;
  const rings = traceContours(mask, n);
  assert.deepEqual(rings.map(r => r.area).sort((a, b) => a - b), [-4, 1, 36]);
  const outer = rings.find(r => r.area === 36), points = sampleContour(outer.points, 100);
  assert.equal(points.length, 100);
  assert.ok(points.every(p => p.x >= 1 && p.x <= 7 && p.y >= 1 && p.y <= 7));
  const sculpture = portraitContours(mask, n, {minArea: .2});
  assert.ok(sculpture.some(c => c.rings.length > 1), 'the inner void survives tracing and smoothing');
  assert.deepEqual(portraitContours(null, n), []);
  assert.deepEqual(portraitContours(new Float32Array(n), n), []);
});

// Minimal canvas recorder: verifies lifecycle and actual filled geometry without
// making a native canvas package a dependency of the extension's unit tests.
function fixture(t, {animated = false, decode = () => Promise.resolve()} = {}) {
  const dom = new JSDOM('<div id="board" style="position:relative"></div>', {pretendToBeVisual: true});
  t.after(() => dom.window.close());
  const {window: win} = dom, doc = win.document, board = doc.querySelector('#board');
  let clock = 0, next = 0;
  const frames = new Map(), contexts = new Map();
  win.performance.now = () => clock;
  win.requestAnimationFrame = cb => { const id = ++next; frames.set(id, cb); return id; };
  win.cancelAnimationFrame = id => frames.delete(id);
  const rect = {left: 0, top: 0, width: 640, height: 640};
  board.getBoundingClientRect = () => rect;
  Object.defineProperty(board, 'offsetWidth', {get: () => rect.width});
  const makePiece = (rank, colour) => {
    const img = doc.createElement('img'); img.dataset.piece = colour + rank.toUpperCase(); img.width = 96; img.height = 96;
    img.decode = decode; return img;
  };
  for (const source of opening()) {
    const sq = doc.createElement('div'), img = makePiece(source.code[1], source.code[0]);
    sq.className = 'sq'; img.className = 'profile-piece';
    sq.getBoundingClientRect = () => ({left: (source.x - .5) * rect.width / 8, top: (source.y - .5) * rect.height / 8, width: rect.width / 8, height: rect.height / 8});
    Object.defineProperty(img, 'offsetWidth', {get: () => rect.width / 8 * PIECE_FILL});
    sq.append(img); board.append(sq);
  }
  win.HTMLCanvasElement.prototype.getContext = function() {
    if (contexts.has(this)) return contexts.get(this);
    const context = {fills: [], images: [], points: [],
      setTransform() {}, clearRect() { this.fills = []; this.images = []; },
      drawImage(...args) { this.images.push(args); }, beginPath() { this.points = []; },
      moveTo(x, y) { this.points.push([x, y]); }, lineTo(x, y) { this.points.push([x, y]); }, closePath() {},
      fill(rule) { this.fills.push({rule, points: this.points.slice()}); }, fillRect() {}, save() {}, restore() {}, translate() {}, rotate() {},
      getImageData: () => ({data: Uint8ClampedArray.from({length: 96 * 96 * 4}, (_, i) => {
        const pixel = Math.floor(i / 4), x = pixel % 96, y = Math.floor(pixel / 96);
        return i % 4 === 3 && x > 20 && x < 76 && y > 8 && y < 88 ? 255 : 0;
      })}),
    };
    contexts.set(this, context); return context;
  };
  const overlay = doc.createElement('div'); overlay.className = 'profile-board-overlay'; board.append(overlay);
  overlay.getBoundingClientRect = () => rect;
  Object.defineProperty(overlay, 'offsetWidth', {get: () => rect.width});
  Object.defineProperty(overlay, 'offsetHeight', {get: () => rect.height});
  let reveals = 0;
  const portrait = createPortrait({board, overlay, id: 'tal', makePiece, win, motion: () => animated, delay: 0, onReveal: () => reveals++});
  return {win, board, overlay, portrait, frames, contexts, get reveals() { return reveals; },
    flush: () => new Promise(resolve => win.setTimeout(resolve, 0)),
    tick(ms) { clock = ms; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(cb => cb(ms)); },
  };
}

test('reduced motion draws a face entirely from filled piece contours and returns the position', async t => {
  const f = fixture(t);
  await f.flush();
  assert.equal(f.portrait.revealed, true); assert.equal(f.reveals, 1); assert.equal(f.frames.size, 0);
  const ctx = f.contexts.get(f.overlay.querySelector('.profile-portrait-pieces'));
  assert.ok(ctx.fills.length >= 32 && ctx.fills.every(fill => fill.rule === 'evenodd' && fill.points.length >= 3));
  assert.equal(ctx.images.length, 0, 'the final face contains no bitmap image');
  assert.ok([...f.board.querySelectorAll('.profile-piece')].every(img => img.style.visibility === 'hidden'));
  f.portrait.replay(); assert.equal(f.reveals, 1, 'reduced motion stays still');
  await f.portrait.dismiss();
  assert.ok([...f.board.querySelectorAll('.profile-piece')].every(img => img.style.visibility === ''));
  assert.equal(f.overlay.children.length, 0); assert.equal(f.overlay.hasAttribute('role'), false);
});

test('animated assembly starts from visible original sprites, settles, and reverses without losing pieces', async t => {
  const f = fixture(t, {animated: true});
  await f.flush(); await f.flush();
  const ctx = f.contexts.get(f.overlay.querySelector('.profile-portrait-pieces'));
  assert.equal(ctx.images.length, 32, 'the same 32 sprites are visible at frame zero');
  f.tick(1100);
  assert.equal(f.portrait.revealed, false);
  assert.ok(ctx.fills.length >= 32, 'pieces are becoming material contours');
  f.tick(3000);
  assert.equal(f.portrait.revealed, true); assert.equal(f.reveals, 1); assert.equal(ctx.images.length, 0);
  assert.equal(f.frames.size, 0, 'no idle render loop');
  const dismissed = f.portrait.dismiss();
  f.tick(5000); await dismissed;
  assert.equal(f.board.querySelectorAll('.profile-piece').length, 32);
  assert.ok([...f.board.querySelectorAll('.profile-piece')].every(img => img.style.visibility === ''));
  assert.equal(f.frames.size, 0);
});

test('cancelling before sprites decode leaves no late portrait or hidden pieces', async t => {
  let decode;
  const decoded = new Promise(resolve => { decode = resolve; });
  const f = fixture(t, {decode: () => decoded});
  f.portrait.cancel(); decode(); await f.flush();
  assert.equal(f.reveals, 0); assert.equal(f.frames.size, 0); assert.equal(f.overlay.children.length, 0);
  assert.ok([...f.board.querySelectorAll('.profile-piece')].every(img => img.style.visibility === ''));
});

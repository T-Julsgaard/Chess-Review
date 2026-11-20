import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {ARCHETYPES} from '../lib/profile/archetypes.js';
import {PORTRAITS, PORTRAIT_SIZE} from '../lib/profile/portraits.js';
import {hasPortrait, portraitCredit, portraitTones, planMosaic, cellState, inkColor, TIMELINE, PORTRAIT_DURATION, PORTRAIT_STYLES, PORTRAIT_DELAY,
  planFace, faceState, developAt, plateAt, cubicBezier, glideEase, parseColor, faceGrid, FACE, SHADE_RANKS, PIECE_FILL, GLIDE} from '../lib/profile/portrait.js';
import {nearestBoardEdge} from '../lib/learning/piece-transition.js';
import {createProfileBoard, squareNames} from '../lib/profile/board.js';
import {buildDeck, buildReport} from '../lib/profile/deck.js';
import {buildInsights} from '../lib/profile/insights.js';
import {season} from './helpers/profile-season.mjs';

test('every historical twin has a credited portrait of the expected size', () => {
  for (const archetype of ARCHETYPES) {
    assert.ok(hasPortrait(archetype.id), archetype.id);
    const entry = PORTRAITS[archetype.id];
    assert.equal(Buffer.from(entry.data, 'base64').length, PORTRAIT_SIZE * PORTRAIT_SIZE, archetype.id);
    assert.match(entry.credit, /(Public domain|CC0|CC BY 4\.0)$/, archetype.id);
    assert.match(entry.source, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, archetype.id);
    assert.deepEqual(portraitCredit(archetype.id), {credit: entry.credit, source: entry.source});
  }
  assert.equal(hasPortrait('nobody'), false);
  assert.equal(hasPortrait(undefined), false);
});

test('tone maps resample to any grid and keep the face brighter than the corners', () => {
  for (const id of Object.keys(PORTRAITS)) {
    for (const n of [36, 44, 56]) {
      const tones = portraitTones(id, n);
      assert.equal(tones.length, n * n);
      assert.ok(tones.every(t => t >= 0 && t <= 1), `${id} ${n}`);
    }
    const n = 40, tones = portraitTones(id, n), at = (x, y) => tones[y * n + x];
    let centre = 0, corners = 0;
    for (let d = -4; d < 4; d++) for (let e = -4; e < 4; e++) centre += at(20 + d, 18 + e);
    for (const [x, y] of [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1]]) corners += at(x, y);
    assert.ok(centre / 64 > corners / 4, id);
  }
});

test('ink runs from dark umber to warm ivory', () => {
  const dark = inkColor(0), light = inkColor(1), mid = inkColor(.5);
  assert.ok(dark.every(c => c < 40)); assert.ok(light.every(c => c > 220));
  assert.ok(mid[0] > dark[0] && mid[0] < light[0]);
  assert.deepEqual(inkColor(-1), dark); assert.deepEqual(inkColor(2), light);
});

test('the mosaic lands outside-in and every piece ends exactly on its cell', () => {
  const n = 40, tones = portraitTones('fischer', n);
  const sources = [{x: .0625, y: .0625, w: .1, h: .1}, {x: .9375, y: .9375, w: .1, h: .1}];
  const cells = planMosaic(tones, n, {sources});
  assert.equal(cells.length, n * n);
  const centre = cells.filter(c => Math.hypot(c.x - .5, c.y - .45) < .15), edge = cells.filter(c => Math.hypot(c.x - .5, c.y - .45) > .45);
  const mean = list => list.reduce((s, c) => s + c.land, 0) / list.length;
  assert.ok(mean(centre) > mean(edge) + 800, 'the face lands last');
  for (const cell of cells) {
    assert.ok(cell.land >= TIMELINE.converge[0] && cell.land <= TIMELINE.converge[1]);
    const end = cellState(cell, PORTRAIT_DURATION);
    assert.ok(Math.abs(end.x - cell.x) < 1e-9 && Math.abs(end.y - cell.y) < 1e-9);
    assert.equal(end.settle, 1); assert.equal(Math.abs(end.turn), 0);
    assert.ok(Math.abs(end.scale - cell.size) < 1e-9);
    // Born from one of the board's pieces.
    const start = cellState(cell, cell.emit);
    assert.ok(sources.some(s => Math.abs(start.x - s.x) <= s.w * .3 + 1e-9 && Math.abs(start.y - s.y) <= s.h * .3 + 1e-9));
  }
  // Brighter cells get bigger pieces; the plan is deterministic.
  const dark = cells.filter(c => c.t < .15), light = cells.filter(c => c.t > .8);
  assert.ok(light.reduce((s, c) => s + c.size, 0) / light.length > dark.reduce((s, c) => s + c.size, 0) / dark.length);
  assert.deepEqual(planMosaic(tones, n, {sources}).map(c => c.land), cells.map(c => c.land));
});

test('portrait styles: new piece portraits remain additional options and assemble stays the default', () => {
  assert.deepEqual(PORTRAIT_STYLES, [{id: 'assemble', label: 'Assemble'}, {id: 'morph', label: 'Morph'}, {id: 'inlay', label: 'Inlay'}, {id: 'halftone', label: 'Mosaic'}, {id: 'swarm', label: 'Swarm'}]);
  assert.ok(PORTRAIT_DELAY >= 600 && PORTRAIT_DELAY <= 1600);
});

// The starting position, as the board reports it: codes and square centres, in squares.
const opening = () => {
  const out = [], back = 'RNBQKBNR';
  for (let f = 0; f < 8; f++) {
    out.push({code: 'b' + back[f], x: f + .5, y: .5, size: PIECE_FILL}, {code: 'bP', x: f + .5, y: 1.5, size: PIECE_FILL});
    out.push({code: 'wP', x: f + .5, y: 6.5, size: PIECE_FILL}, {code: 'w' + back[f], x: f + .5, y: 7.5, size: PIECE_FILL});
  }
  return out;
};

test('the glide easing is the board\'s cubic-bezier(.4, 0, .2, 1)', () => {
  assert.deepEqual(GLIDE.ease, [.4, 0, .2, 1]);
  assert.equal(glideEase(0), 0); assert.equal(glideEase(1), 1);
  const linear = cubicBezier(0, 0, 1, 1);
  for (const p of [.1, .25, .5, .9]) assert.ok(Math.abs(linear(p) - p) < 1e-6);
  let prev = 0;
  for (let p = .01; p <= 1; p += .01) { const v = glideEase(p); assert.ok(v >= prev - 1e-9, 'monotonic'); prev = v; }
  // Slow out of the start, decisive through the middle, gentle into the square.
  assert.ok(glideEase(.25) < .4 && glideEase(.5) > .7 && glideEase(.75) > .93);
});

test('mosaic: the face is a halftone of black pieces, grown and ranked by the shadow', () => {
  for (const id of ['tal', 'capablanca', 'carlsen', 'kasparov']) {
    const n = 40, tones = portraitTones(id, n), {cells, k, size} = planFace(tones, n, {sharpen: 0, equalize: 0});
    assert.equal(k, 5); assert.ok(Math.abs(size - FACE.max / 5) < 1e-12);
    assert.ok(cells.length > n * n * .3 && cells.length < n * n, `${id}: ${cells.length} pieces`);
    assert.ok(cells.every(c => /^b[PBNRQK]$/.test(c.code)), 'black pieces only');
    assert.equal(new Set(cells.map(c => c.gy * n + c.gx)).size, cells.length, 'one piece per cell');
    for (const c of cells) {
      assert.equal(c.x, (c.gx + .5) / k); assert.equal(c.y, (c.gy + .5) / k);
      const shade = 1 - tones[c.gy * n + c.gx];
      // Grows with the square root of the shadow, so its ink follows the shadow.
      assert.ok(Math.abs(c.sizeTo - FACE.max * Math.sqrt((shade - FACE.floor) / (1 - FACE.floor)) / k) < 1e-6);
      assert.ok(c.sizeTo >= FACE.min / k - 1e-9 && c.sizeTo <= size + 1e-9);
      const ink = (shade - FACE.floor) / (1 - FACE.floor), lowest = (FACE.min / FACE.max) ** 2;
      assert.equal(c.code[1], SHADE_RANKS[Math.min(5, Math.floor((ink - lowest) / (1 - lowest) * 6))]);
    }
    // The light of the face stays empty board; the darkest cells hold the kings and queens.
    const empty = [];
    for (let i = 0; i < n * n; i++) if (!cells.some(c => c.gy * n + c.gx === i)) empty.push(1 - tones[i]);
    assert.ok(empty.every(sh => sh < FACE.floor + (1 - FACE.floor) * (FACE.min / FACE.max) ** 2 + 1e-6));
    const meanShade = code => { const l = cells.filter(c => c.code === code); return l.reduce((s, c) => s + c.shade, 0) / l.length; };
    assert.ok(meanShade('bP') < meanShade('bR') && meanShade('bR') < meanShade('bK'), id);
  }
  assert.deepEqual([faceGrid(400), faceGrid(560), faceGrid(720), faceGrid(1200)], [32, 40, 48, 48]);
});

test('mosaic: pieces move like every other position change on the board', () => {
  const n = 40, sources = opening(), plan = planFace(portraitTones('fischer', n), n, {sources, seed: 11});
  const {cells, leaves, landed, duration} = plan;
  assert.ok(landed > 1800 && landed < 2800, `landed ${landed}`);
  assert.equal(duration, landed + FACE.develop - FACE.lead + 120);
  // Each black piece glides to a face cell of its own kind; the white ones leave through the nearest edge.
  const moved = cells.filter(c => c.kind === 'move');
  assert.equal(moved.length, 16);
  assert.ok(leaves.every(l => l.code[0] === 'w') && leaves.length === 16);
  assert.equal(moved.length + leaves.length, sources.length);
  assert.equal(new Set([...moved, ...leaves].map(c => c.source)).size, sources.length);
  for (const c of moved) {
    const s = sources[c.source], d = Math.hypot(s.x - c.x, s.y - c.y);
    assert.equal(c.code, s.code);
    assert.equal(c.start, 0); assert.equal(c.dur, 520 + Math.min(d * 34, 240));
    const begin = faceState(c, 0), end = faceState(c, c.dur);
    assert.deepEqual([begin.x, begin.y, begin.size], [s.x, s.y, PIECE_FILL]);
    assert.ok(Math.abs(end.x - c.x) < 1e-9 && Math.abs(end.y - c.y) < 1e-9 && Math.abs(end.size - c.sizeTo) < 1e-9);
  }
  for (const l of leaves) {
    assert.deepEqual(l.to, nearestBoardEdge(l.from));
    assert.ok(l.start <= 192 && l.dur === 680 + Math.min(Math.hypot(l.to.x - l.from.x, l.to.y - l.from.y) * 24, 220));
    assert.equal(faceState(l, l.start + l.dur).p, 1);
  }
  // The rest enter through the nearest edge, unseen until they set off.
  const entering = cells.filter(c => c.kind === 'enter');
  for (const c of entering) {
    assert.deepEqual(c.from, nearestBoardEdge({x: c.x, y: c.y}));
    assert.ok(c.from.x < 0 || c.from.x > 8 || c.from.y < 0 || c.from.y > 8, 'starts off the board');
    assert.equal(c.dur, 680 + Math.min(Math.hypot(c.x - c.from.x, c.y - c.from.y) * 24, 220));
    assert.equal(faceState(c, c.start - 1).visible, false);
    assert.equal(faceState(c, c.start).visible, true);
  }
  // Outside in: the pieces nearest the edge set off first, the middle of the face last.
  const depth = c => Math.min(c.x, 8 - c.x, c.y, 8 - c.y), avg = list => list.reduce((s, c) => s + c.start, 0) / list.length;
  assert.ok(avg(entering.filter(c => depth(c) < 1)) + 900 < avg(entering.filter(c => depth(c) > 3)));
  // Straight routes, no jumps, and everything lands exactly on its cell.
  for (const c of cells.filter((c, i) => c.kind === 'move' || i % 23 === 0)) {
    let prev = faceState(c, 0);
    for (let ms = 16; ms <= landed; ms += 16) {
      const s = faceState(c, ms);
      assert.ok(Math.hypot(s.x - prev.x, s.y - prev.y) < .3, 'no jumps');
      const cross = (s.x - c.from.x) * (c.to.y - c.from.y) - (s.y - c.from.y) * (c.to.x - c.from.x);
      assert.ok(Math.abs(cross) < 1e-9, 'on the straight line');
      prev = s;
    }
    const end = faceState(c, landed);
    assert.ok(Math.abs(end.x - c.x) < 1e-9 && Math.abs(end.y - c.y) < 1e-9 && end.p === 1 && !end.moving);
  }
  // Deterministic; works without board pieces; the plate comes up under the face.
  assert.deepEqual(planFace(portraitTones('fischer', n), n, {sources, seed: 11}).cells.map(c => [c.code, c.start]), cells.map(c => [c.code, c.start]));
  const empty = planFace(portraitTones('fischer', n), n);
  assert.equal(empty.leaves.length, 0); assert.equal(empty.cells.filter(c => c.kind === 'move').length, 0);
  assert.equal(plateAt(0, landed), 0); assert.ok(Math.abs(plateAt(landed, landed) - GLIDE.plate) < 1e-9);
});

test('mosaic: the photograph develops under the pieces as they land, outside in', () => {
  const n = 40, plan = planFace(portraitTones('kasparov', n), n, {sources: opening(), seed: 3});
  assert.equal(plan.n, n); assert.equal(plan.develop.length, n * n);
  // Under a piece, the shading develops as that piece lands.
  for (const c of plan.cells) assert.equal(plan.develop[c.gy * n + c.gx], Math.fround(c.start + c.dur));
  // Empty cells follow the same outside-in order.
  const at = (gx, gy) => plan.develop[gy * n + gx];
  assert.ok(at(0, 20) < at(10, 20) && at(10, 20) < at(19, 20));
  // Nothing before the start, everything by the end; and it plays backwards just the same.
  assert.ok(developAt(plan, 0).every(a => a === 0));
  assert.ok(developAt(plan, plan.duration).every(a => a === 1));
  const mid = developAt(plan, plan.landed * .5);
  assert.ok(mid.some(a => a === 0) && mid.some(a => a === 1), 'part developed half way');
  assert.ok(FACE.shade > .3 && FACE.shade < .8);
});

test('portrait square colours parse from computed styles', () => {
  assert.deepEqual(parseColor('rgb(240, 217, 181)'), [240, 217, 181]);
  assert.deepEqual(parseColor('rgba(181, 136, 99, 0.8)'), [181, 136, 99]);
  assert.deepEqual(parseColor('rgb(10 20 30)'), [10, 20, 30]);
  assert.deepEqual(parseColor('color(srgb 1 0.5 0)'), [255, 128, 0]);
  assert.equal(parseColor('rgba(0, 0, 0, 0)'), null);
  assert.equal(parseColor('transparent'), null);
  assert.equal(parseColor(''), null);
});

test('the board degrades to its position without a canvas and clears the portrait', t => {
  const dom = new JSDOM('<div class="board">' + '<div class="sq"></div>'.repeat(64) + '</div>');
  dom.window.HTMLCanvasElement.prototype.getContext = () => null;
  t.after(() => dom.window.close());
  const board = dom.window.document.querySelector('.board');
  const api = createProfileBoard({board, motion: () => false, makePiece: () => dom.window.document.createElement('img')});
  api.fen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const handle = api.portrait('tal');
  assert.equal(typeof handle.replay, 'function');
  assert.equal(board.querySelectorAll('.profile-piece').length, 32);
  assert.ok(!board.classList.contains('profile-portrait-burst'));
  api.clear();
  assert.equal(board.querySelector('.profile-board-overlay'), null);
  assert.equal(squareNames(false).length, 64);
});

test('the twin slide asks the board for the winner portrait', () => {
  const rows = season();
  const report = buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'});
  const twin = buildDeck(report, {account: 'tester', periodLabel: 'Past 12 months', engineStatus: 'idle'}).find(slide => slide.id === 'twin');
  assert.ok(twin);
  assert.equal(twin.board.portrait, report.twin.winner.id);
  assert.equal(twin.board.name, report.twin.winner.name);
  assert.ok(hasPortrait(twin.board.portrait));
  assert.ok(['moves', 'fen', 'cover'].includes(twin.board.kind));
});

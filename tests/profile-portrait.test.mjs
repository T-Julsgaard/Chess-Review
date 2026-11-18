import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {ARCHETYPES} from '../lib/profile/archetypes.js';
import {PORTRAITS, PORTRAIT_SIZE} from '../lib/profile/portraits.js';
import {hasPortrait, portraitCredit, portraitTones, planMosaic, cellState, inkColor, TIMELINE, PORTRAIT_DURATION, planAssemble, assembleState, ASSEMBLE, ASSEMBLE_DURATION, PORTRAIT_STYLES, PORTRAIT_DELAY} from '../lib/profile/portrait.js';
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

test('portrait styles: assemble is the default, swarm stays selectable', () => {
  assert.deepEqual(PORTRAIT_STYLES, [{id: 'assemble', label: 'Assemble'}, {id: 'swarm', label: 'Swarm'}]);
  assert.ok(PORTRAIT_DELAY >= 600 && PORTRAIT_DELAY <= 1600);
});

test('assemble: the board pieces fly into the face, the rest slide in from the edges, in about four seconds', () => {
  const n = 44, tones = portraitTones('fischer', n);
  const sources = [];
  for (const rank of [0, 1, 6, 7]) for (let file = 0; file < 8; file++) sources.push({x: (file + .5) / 8, y: (rank + .5) / 8, w: .1175, h: .1175, type: 'rnbqkbnr'[file]});
  const {cells, landed, duration} = planAssemble(tones, n, {sources, seed: 11});
  assert.equal(cells.length, n * n);
  assert.ok(landed >= 2500 && landed < duration, `landed ${landed}`);
  assert.ok(duration >= 3500 && duration <= 4500, `duration ${duration}`);
  assert.equal(duration, ASSEMBLE_DURATION);
  // The face is framed inside the board.
  const lo = (1 - ASSEMBLE.frame) / 2;
  assert.ok(cells.every(c => c.x > lo && c.x < 1 - lo && c.y > lo && c.y < 1 - lo));
  // Every board piece gets its own bright cell, keeps its shape and starts on its square, full size.
  const flown = cells.filter(c => c.board);
  assert.equal(flown.length, sources.length);
  assert.equal(new Set(flown.map(c => c.source)).size, sources.length);
  for (const c of flown) {
    const s = sources[c.source];
    assert.ok(c.t > .35, 'lands in the light');
    assert.equal(c.piece, ['p', 'n', 'b', 'r', 'q', 'k'].indexOf(s.type));
    const begin = assembleState(c, 0);
    assert.ok(Math.abs(begin.x - s.x) < 1e-9 && Math.abs(begin.y - s.y) < 1e-9);
    assert.ok(Math.abs(begin.scale * ASSEMBLE.frame / n - s.w) < 1e-9, 'starts at its own size');
    assert.equal(begin.ink, 0); assert.equal(begin.alpha, 1);
    assert.ok(c.start + c.dur <= ASSEMBLE.lift + ASSEMBLE.fly + 1e-9);
  }
  // The pieces from the top ranks take the top of the face.
  const top = flown.filter(c => sources[c.source].y < .5), bottom = flown.filter(c => sources[c.source].y > .5);
  const meanY = list => list.reduce((s, c) => s + c.y, 0) / list.length;
  assert.ok(meanY(top) < meanY(bottom));
  // Everything else enters from the nearer side edge, on its own row, invisible until it moves.
  for (const c of cells.filter(c => !c.board)) {
    assert.equal(c.from.x, c.gx < n / 2 ? -.04 : 1.04);
    assert.equal(c.from.y, c.y);
    assert.equal(assembleState(c, c.start).alpha, 0);
    assert.ok(c.start >= ASSEMBLE.waves[0]);
  }
  // Interlaced waves: row 0 before row 2 before row 1 before row 3.
  const rowStart = y => Math.min(...cells.filter(c => !c.board && c.gy === y).map(c => c.start));
  assert.ok(rowStart(0) < rowStart(2) && rowStart(2) < rowStart(1) && rowStart(1) < rowStart(3));
  // All settle exactly on their cells, in ink, at full opacity.
  for (const c of cells) {
    const end = assembleState(c, landed);
    assert.ok(Math.abs(end.x - c.x) < 1e-9 && Math.abs(end.y - c.y) < 1e-9);
    assert.ok(Math.abs(end.scale - c.size) < 1e-9);
    assert.equal(end.ink, 1); assert.equal(end.alpha, 1); assert.equal(end.moving, false);
  }
  // Deterministic, and fine without any board pieces.
  assert.deepEqual(planAssemble(tones, n, {sources, seed: 11}).cells.map(c => c.start), cells.map(c => c.start));
  const empty = planAssemble(tones, n);
  assert.equal(empty.cells.filter(c => c.board).length, 0);
  assert.ok(empty.duration <= 4500);
});

test('assemble: flight paths are smooth curves with no jumps', () => {
  const n = 40, tones = portraitTones('tal', n);
  const {cells, landed} = planAssemble(tones, n, {sources: [{x: .0625, y: .0625, w: .1, h: .1, type: 'r'}, {x: .5625, y: .9375, w: .1, h: .1}]});
  for (const c of cells.filter((c, i) => c.board || i % 97 === 0)) {
    let prev = assembleState(c, 0);
    for (let ms = 16; ms <= landed; ms += 16) {
      const s = assembleState(c, ms);
      assert.ok(Math.hypot(s.x - prev.x, s.y - prev.y) < .04, 'no jumps');
      prev = s;
    }
  }
  assert.equal(cells.find(c => c.source === 1).piece, -1, 'an unknown piece takes the shape its tone ranks');
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

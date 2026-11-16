import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {ARCHETYPES} from '../lib/profile/archetypes.js';
import {PORTRAITS, PORTRAIT_SIZE} from '../lib/profile/portraits.js';
import {hasPortrait, portraitCredit, portraitTones, planMosaic, cellState, inkColor, TIMELINE, PORTRAIT_DURATION} from '../lib/profile/portrait.js';
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

// The "year in one card" renderer, drawn against a recording 2D-context stub.
import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights} from '../lib/profile/insights.js';
import {buildReport} from '../lib/profile/deck.js';
import {drawProfileCard, drawCard, cardHours, cardTiles, cardRating, CARD_W, CARD_H} from '../lib/profile/share.js';
import {season} from './helpers/profile-season.mjs';

// Text width ≈ 0.6 em per character (wider than real system-ui digits and
// letters on average), so the bounds check is on the pessimistic side.
function recordingCanvas() {
  const texts = [];
  const ctx = {
    font: '16px sans-serif', fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic', letterSpacing: '0px', lineJoin: 'miter', lineCap: 'butt',
    get px() { return Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] || 16); },
    measureText(s) { return {width: [...String(s)].length * this.px * 0.6}; },
    fillText(s, x, y) { texts.push({text: String(s), x, y, px: this.px, align: this.textAlign, width: this.measureText(s).width}); },
    createRadialGradient: () => ({addColorStop() {}}), createLinearGradient: () => ({addColorStop() {}}),
  };
  for (const name of ['fillRect', 'strokeRect', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'fill', 'stroke', 'clip', 'save', 'restore', 'drawImage']) ctx[name] = () => {};
  return {canvas: {width: 0, height: 0, getContext: () => ctx}, texts};
}
const report = (() => {
  const rows = season();
  const r = buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'});
  r.totals.hours = 113.4;
  return r;
})();
const all = texts => texts.map(t => t.text).join('\n');
function assertInBounds(texts) {
  for (const t of texts) {
    const left = t.align === 'right' ? t.x - t.width : t.align === 'center' ? t.x - t.width / 2 : t.x;
    assert.ok(left >= 0 && left + t.width <= CARD_W, `"${t.text}" spans ${left.toFixed(0)}–${(left + t.width).toFixed(0)} px`);
    assert.ok(t.y - t.px * 0.8 >= 0 && t.y + t.px * 0.25 <= CARD_H, `"${t.text}" at y ${t.y} (${t.px}px) leaves the card`);
  }
}

test('drawProfileCard draws the name, hero count, hours and tiles from a real report', () => {
  const {canvas, texts} = recordingCanvas();
  assert.equal(drawProfileCard(canvas, report), canvas);
  assert.equal(canvas.width, 1200); assert.equal(canvas.height, 630);
  const s = all(texts);
  assert.ok(texts.some(t => t.text === 'tester'));
  assert.ok(texts.some(t => t.text === '300'), 'games played is the hero number');
  assert.match(s, /games played/);
  assert.match(s, /PAST 12 MONTHS {2}· {2}CHESS\.COM/);
  assert.ok(texts.some(t => t.text === '113'), 'hours as a bare number');
  assert.match(s, /hours played/);
  assert.doesNotMatch(s, /\d h\b/, 'no "113 h" style suffix');
  assert.match(s, /PEAK BLITZ RATING/);
  assert.match(s, /FAVOURITE OPENING/); assert.match(s, /HISTORICAL TWIN/); assert.match(s, /RIVAL/);
  assert.ok(texts.some(t => t.text === 'rival_rick'));
  assert.match(s, /Chess Review/);
  assert.doesNotMatch(s, /undefined|NaN|null/);
  assertInBounds(texts);
});

test('long names, openings and big counts shrink or ellipsize inside the card', () => {
  const long = structuredClone(report);
  long.account = 'TheExtremelyLongUsernameOfDoom2026WithMore';
  long.site = 'both'; long.periodLabel = 'January 2026 – December 2026';
  long.openings.w.top[0].name = "Queen's Gambit Declined: Semi-Slav Defense, Accelerated Meran Variation, Some Sideline";
  long.openings.w.top[0].games = 9999;
  long.twin.winner.name = 'Alexander Alekhine and Friends of the Board Extended';
  long.opponents.rival.name = 'an_absurdly_long_rival_name_that_never_ends_here';
  Object.assign(long.totals, {games: 1234567, w: 600000, d: 134567, l: 500000});
  const {canvas, texts} = recordingCanvas();
  drawProfileCard(canvas, long, {theme: 'light', flag: '🇩🇰', accent: '#3366cc'});
  assertInBounds(texts);
  assert.ok(texts.some(t => t.text.startsWith('TheExtremely') && t.text.endsWith('…')));
  assert.ok(texts.some(t => t.text === 'DK'), 'flag emoji becomes a country badge');
  assert.ok(texts.some(t => t.text === '1,234,567'));
});

test('a sparse report degrades without crashing or drawing placeholders', () => {
  const {canvas, texts} = recordingCanvas();
  drawProfileCard(canvas, {account: 'newbie', totals: {games: 3, w: 1, d: 0, l: 2, hours: 0.5}});
  const s = all(texts);
  assert.match(s, /newbie/); assert.match(s, /minutes played/);
  assert.doesNotMatch(s, /undefined|NaN|null|PEAK/);
  assertInBounds(texts);
  const empty = recordingCanvas();
  drawProfileCard(empty.canvas, null);
  assertInBounds(empty.texts);
});

test('card helpers: hours, tile choice and rating class', () => {
  assert.deepEqual(cardHours(113.4), {value: '113', unit: 'hours'});
  assert.deepEqual(cardHours(2.46), {value: '2.5', unit: 'hours'});
  assert.deepEqual(cardHours(0.25), {value: '15', unit: 'minutes'});
  assert.equal(cardHours(0), null);
  assert.deepEqual(cardTiles(report, 4).map(t => t.id), ['hours', 'opening', 'twin', 'rival']);
  assert.equal(cardTiles({totals: {}}).length, 0);
  const rating = cardRating(report);
  assert.equal(rating.cls, 'blitz'); assert.equal(rating.peak, 1750); assert.ok(rating.series.length > 2);
  assert.equal(cardRating({totals: {}}), null);
});

test('the old drawCard export still renders', () => {
  const {canvas, texts} = recordingCanvas();
  drawCard(canvas, {account: 'tester', periodLabel: 'Past 12 months', site: 'chesscom', totals: report.totals});
  assert.ok(texts.some(t => t.text === 'tester'));
});

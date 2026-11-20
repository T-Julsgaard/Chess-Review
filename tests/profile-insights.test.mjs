import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights, totals, habits, opponents, streaks, signature, ratings, openings, material, terminations} from '../lib/profile/insights.js';
import {classify, ARCHETYPES, tendencies} from '../lib/profile/archetypes.js';
import {buildDeck, buildReport, fmt} from '../lib/profile/deck.js';
import {Chess} from '../lib/chess.js';

import {season} from './helpers/profile-season.mjs';

test('insights: totals, ratings, openings and opponents from a synthetic season', () => {
  const rows = season();
  const T = totals(rows);
  assert.equal(T.games, 300); assert.equal(T.w + T.d + T.l, 300); assert.ok(T.hours > 20 && T.hours < 30);
  assert.ok(T.longest.moves >= 60);
  const R = ratings(rows);
  assert.ok(R.blitz.games > 200 && R.bullet.games > 60);
  assert.equal(R.blitz.peak.rating, Math.max(...rows.filter(r => r.cls === 'blitz').map(r => r.myRating)));
  assert.equal(R.blitz.series.length, R.blitz.games, 'every rating can be inspected');
  assert.ok(R.blitz.bestMonth);
  const Op = openings(rows);
  assert.equal(Op.w.top[0].name, 'Italian Game'); assert.equal(Op.b.top[0].name, 'Sicilian Defense');
  assert.equal(Op.firstMoves.white.move, 'e4'); assert.equal(Op.firstMoves.vsE4.move, 'c5');
  assert.ok(Op.w.top[0].line.startsWith('e4 e5'));
  const O = opponents(rows);
  assert.equal(O.rival.name, 'rival_rick'); assert.equal(O.nemesis.name, 'nemesis_nina'); assert.equal(O.victim.name, 'victim_vic');
  assert.ok(O.strongestBeaten.rating >= 1550); assert.ok(O.distinct === 13);
});

test('insights: streaks, habits, terminations, material and signatures', () => {
  const rows = season();
  const S = streaks(rows);
  assert.ok(S.win.length >= 2 && S.loss.length >= 2 && S.unbeaten.length >= S.win.length);
  assert.ok(S.busiestDay.games >= 1);
  const H = habits(rows);
  assert.equal(H.matrix.length, 7); assert.equal(H.matrix[0].length, 8);
  assert.equal(H.matrix.flat().reduce((s, c) => s + c.g, 0), 300);
  assert.ok(H.busiestWeekday && H.activeDays > 200);
  assert.ok(H.afterLoss.games + H.afterWin.games <= 300);
  const X = terminations(rows);
  assert.ok(X.mates > 0 && X.favouritePiece[0] === 'q' && X.favouritePattern[0] === 'back-rank');
  assert.equal(Object.values(X.wins).reduce((a, b) => a + b, 0), totals(rows).w);
  const M = material(rows);
  assert.ok(M.comeback && M.comeback.deficit === -5 && M.comebacks >= 1);
  assert.ok(M.choke && M.choke.surplus === 6);
  assert.ok(M.conversion != null && M.resilience != null);
  const G = signature(rows);
  assert.ok(G.habits.length >= 3 && G.habits.length <= 6, 'three to six signatures'); assert.equal(G.favouriteSquares[0].square, 'e4');
  assert.ok(G.all.length > G.habits.length && G.all.every((h, i) => !i || G.all[i - 1].score >= h.score), 'every metric, most unusual first');
  assert.ok(G.habits.every(h => /\d/.test(h.text)));
  assert.equal(signature(rows.slice(0, 5)).habits.length, 0);
});

test('archetypes: every roster entry is well formed, famous lines are legal, and the twin has reasons', () => {
  const ids = new Set();
  for (const a of ARCHETYPES) {
    assert.ok(!ids.has(a.id)); ids.add(a.id);
    assert.ok(a.name && a.era && a.tagline && a.blurb && Object.keys(a.traits).length >= 4);
    if (a.famous) {
      const chess = new Chess();
      for (const san of a.famous.moves) assert.ok(chess.move(san), a.id + ' ' + san);
      assert.ok(chess.isCheckmate(), a.id + ' famous game ends in mate');
      assert.ok(a.famous.from < a.famous.moves.length);
    }
  }
  const rows = season();
  const twin = classify(rows);
  assert.ok(twin.winner.name && twin.runnerUp.name !== twin.winner.name);
  assert.ok(twin.winner.reasons.length >= 2 && twin.winner.reasons.every(r => /%|\d/.test(r)));
  assert.ok(twin.exemplar && twin.exemplar.fen);
  assert.equal(classify(rows.slice(0, 5)), null);
  const t = tendencies(rows);
  assert.ok(t.norm.e4 > 0.5 && t.raw.sicilian > 0.9);
  // A speed demon lands on Nakamura; a grinder who never loses material lands on Petrosian or Capablanca.
  const speed = rows.map(r => ({...r, cls: 'bullet', snap: 19, thinkN: 20, term: r.res === 'w' ? 'time' : r.term}));
  assert.equal(classify(speed).winner.id, 'nakamura');
  const grinder = rows.map(r => ({...r, res: r.res === 'l' ? 'd' : r.res, matMin: 0, n: 140, endgame: 80, qtrade: 12, cls: 'rapid', snap: 0}));
  assert.ok(['petrosian', 'capablanca', 'carlsen'].includes(classify(grinder).winner.id), classify(grinder).winner.id);
});

test('deck: a full season builds every slide with evidence and boards; a thin one stops at the cover', () => {
  const rows = season();
  const insights = buildInsights(rows);
  const report = buildReport(rows, insights, {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'});
  const deck = buildDeck(report, {account: 'tester', periodLabel: 'Past 12 months', engineStatus: 'idle', engineBudgetLabel: 'About 10 minutes.'});
  const ids = deck.map(s => s.id);
  assert.deepEqual(ids, ['cover', 'numbers', 'rating', 'openings', 'twin', 'signature', 'rival', 'hits', 'swings', 'habits', 'clock', 'trend', 'endings', 'share']);
  for (const slide of deck) {
    assert.ok(slide.title && slide.eyebrow && slide.board && slide.board.kind, slide.id);
    for (const stat of slide.stats || []) assert.ok(stat.label && stat.value != null, slide.id + ' stat');
    for (const line of slide.bullets || []) assert.equal(typeof line, 'string');
    if (slide.evidence) assert.ok(slide.evidence.url && slide.evidence.label);
  }
  assert.equal(deck.find(s => s.id === 'trend').pending, 'engine');
  assert.equal(deck.find(s => s.id === 'openings').board.kind, 'moves');
  assert.equal(deck.find(s => s.id === 'habits').board.kind, 'schedule');
  assert.ok(deck.find(s => s.id === 'swings').title.startsWith('Down 5'));
  const thin = buildDeck(buildReport(rows.slice(0, 4), buildInsights(rows.slice(0, 4)), {account: 'x', site: 'chesscom'}), {account: 'x'});
  assert.equal(thin.length, 1);
  // Engine figures replace the pending state.
  // Every game checked, so the comeback (which must end by mate or resignation) is among them.
  const engine = Object.fromEntries(rows.map((r, i) => [r.id, {acc: 70 + (i % 20), minWin: 12, minPly: 31, maxWin: 95, maxPly: 20, blunders: 1}]));
  const withEngine = buildDeck(buildReport(rows, buildInsights(rows, {engine}), {account: 'tester', site: 'chesscom'}), {account: 'tester', engineStatus: 'done'});
  const trend = withEngine.find(s => s.id === 'trend');
  assert.equal(trend.pending, null); assert.ok(trend.stats.length >= 2); assert.equal(trend.board.scene.type, 'line', 'accuracy over time on the board');
  assert.ok(withEngine.find(s => s.id === 'swings').lead.includes('12%'));
  assert.equal(fmt.hours(0.5), '30 min'); assert.equal(fmt.seconds(95), '1 min 35 s'); assert.equal(fmt.signed(12), '+12');
});

test('deck: bullet alone gets premove and sub-second move-time columns; mixed controls keep the usual ones', () => {
  const deckFor = rows => buildDeck(buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'}), {account: 'tester'}).find(s => s.id === 'clock');
  const bullet = deckFor(season().filter(r => r.cls === 'bullet'));
  assert.deepEqual(bullet.board.scene.columns.map(c => c.label), ['Premove', '.1–.5s', '.5–1s', '1–2s', '2–3s', '3–5s', '5–10s', '10s+']);
  assert.match(bullet.points[0], /^15% of your moves were premoves$/);
  assert.match(bullet.board.scene.columns[0].detail, /premoves \(0\.1 s or less/);
  const mixed = deckFor(season());
  assert.equal(mixed.board.scene.columns[0].label, '0–1s');
  assert.match(mixed.points[2], /30 seconds or more/);
});

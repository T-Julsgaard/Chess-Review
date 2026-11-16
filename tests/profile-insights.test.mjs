import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights, totals, habits, opponents, streaks, signature, ratings, openings, material, terminations} from '../lib/profile/insights.js';
import {classify, ARCHETYPES, tendencies} from '../lib/profile/archetypes.js';
import {buildDeck, buildReport, fmt} from '../lib/profile/deck.js';
import {Chess} from '../lib/chess.js';

// Deterministic synthetic season: 300 games over a year with a built-in rival, night games and habits.
function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
export function season(count = 300, seed = 7) {
  const rand = rng(seed), rows = [], start = Date.UTC(2026, 0, 5, 18) / 1000;
  const opps = ['rival_rick', 'nemesis_nina', 'victim_vic', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const openings = [['C50', 'Italian Game', 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O'], ['B20', 'Sicilian Defense', 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5'], ['D02', 'London System', 'd4 d5 Bf4 Nf6 e3 c5 c3 Nc6 Nd2 e6 Ngf3 Bd6']];
  let rating = 1500;
  for (let i = 0; i < count; i++) {
    const t = start + i * 86400 * 1.2 + (i % 3) * 3600 * 2;
    const oppIdx = i % 7 === 0 ? 0 : i % 9 === 0 ? 1 : i % 10 === 0 ? 2 : 3 + Math.floor(rand() * 10);
    const opp = opps[oppIdx];
    const r = rand();
    let res = r < 0.5 ? 'w' : r < 0.9 ? 'l' : 'd';
    if (oppIdx === 1) res = 'l';
    if (oppIdx === 2) res = 'w';
    rating += res === 'w' ? 8 : res === 'l' ? -7 : 0;
    const me = i % 2 ? 'b' : 'w';
    const op = openings[me === 'w' ? (i % 5 === 0 ? 2 : 0) : 1];
    const n = 40 + Math.floor(rand() * 80);
    const term = res === 'd' ? 'repetition' : rand() < 0.3 ? 'mate' : rand() < 0.5 ? 'resign' : 'time';
    rows.push({v: 1, id: String(i), site: 'chesscom', url: 'https://www.chess.com/game/live/' + i, t, cls: i % 4 === 0 ? 'bullet' : 'blitz', tc: '180+2', rated: true, me, opp, oppRating: 1480 + Math.floor(rand() * 100), myRating: rating,
      res, term, eco: op[0], op: op[1], bot: false, n, myMoves: Math.ceil(n / 2), knights4: rand() < 0.7, castle: rand() < 0.6 ? 6 : 0, castleSide: 'k', oppCastleSide: 'k', fian: me === 'b' && rand() < 0.2, qtrade: rand() < 0.1 ? 15 : 0,
      qEarly: false, gambit: false, storm: rand() < 0.4, pair25: false, ep: 0, promo: 0, under: 0, checks: 2 + Math.floor(rand() * 4), caps: 8, mateBy: res === 'w' && term === 'mate' ? 'q' : null, matePattern: res === 'w' && term === 'mate' ? 'back-rank' : null, matedBy: res === 'l' && term === 'mate' ? 'q' : null,
      matMin: res === 'w' && i % 17 === 0 ? -5 : -1, matMax: res !== 'w' && i % 19 === 0 ? 6 : res === 'w' && i % 6 === 0 ? 4 : 2, matFinal: 0, lowPly: 30, highPly: 20, swings: 0, endgame: n > 90 ? 70 : 0,
      think: 6, thinkN: 20, snap: 8, longThink: 20 + Math.floor(rand() * 60), longPly: 23, trouble: rand() < 0.3, ahead: 0.6, dur: 300, line: op[2], first: me === 'w' ? op[2].split(' ')[0] + ' ' + op[2].split(' ')[2] : op[2].split(' ')[1] + ' ' + op[2].split(' ')[3],
      fenEnd: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenLow: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', fenHigh: '', heat: '0'.repeat(28) + '5' + '0'.repeat(35)});
  }
  return rows;
}

test('insights: totals, ratings, openings and opponents from a synthetic season', () => {
  const rows = season();
  const T = totals(rows);
  assert.equal(T.games, 300); assert.equal(T.w + T.d + T.l, 300); assert.ok(T.hours > 20 && T.hours < 30);
  assert.ok(T.longest.moves >= 60);
  const R = ratings(rows);
  assert.ok(R.blitz.games > 200 && R.bullet.games > 60);
  assert.equal(R.blitz.peak.rating, Math.max(...rows.filter(r => r.cls === 'blitz').map(r => r.myRating)));
  assert.ok(R.blitz.series.length <= 60 && R.blitz.bestMonth);
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
  assert.equal(G.habits.length, 3); assert.equal(G.favouriteSquares[0].square, 'e4');
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
  const engine = Object.fromEntries(rows.slice(0, 60).map((r, i) => [r.id, {acc: 70 + (i % 20), minWin: 12, minPly: 31, maxWin: 95, maxPly: 20, blunders: 1}]));
  const withEngine = buildDeck(buildReport(rows, buildInsights(rows, {engine}), {account: 'tester', site: 'chesscom'}), {account: 'tester', engineStatus: 'done'});
  const trend = withEngine.find(s => s.id === 'trend');
  assert.equal(trend.pending, null); assert.ok(trend.stats.length >= 2); assert.equal(trend.board.kind, 'split');
  assert.ok(withEngine.find(s => s.id === 'swings').lead.includes('12%'));
  assert.equal(fmt.hours(0.5), '30 min'); assert.equal(fmt.seconds(95), '1 min 35 s'); assert.equal(fmt.signed(12), '+12');
});

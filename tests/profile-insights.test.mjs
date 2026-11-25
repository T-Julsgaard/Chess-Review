import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights, totals, habits, opponents, streaks, signature, ratings, openings, material, terminations, mateInOne, byOpponentRating, smoothed, resultRuns} from '../lib/profile/insights.js';
import {classify, ARCHETYPES, tendencies} from '../lib/profile/archetypes.js';
import {buildDeck, buildReport, fmt, resultsByRating, resultsOverTime, mateInOneShares} from '../lib/profile/deck.js';
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
  // Results by opponent rating: contiguous bands, every rated game counted once.
  const {step, bands} = O.byRating, rated = rows.filter(r => !r.bot && r.oppRating);
  assert.ok(bands.length >= 2 && bands.length <= 16);
  assert.equal(bands.reduce((s, b) => s + b.games, 0), rated.length);
  bands.forEach((b, i) => { assert.equal(b.to - b.from + 1, step); assert.equal(b.w + b.d + b.l, b.games); if (i) assert.equal(b.from, bands[i - 1].to + 1); });
  assert.ok(bands[0].from <= Math.min(...rated.map(r => r.oppRating)) && bands.at(-1).to >= Math.max(...rated.map(r => r.oppRating)));
});

test('best wins: quickest checkmate counts only games the player won by mate', () => {
  const rows = season(20);
  Object.assign(rows[0], {n: 4, res: 'w', term: 'resign'});
  Object.assign(rows[1], {n: 5, res: 'l', term: 'mate'});
  Object.assign(rows[2], {n: 7, res: 'w', term: 'mate'});
  const report = buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom'});
  const bestWins = () => buildDeck(report, {account: 'tester'}).find(s => s.id === 'hits');
  const fact = bestWins().stats.find(s => s.label === 'Quickest checkmate');
  assert.equal(fact.value, '4 moves');
  assert.equal(fact.game, 'also');
  assert.equal(bestWins().alsoEvidence.url, rows[2].url);
  assert.equal(totals(rows.slice(0, 2)).quickestMate, null);

  // A report shared by the old version can only show the game it carried.
  report.totals.quickestWin = report.totals.quickestMate;
  delete report.totals.quickestMate;
  assert.equal(bestWins().alsoEvidence.url, rows[2].url);
  report.totals.quickestWin = {...report.totals.quickestWin, term: 'resign'};
  assert.equal(bestWins().alsoEvidence, null);
});

test('insights: results by opponent rating pick a band width that fits the board', () => {
  const row = (oppRating, res) => ({oppRating, res});
  assert.equal(byOpponentRating([row(1500, 'w')]), null, 'too few games');
  assert.equal(byOpponentRating(Array.from({length: 12}, () => row(1510, 'w'))), null, 'one band says nothing');
  const narrow = byOpponentRating(Array.from({length: 20}, (_, i) => row(1200 + i * 30, ['w', 'd', 'l'][i % 3])));
  assert.equal(narrow.step, 50); assert.deepEqual([narrow.bands[0].from, narrow.bands.at(-1).to], [1200, 1799]);
  const wide = byOpponentRating(Array.from({length: 20}, (_, i) => row(400 + i * 140, 'l')));
  assert.equal(wide.step, 200); assert.ok(wide.bands.length <= 16);
  const deck = resultsByRating(narrow);
  assert.equal(deck.scene.type, 'results');
  assert.deepEqual(deck.scene.columns.map(c => c.label), narrow.bands.map(b => `${b.from}–${b.to}`), 'every band named by its rating range');
  assert.equal(deck.scene.columns[0].label, '1200–1249');
  assert.ok(deck.scene.columns.every(c => !c.games || Math.abs(c.w + c.d + c.l - 1) < 1e-9));
});

test('insights: results by opponent rating never leave an empty column', () => {
  const row = (oppRating, res) => ({oppRating, res});
  // Most games around 1200–1400 and one opponent far above: narrow bands would leave holes.
  const rated = [...Array.from({length: 14}, (_, i) => row(1200 + i * 15, ['w', 'l'][i % 2])), row(1900, 'w')];
  const R = byOpponentRating(rated);
  assert.ok(R.bands.every(b => b.games), 'every column has games');
  assert.equal(R.bands.reduce((s, b) => s + b.games, 0), rated.length);
  R.bands.forEach((b, i) => { if (i) assert.equal(b.from, R.bands[i - 1].to + 1, 'bands stay contiguous'); });
  assert.ok(R.bands.at(-1).to >= 1900 && R.bands.at(-1).from < 1900);
  // Evenly spread games keep even bands.
  const even = byOpponentRating(Array.from({length: 20}, (_, i) => row(1200 + i * 30, 'w')));
  assert.ok(even.bands.every(b => b.to - b.from + 1 === even.step));
});

test('insights: the one that got away is a loss on the board from ahead; your results over time come by calendar month', () => {
  const base = {res: 'l', matMin: 0, matMax: 5, t: 1};
  const M = material([{...base, id: 'draw', res: 'd', term: 'repetition', matMax: 9}, {...base, id: 'flag', term: 'time', matMax: 8}, {...base, id: 'resigned', term: 'resign'}]);
  assert.equal(M.choke.id, 'resigned', 'draws and losses on time do not count');
  assert.equal(material([{...base, res: 'd', term: 'agree'}]).choke, null);
  const rows = season(), T = totals(rows);
  const span = new Date(T.runs.at(-1).from * 1000), start = new Date(T.runs[0].from * 1000);
  assert.ok(T.runs.every(r => r.unit === 'month'), 'a season of games is counted by calendar month');
  assert.equal(T.runs.length, (span.getFullYear() - start.getFullYear()) * 12 + span.getMonth() - start.getMonth() + 1, 'one column per month, none skipped');
  assert.ok(T.runs.every(r => new Date(r.from * 1000).getDate() === 1 && new Date((r.to + 1) * 1000).getDate() === 1), 'each column is a whole month');
  assert.equal(T.runs.reduce((s, r) => s + r.games, 0), T.games, 'every game in one month');
  assert.deepEqual(['w', 'd', 'l'].map(k => T.runs.reduce((s, r) => s + r[k], 0)), [T.w, T.d, T.l]);
  assert.ok(T.runs.every((r, i) => r.from <= r.to && (!i || T.runs[i - 1].to < r.from)), 'oldest first');
  const chart = resultsOverTime(T.runs);
  assert.equal(chart.scene.type, 'results');
  assert.equal(chart.scene.label, 'Your results over time, oldest on the left.');
  assert.ok(chart.scene.columns.every(c => !c.games || Math.abs(c.w + c.d + c.l - 1) < 1e-9));
  assert.match(chart.scene.columns[0].detail, /^[A-Z][a-z]+ \d{4}: \d+ games\. Won \d+, drew \d+, lost \d+\.$/, 'a column says which month it is');
  assert.ok(chart.scene.columns.every(c => /^[A-Z][a-z]{2}$/.test(c.label)), 'every column is named by its month alone');
  assert.equal(totals(rows.slice(0, 1)).runs, null, 'one game is not a trend');
  // Months or years, nothing finer: a short span is still counted by month, a long one by year.
  const at = (y, m, d) => new Date(y, m, d, 12).getTime() / 1000;
  assert.deepEqual(resultRuns([[at(2026, 2, 2), 'w'], [at(2026, 2, 5), 'l']]).map(r => [r.unit, r.games]), [['month', 2]]);
  assert.deepEqual(resultRuns([[at(2026, 2, 4), 'w'], [at(2026, 3, 25), 'd']]).map(r => [r.unit, r.games]), [['month', 1], ['month', 1]]);
  const years = resultRuns([[at(2021, 5, 1), 'w'], [at(2026, 1, 1), 'l']]);
  assert.deepEqual(years.map(r => r.unit + new Date(r.from * 1000).getFullYear()), ['year2021', 'year2022', 'year2023', 'year2024', 'year2025', 'year2026']);
  assert.deepEqual(resultsOverTime(years).scene.columns.map(c => c.label), ['2021', '2022', '2023', '2024', '2025', '2026']);
  const deck = buildDeck(buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom'}), {account: 'tester'});
  const swings = deck.find(s => s.id === 'swings');
  assert.equal(swings.alsoEvidence.label, 'View the one that got away', 'the comeback chapter also links the lost game');
  assert.ok(swings.stats.find(s => s.label === 'The one that got away').sub.endsWith('lost'));
  const habitStats = deck.find(s => s.id === 'habits').stats;
  assert.equal(habitStats.length, 4, 'four boxes');
  assert.match(habitStats[3].value, /^\d\d:00–\d\d:00$/);
});

test('insights: streaks, habits, terminations, material and signatures', () => {
  const rows = season();
  const S = streaks(rows);
  assert.ok(S.win.length >= 2 && S.loss.length >= 2 && S.unbeaten.length >= S.win.length);
  assert.ok(S.busiestDay.games >= 1);
  const H = habits(rows);
  assert.equal(H.matrix.length, 7); assert.equal(H.matrix[0].length, 8);
  assert.equal(H.matrix.flat().reduce((s, c) => s + c.g, 0), 300);
  // The habits chart: 06–09 … 21–24, then 00–06 merged at the end, every game kept.
  assert.equal(H.habitMatrix[0].length, 7);
  assert.equal(H.habitMatrix.flat().reduce((s, c) => s + c.g, 0), 300);
  for (let d = 0; d < 7; d++) { assert.deepEqual(H.habitMatrix[d][0], H.matrix[d][2]); assert.equal(H.habitMatrix[d][6].g, H.matrix[d][0].g + H.matrix[d][1].g); }
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
  // A figure that is normal for the rating ("you win 50%, against about 51%") is never offered as a reason.
  const average = rows.map((r, i) => ({...r, res: ['w', 'l', 'w', 'l', 'd'][i % 5]}));
  for (const set of [rows, average]) for (const archetype of classify(set).ranking) for (const line of archetype.reasons) {
    const [mine, theirs] = line.split(', against about ');
    if (theirs == null) continue;
    const a = Number(mine.match(/\d+(\.\d+)?/g).at(-1)), b = Number(theirs.match(/\d+(\.\d+)?/)[0]);
    assert.ok(Math.abs(a - b) >= (/\d\.\d/.test(theirs) ? .1 : 3), `${archetype.name}: ${line}`);
  }
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
  insights.streaks.bestDay = {date: '2026-11-17', w: 21, games: 27};
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
  const bestWins = deck.find(s => s.id === 'hits');
  assert.equal(bestWins.stats.some(stat => stat.label === 'Best day'), false);
  assert.deepEqual(bestWins.bullets ?? [], []);
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
  // One point per day with checked games, not one per month.
  const days = new Set(rows.map(r => new Date(r.t * 1000).toDateString())).size;
  assert.equal(trend.board.scene.series.length, days); assert.ok(days > 12); assert.equal(trend.board.scene.smooth, true);
  assert.equal(trend.board.scene.series.reduce((s, p) => s + p.n, 0), rows.length);
  // The headline reads the two ends of the averaged line drawn on the board.
  const line = smoothed(trend.board.scene.series);
  assert.equal(trend.title, `${fmt.pct(line[0].r)} → ${fmt.pct(line.at(-1).r)}`);
  assert.match(trend.lead, /^Your average accuracy at the start of the period and at its end, across \d+ checked games\.$/);
  assert.equal(trend.board.scene.live, false, 'a finished check draws the average');
  const endings = withEngine.find(s => s.id === 'endings');
  assert.match(endings.lead, /^Wins by [a-z]+ [\d.]+%, [a-z]+ [\d.]+%, [a-z]+ [\d.]+%\.$/);
  assert.equal(endings.stats.length, 4, 'four boxes, not an odd three');
  assert.deepEqual(endings.stats[3], {label: 'Favourite finisher', value: 'Queen', sub: endings.stats[3].sub}); assert.match(endings.stats[3].sub, /^[\d.]+% of your mates$/);
  assert.ok(withEngine.find(s => s.id === 'swings').lead.includes('12%'));
  assert.equal(fmt.hours(0.5), '30 min'); assert.equal(fmt.seconds(95), '1 min 35 s'); assert.equal(fmt.signed(12), '+12');
});

test('deck: bullet alone gets premove and sub-second move-time columns; mixed controls keep the usual ones', () => {
  const deckFor = rows => buildDeck(buildReport(rows, buildInsights(rows), {account: 'tester', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'}), {account: 'tester'}).find(s => s.id === 'clock');
  const bullet = deckFor(season().filter(r => r.cls === 'bullet'));
  assert.deepEqual(bullet.board.scene.columns.map(c => c.label), ['Premove', '0.1–0.5s', '0.5–1s', '1–2s', '2–3s', '3–5s', '5–10s', '10s+']);
  assert.equal(bullet.board.scene.floor, true, 'the bullet chart stands on the bottom edge of the board');
  // Increase granularity: tenths of a second, each column inside the usual column it splits from.
  const fine = bullet.fineBoard.scene.columns;
  assert.equal(fine.length, 24);
  assert.deepEqual(fine.slice(0, 4).map(c => c.label), ['Pre', '0.1s', '0.2s', '0.3s']);
  assert.deepEqual(fine.slice(-4).map(c => c.label), ['2s', '3s', '5s', '10s+']);
  assert.deepEqual([...new Set(fine.map(c => c.group))], [0, 1, 2, 3, 4, 5, 6, 7], 'every usual column splits into at least one');
  assert.ok(Math.abs(fine.reduce((s, c) => s + c.value, 0) - 100) < 1e-6, 'every move is in one column');
  assert.match(fine[1].detail, /took 0.1 to 0.2 seconds$/);
  assert.match(bullet.points[0], /^15% of your moves were premoves$/);
  assert.match(bullet.board.scene.columns[0].detail, /premoves \(0\.1 s or less/);
  const mixed = deckFor(season());
  assert.equal(mixed.board.scene.columns[0].label, '0–1s');
  assert.equal(mixed.board.scene.floor, true, 'every move-time chart stands on the bottom edge');
  assert.equal(mixed.fineBoard.scene.floor, true);
  assert.deepEqual(mixed.fineBoard.scene.columns.map(c => c.label).slice(0, 12), ['0s', '1s', '2s', '3s', '4s', '5s', '6s', '7s', '8s', '9s', '10s', '15s']);
  assert.equal(mixed.fineBoard.scene.columns.at(-1).label, '120s+');
  // Rows saved before the fine histogram existed show no switch until they are replayed.
  assert.equal(deckFor(season().map(r => ({...r, tg: undefined}))).fineBoard, null);
  assert.match(mixed.points[2], /30 seconds or more/);
});

test('smoothed accuracy line weighs each day by its games and keeps every point', async () => {
  const {smoothed} = await import('../lib/profile/designs/board-viz.js');
  const series = Array.from({length: 60}, (_, i) => ({t: i * 86400, r: i % 2 ? 90 : 70, n: i % 2 ? 3 : 1}));
  const line = smoothed(series);
  assert.equal(line.length, 60); assert.deepEqual(line.map(p => p.t), series.map(p => p.t));
  assert.ok(line.slice(5, -5).every(p => p.r > 83 && p.r < 87), 'busy days count for more');
});

test('insights: mates in one played and missed, and their chapter', () => {
  const row = (id, m1, m1Missed, t = 100) => ({id, t, m1, m1Missed, m1Ply: m1Missed ? 21 : 0, m1Fen: m1Missed ? 'fen-' + id : '', res: 'w', opp: 'X', me: 'w', fenEnd: '8/8/8/8/8/8/8/8 w - - 0 1', n: 40});
  assert.equal(mateInOne([{id: 'old', t: 1}]), null, 'rows from before the count say nothing');
  const M = mateInOne([row('a', 2, 1, 50), row('b', 1, 0), row('c', 0, 0), row('d', 3, 2, 300), {id: 'old', t: 5}]);
  assert.deepEqual([M.games, M.chances, M.found, M.missed, M.withChance, M.withMiss], [4, 6, 3, 3, 3, 2]);
  assert.equal(M.lastMiss.id, 'd'); assert.equal(M.lastMiss.ply, 21);
  assert.deepEqual(M.misses.map(m => [m.id, m.fen]), [['d', 'fen-d'], ['a', 'fen-a']], 'the puzzles: each missed position, newest first');
  assert.deepEqual(mateInOneShares(M), {found: 50, missed: 50});
  assert.deepEqual(mateInOneShares({chances: 3, found: 2, missed: 1}), {found: 67, missed: 33});
  assert.deepEqual(mateInOneShares({chances: 8, found: 5, missed: 3}), {found: 62, missed: 38}, 'whole percents that add up to 100');
  const rows = season().map((r, i) => ({...r, m1: i % 10 === 0 ? 2 : 0, m1Missed: i % 30 === 0 ? 1 : 0, m1Fen: i % 30 === 0 ? '6k1/5ppp/8/8/8/8/1Q3PPP/6K1 w - - 0 30' : ''}));
  const report = buildReport(rows, buildInsights(rows), {account: 'me', site: 'chesscom', period: 'year', periodLabel: 'Past 12 months'});
  const deck = buildDeck(report, {account: 'me'});
  const slide = deck.find(s => s.id === 'mate1');
  assert.ok(slide, 'the chapter is there');
  assert.equal(deck.indexOf(slide), deck.findIndex(s => s.id === 'share') - 1, 'just before the recap');
  assert.equal(slide.board.kind, 'puzzle', 'the board holds the missed mates to solve');
  assert.equal(slide.board.puzzles.length, report.mateInOne.misses.length); assert.ok(slide.board.puzzles.length > 0);
  assert.equal(slide.evidence, undefined, 'no game link: the board is for solving');
  assert.match(slide.lead, /You found it \d+% of the time\. Now find the ones you missed, right here on the board\.$/);
  assert.deepEqual(slide.bullets, [], 'the lead says it all');
  assert.deepEqual(slide.stats.map(s => s.label).slice(0, 2), ['Mates found', 'Mates missed']);
  assert.equal(buildDeck(buildReport(season(), buildInsights(season()), {account: 'me'}), {account: 'me'}).some(s => s.id === 'mate1'), false, 'no chapter without the count');
});

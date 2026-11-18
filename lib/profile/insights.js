// Player profile — aggregations over feature rows. Pure functions; every figure
// carries its sample size and, where a game is involved, enough evidence (id, url,
// FEN) for the board to show it and the user to open it. Small samples return
// null rather than a confident-looking number.
import {decodeHeat, SQUARES, THINK_BUCKETS} from './features.js';

export const MIN_GAMES = 10;
const pct = (part, whole) => whole ? Math.round(1000 * part / whole) / 10 : null;
const wdl = () => ({games: 0, w: 0, d: 0, l: 0});
const tally = (acc, row) => { acc.games++; acc[row.res]++; return acc; };
const finish = acc => ({...acc, winRate: pct(acc.w, acc.games), score: pct(acc.w + acc.d / 2, acc.games)});
const evidence = row => row ? {id: row.id, url: row.url, site: row.site || null, t: row.t, opp: row.opp, res: row.res, term: row.term, cls: row.cls, fen: row.fenEnd, me: row.me, n: row.n} : null;
const humans = rows => rows.filter(row => !row.bot);
export const CLASS_ORDER = ['bullet', 'blitz', 'rapid', 'classical', 'daily', 'unknown'];
export const classLabel = cls => ({bullet: 'Bullet', blitz: 'Blitz', rapid: 'Rapid', classical: 'Classical', daily: 'Daily', unknown: 'Other'})[cls] || cls;

export function totals(rows) {
  const all = finish(rows.reduce(tally, wdl()));
  const byClass = {}, byColor = {w: wdl(), b: wdl()};
  let seconds = 0, timed = 0, moves = 0, caps = 0, checks = 0, longest = null, quickest = null;
  for (const row of rows) {
    (byClass[row.cls] ||= wdl()); tally(byClass[row.cls], row); tally(byColor[row.me], row);
    if (row.dur) { seconds += row.dur; timed++; }
    moves += row.myMoves; caps += row.caps; checks += row.checks;
    if (!longest || row.n > longest.n) longest = row;
    if (row.res === 'w' && row.n >= 4 && (!quickest || row.n < quickest.n)) quickest = row;
  }
  for (const cls of Object.keys(byClass)) byClass[cls] = finish(byClass[cls]);
  return {...all, hours: seconds / 3600, timedGames: timed, moves, captures: caps, checks,
    byClass, byColor: {w: finish(byColor.w), b: finish(byColor.b)}, rated: rows.filter(r => r.rated).length,
    longest: longest ? {...evidence(longest), moves: Math.ceil(longest.n / 2)} : null,
    quickestWin: quickest ? {...evidence(quickest), moves: Math.ceil(quickest.n / 2)} : null};
}

function downsample(points, max = 60) {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1), out = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}
export function ratings(rows) {
  const out = {};
  const monthKey = t => { const d = new Date(t * 1000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
  for (const cls of CLASS_ORDER) {
    const series = rows.filter(r => r.cls === cls && r.rated && r.myRating && r.t).sort((a, b) => a.t - b.t);
    if (series.length < 5) continue;
    const peak = series.reduce((best, r) => r.myRating > best.myRating ? r : best), low = series.reduce((worst, r) => r.myRating < worst.myRating ? r : worst);
    const months = new Map();
    for (const r of series) { const k = monthKey(r.t); if (!months.has(k)) months.set(k, {first: r.myRating, last: r.myRating, games: 0}); const m = months.get(k); m.last = r.myRating; m.games++; }
    let bestMonth = null;
    for (const [month, m] of months) { const delta = m.last - m.first; if (m.games >= 5 && (!bestMonth || delta > bestMonth.delta)) bestMonth = {month, delta, games: m.games}; }
    out[cls] = {games: series.length, start: series[0].myRating, end: series.at(-1).myRating, change: series.at(-1).myRating - series[0].myRating,
      peak: {rating: peak.myRating, ...evidence(peak)}, low: {rating: low.myRating, t: low.t}, bestMonth,
      series: downsample(series.map(r => ({t: r.t, r: r.myRating})))};
  }
  return out;
}

export function openings(rows, {min = 6} = {}) {
  const result = {};
  for (const color of ['w', 'b']) {
    const groups = new Map();
    for (const row of rows) {
      if (row.me !== color) continue;
      const name = (row.op || '').trim() || (row.eco ? 'ECO ' + row.eco : 'Unknown opening');
      if (!groups.has(name)) groups.set(name, {name, eco: row.eco, ...wdl(), lines: new Map()});
      const g = groups.get(name); tally(g, row);
      if (row.line) g.lines.set(row.line, (g.lines.get(row.line) || 0) + 1);
    }
    const list = [...groups.values()].map(g => {
      const line = [...g.lines.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      const {lines: _lines, ...rest} = g;
      return {...finish(rest), line};
    }).sort((a, b) => b.games - a.games);
    const eligible = list.filter(o => o.games >= min && !/^Unknown/.test(o.name));
    // `all`: every named opening with a few games, for the most-played / best / worst views.
    result[color] = {top: list.filter(o => !/^Unknown/.test(o.name)).slice(0, 5), total: list.length,
      all: list.filter(o => o.games >= 3 && !/^Unknown/.test(o.name)).slice(0, 40),
      best: eligible.length ? eligible.reduce((a, b) => b.score > a.score ? b : a) : null,
      worst: eligible.length > 1 ? eligible.reduce((a, b) => b.score < a.score ? b : a) : null};
  }
  // First-move habits: your first move as White, and your reply to 1.e4 / 1.d4 as Black.
  const count = list => { const m = new Map(); for (const v of list) if (v) m.set(v, (m.get(v) || 0) + 1); const top = [...m.entries()].sort((a, b) => b[1] - a[1])[0]; return top ? {move: top[0], count: top[1], total: list.length, share: pct(top[1], list.length)} : null; };
  const white = count(rows.filter(r => r.me === 'w').map(r => r.first.split(' ')[0]));
  const black = count(rows.filter(r => r.me === 'b').map(r => r.first.split(' ')[0]));
  const vsE4 = count(rows.filter(r => r.me === 'b' && r.line.startsWith('e4 ')).map(r => r.line.split(' ')[1]));
  const vsD4 = count(rows.filter(r => r.me === 'b' && r.line.startsWith('d4 ')).map(r => r.line.split(' ')[1]));
  return {...result, firstMoves: {white, black, vsE4, vsD4}};
}

export function opponents(rows) {
  const people = humans(rows), groups = new Map();
  for (const row of people) {
    const key = row.opp.toLowerCase();
    if (!groups.has(key)) groups.set(key, {name: row.opp, ...wdl(), byClass: {}, ratingSum: 0, ratingN: 0, last: null, games_: []});
    const g = groups.get(key); tally(g, row); (g.byClass[row.cls] ||= wdl()); tally(g.byClass[row.cls], row);
    if (row.oppRating) { g.ratingSum += row.oppRating; g.ratingN++; }
    if (!g.last || row.t > g.last.t) g.last = row;
    g.games_.push(row);
  }
  const list = [...groups.values()].map(g => {
    const decisive = g.games_.filter(r => r.res !== 'd').sort((a, b) => b.t - a.t)[0] || g.last;
    const {games_, ratingSum, ratingN, last, ...rest} = g;
    const byClass = Object.fromEntries(Object.entries(rest.byClass).map(([k, v]) => [k, finish(v)]));
    return {...finish(rest), byClass, rating: ratingN ? Math.round(ratingSum / ratingN) : null, last: evidence(last), decisive: evidence(decisive)};
  }).sort((a, b) => b.games - a.games || b.l - a.l);
  const rival = list.find(o => o.games >= 3) || null;
  const nemesis = list.filter(o => o.l >= 3 && o.name !== rival?.name).sort((a, b) => b.l - a.l || a.w - b.w)[0] || null;
  const victim = list.filter(o => o.w >= 3 && o.name !== rival?.name && o.name !== nemesis?.name).sort((a, b) => b.w - a.w || a.l - b.l)[0] || null;
  const ratedWins = people.filter(r => r.res === 'w' && r.rated && r.oppRating);
  const strongest = ratedWins.length ? ratedWins.reduce((a, b) => b.oppRating > a.oppRating ? b : a) : null;
  const rated = people.filter(r => r.oppRating);
  // Upsets: wins against opponents rated at least 100 points higher.
  const upsets = people.filter(r => r.res === 'w' && r.oppRating && r.myRating && r.oppRating - r.myRating >= 100).length;
  // Rematches: another game against the same opponent within fifteen minutes of a loss.
  const sorted = [...people].sort((a, b) => a.t - b.t);
  const revenge = wdl();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], row = sorted[i];
    if (prev.res === 'l' && prev.opp.toLowerCase() === row.opp.toLowerCase() && row.t - prev.t <= 900 + (row.dur || 0)) tally(revenge, row);
  }
  return {distinct: list.length, rival, nemesis, victim, averageRating: rated.length ? Math.round(rated.reduce((s, r) => s + r.oppRating, 0) / rated.length) : null,
    strongestBeaten: strongest ? {rating: strongest.oppRating, myRating: strongest.myRating, ...evidence(strongest)} : null, upsets,
    revenge: revenge.games ? finish(revenge) : null, top: list.slice(0, 5)};
}

const localDay = t => { const d = new Date(t * 1000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export function streaks(rows) {
  const sorted = [...rows].filter(r => r.t).sort((a, b) => a.t - b.t);
  const best = {win: null, unbeaten: null, loss: null};
  let run = {win: [], unbeaten: [], loss: []};
  const keep = key => { if (!best[key] || run[key].length > best[key].length) best[key] = {length: run[key].length, from: run[key][0].t, to: run[key].at(-1).t, first: evidence(run[key][0]), last: evidence(run[key].at(-1))}; };
  for (const row of sorted) {
    if (row.res === 'w') run.win.push(row); else { if (run.win.length) keep('win'); run.win = []; }
    if (row.res !== 'l') run.unbeaten.push(row); else { if (run.unbeaten.length) keep('unbeaten'); run.unbeaten = []; }
    if (row.res === 'l') run.loss.push(row); else { if (run.loss.length) keep('loss'); run.loss = []; }
  }
  for (const key of Object.keys(run)) if (run[key].length) keep(key);
  const days = new Map();
  for (const row of sorted) { const k = localDay(row.t); if (!days.has(k)) days.set(k, {date: k, ...wdl()}); tally(days.get(k), row); }
  const dayList = [...days.values()];
  const busiest = dayList.length ? dayList.reduce((a, b) => b.games > a.games ? b : a) : null;
  const bestDay = dayList.filter(d => d.games >= 3).sort((a, b) => (b.w - b.l) - (a.w - a.l) || b.games - a.games)[0] || null;
  return {...best, busiestDay: busiest ? finish(busiest) : null, bestDay: bestDay ? finish(bestDay) : null, activeDays: dayList.length};
}

export const BANDS = ['00–03', '03–06', '06–09', '09–12', '12–15', '15–18', '18–21', '21–24'];
/** Four-hour blocks for the habits chart on the board. */
export const BANDS6 = ['00–04', '04–08', '08–12', '12–16', '16–20', '20–24'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function habits(rows) {
  const matrix = Array.from({length: 7}, () => Array.from({length: 8}, () => wdl()));
  const matrix6 = Array.from({length: 7}, () => Array.from({length: 6}, () => wdl()));
  const hours = Array.from({length: 24}, wdl), weekdays = Array.from({length: 7}, wdl);
  const night = wdl(), day = wdl(), evening = wdl(), morning = wdl();
  for (const row of rows) {
    if (!row.t) continue;
    const d = new Date(row.t * 1000), h = d.getHours(), w = d.getDay();
    tally(matrix[w][Math.floor(h / 3)], row); tally(matrix6[w][Math.floor(h / 4)], row); tally(hours[h], row); tally(weekdays[w], row);
    if (h >= 23 || h < 5) tally(night, row); else if (h < 12) tally(morning, row); else if (h < 18) tally(day, row); else tally(evening, row);
  }
  const bands = BANDS.map((label, i) => { const acc = wdl(); for (let w = 0; w < 7; w++) { const cell = matrix[w][i]; acc.games += cell.games; acc.w += cell.w; acc.d += cell.d; acc.l += cell.l; } return {label, ...finish(acc)}; });
  const bestBand = bands.filter(b => b.games >= 8).sort((a, b) => b.score - a.score)[0] || null;
  const worstBand = bands.filter(b => b.games >= 8).sort((a, b) => a.score - b.score)[0] || null;
  const busiestWeekday = weekdays.map((acc, i) => ({day: WEEKDAYS[i], ...finish(acc)})).sort((a, b) => b.games - a.games)[0] || null;
  // Sessions: consecutive games with at most twenty minutes between them.
  const sorted = [...rows].filter(r => r.t).sort((a, b) => a.t - b.t);
  let longest = null, session = null;
  for (const row of sorted) {
    const start = row.t - (row.dur || 0);
    if (session && start - session.end <= 1200) { session.end = row.t; session.games++; session[row.res]++; }
    else session = {start, end: row.t, games: 1, w: 0, d: 0, l: 0, date: localDay(row.t), [row.res]: 1};
    if (!longest || session.games > longest.games) longest = session;
  }
  // Tilt check: the next game within two hours of a result.
  const afterLoss = wdl(), afterWin = wdl();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], row = sorted[i];
    if (row.t - prev.t > 7200) continue;
    if (prev.res === 'l') tally(afterLoss, row); else if (prev.res === 'w') tally(afterWin, row);
  }
  return {matrix: matrix.map(r => r.map(c => ({g: c.games, w: c.w}))), matrix6: matrix6.map(r => r.map(c => ({g: c.games, w: c.w, d: c.d}))), bands, bestBand, worstBand, busiestWeekday,
    night: finish(night), morning: finish(morning), day: finish(day), evening: finish(evening),
    longestSession: longest ? {...finish(longest), minutes: Math.round((longest.end - longest.start) / 60)} : null,
    afterLoss: finish(afterLoss), afterWin: finish(afterWin), activeDays: new Set(sorted.map(r => localDay(r.t))).size};
}

export const TERM_LABELS = {mate: 'checkmate', resign: 'resignation', time: 'time', abandon: 'abandonment', agree: 'agreement',
  repetition: 'repetition', stalemate: 'stalemate', insufficient: 'insufficient material', fifty: 'the fifty-move rule', other: 'other'};
export const PIECE_NAMES = {q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn', k: 'king'};
export const PATTERN_LABELS = {'back-rank': 'back-rank mate', smothered: 'smothered mate', ladder: 'ladder mate', 'queen-kiss': 'queen-and-king mate', 'rook-knight': 'rook-and-knight mate', discovered: 'discovered-check mate', other: 'mate'};
export function terminations(rows) {
  const by = res => { const m = {}; for (const r of rows) if (r.res === res) m[r.term] = (m[r.term] || 0) + 1; return m; };
  const mates = rows.filter(r => r.mateBy), byPiece = {}, patterns = {};
  for (const r of mates) { byPiece[r.mateBy] = (byPiece[r.mateBy] || 0) + 1; patterns[r.matePattern] = (patterns[r.matePattern] || 0) + 1; }
  const top = m => Object.entries(m).sort((a, b) => b[1] - a[1])[0] || null;
  const lastMate = mates.sort((a, b) => b.t - a.t)[0] || null;
  const named = mates.filter(r => r.matePattern && r.matePattern !== 'other').sort((a, b) => b.t - a.t)[0] || null;
  return {wins: by('w'), losses: by('l'), draws: by('d'), mates: mates.length, matedCount: rows.filter(r => r.matedBy).length,
    favouritePiece: top(byPiece), favouritePattern: top(patterns), lastMate: lastMate ? {...evidence(lastMate), piece: lastMate.mateBy, pattern: lastMate.matePattern} : null,
    patternGame: named ? {...evidence(named), piece: named.mateBy, pattern: named.matePattern} : null,
    flagWins: rows.filter(r => r.res === 'w' && r.term === 'time').length, flagLosses: rows.filter(r => r.res === 'l' && r.term === 'time').length};
}

export function clock(rows) {
  let thinkSum = 0, thinkN = 0, snap = 0, aheadSum = 0, aheadN = 0, trouble = 0, clocked = 0, longest = null;
  const buckets = new Array(THINK_BUCKETS.length + 1).fill(0);
  for (const r of rows) {
    if (r.thinkN) { thinkSum += r.think * r.thinkN; thinkN += r.thinkN; snap += r.snap; clocked++; if (r.trouble) trouble++; }
    if (Array.isArray(r.tb)) r.tb.forEach((n, i) => { buckets[i] += n || 0; });
    if (r.ahead != null) { aheadSum += r.ahead; aheadN++; }
    if (r.longThink != null && (!longest || r.longThink > longest.longThink)) longest = r;
  }
  // Move-time distribution: the share of moves made within each limit (cumulative).
  const bucketed = buckets.reduce((a, b) => a + b, 0);
  let running = 0;
  const within = bucketed >= 50 ? THINK_BUCKETS.map((limit, i) => { running += buckets[i]; return {limit, share: pct(running, bucketed)}; }) : null;
  return {games: clocked, averageThink: thinkN ? thinkSum / thinkN : null, snapShare: thinkN ? pct(snap, thinkN) : null, decisions: thinkN,
    buckets: bucketed >= 50 ? buckets.map(n => pct(n, bucketed)) : null, within,
    aheadShare: aheadN ? Math.round(100 * aheadSum / aheadN) : null, troubleShare: clocked ? pct(trouble, clocked) : null,
    longestThink: longest ? {seconds: longest.longThink, ply: longest.longPly, ...evidence(longest)} : null};
}

export function material(rows) {
  // A comeback only counts when it ended on the board: checkmate or resignation, never the clock or a disconnect.
  const comebacks = rows.filter(r => r.res === 'w' && r.matMin <= -3 && (r.term === 'mate' || r.term === 'resign')), chokes = rows.filter(r => r.res !== 'w' && r.matMax >= 3);
  const ahead = rows.filter(r => r.matMax >= 3), behind = rows.filter(r => r.matMin <= -3);
  const pick = (list, key, dir) => list.length ? list.reduce((a, b) => dir * (b[key] - a[key]) > 0 ? b : a) : null;
  const comeback = pick(comebacks, 'matMin', -1), choke = pick(chokes, 'matMax', 1), swingy = pick(rows, 'swings', 1);
  const detail = r => r ? {...evidence(r), deficit: r.matMin, surplus: r.matMax, lowPly: r.lowPly, highPly: r.highPly, fenLow: r.fenLow, fenHigh: r.fenHigh} : null;
  return {comebacks: comebacks.length, chokes: chokes.length, comeback: detail(comeback), choke: detail(choke),
    conversion: ahead.length >= 5 ? pct(ahead.filter(r => r.res === 'w').length, ahead.length) : null, aheadGames: ahead.length,
    resilience: behind.length >= 5 ? pct(behind.filter(r => r.res !== 'l').length, behind.length) : null, behindGames: behind.length,
    sacrificeWins: pct(rows.filter(r => r.res === 'w' && r.matMin <= -2).length, rows.filter(r => r.res === 'w').length),
    swingiest: swingy && swingy.swings >= 2 ? {...evidence(swingy), swings: swingy.swings} : null};
}

// Baselines are deliberately round assumptions about typical club play, documented in
// docs/PLAYER_PROFILE.md. Distinctiveness compares the player's rate with them.
export const SIGNATURES = [
  {id: 'knights4', label: 'Both knights out by move 4', baseline: 0.35, rate: rows => rows.filter(r => r.knights4).length / rows.length, high: 'You bring both knights out by move 4 in {rate} of your games.', low: 'You hold your knights back: both are out by move 4 in only {rate} of games.'},
  {id: 'castleEarly', label: 'Castled by move 8', baseline: 0.45, rate: rows => rows.filter(r => r.castle && r.castle <= 8).length / rows.length, high: 'You castle by move 8 in {rate} of games.', low: 'You leave castling late: by move 8 in only {rate} of games.'},
  {id: 'noCastle', label: 'Never castles', baseline: 0.2, rate: rows => rows.filter(r => !r.castle && r.n >= 30).length / Math.max(1, rows.filter(r => r.n >= 30).length), high: 'Your king stays in the middle: no castling in {rate} of games that last 15 moves.', low: null},
  {id: 'castleLong', label: 'Castles queenside', baseline: 0.12, rate: rows => rows.filter(r => r.castleSide === 'q').length / Math.max(1, rows.filter(r => r.castle).length), high: 'You castle queenside in {rate} of the games you castle in.', low: null},
  {id: 'opposite', label: 'Opposite-side castling', baseline: 0.15, rate: rows => rows.filter(r => r.castleSide && r.oppCastleSide && r.castleSide !== r.oppCastleSide).length / Math.max(1, rows.filter(r => r.castleSide && r.oppCastleSide).length), high: 'Opposite-side castling in {rate} of games where both sides castle.', low: null},
  {id: 'fian', label: 'Fianchetto', baseline: 0.25, rate: rows => rows.filter(r => r.fian).length / rows.length, high: 'A fianchettoed bishop appears in {rate} of your games.', low: null},
  {id: 'firstMove', label: 'Same first move as White', baseline: 0.6, rate: rows => { const firsts = rows.filter(r => r.me === 'w' && r.first).map(r => r.first.split(' ')[0]); const m = new Map(); for (const f of firsts) m.set(f, (m.get(f) || 0) + 1); return firsts.length >= 10 ? Math.max(...m.values()) / firsts.length : NaN; }, high: 'You open with the same first move in {rate} of your White games.', low: 'You mix it up: your favourite first move appears in only {rate} of your White games.'},
  {id: 'qtrade', label: 'Early queen trade', baseline: 0.15, rate: rows => rows.filter(r => r.qtrade && r.qtrade <= 20).length / rows.length, high: 'Queens come off by move 20 in {rate} of your games.', low: 'Queens stay on: they are traded by move 20 in just {rate} of your games.'},
  {id: 'qEarly', label: 'Early queen sortie', baseline: 0.12, rate: rows => rows.filter(r => r.qEarly).length / rows.length, high: 'Your queen is out before move 6 in {rate} of games.', low: null},
  {id: 'gambit', label: 'Opening pawn investment', baseline: 0.1, rate: rows => rows.filter(r => r.gambit).length / rows.length, high: 'You are a pawn down after move 10 in {rate} of games.', low: null},
  {id: 'storm', label: 'Kingside pawn storm', baseline: 0.12, rate: rows => rows.filter(r => r.storm).length / Math.max(1, rows.filter(r => r.oppCastleSide === 'k').length), high: 'When your opponent castles short you push the g- and h-pawns in {rate} of games.', low: null},
  {id: 'pair25', label: 'Keeps the bishop pair', baseline: 0.3, rate: rows => rows.filter(r => r.pair25).length / Math.max(1, rows.filter(r => r.n >= 50).length), high: 'You still have both bishops at move 25 in {rate} of your longer games.', low: null},
  {id: 'endgame', label: 'Reaches an endgame', baseline: 0.3, rate: rows => rows.filter(r => r.endgame).length / rows.length, high: '{rate} of your games reach an endgame.', low: 'Only {rate} of your games reach an endgame.'},
  {id: 'length', label: 'Moves per game', baseline: 38, rate: rows => rows.reduce((s, r) => s + r.n, 0) / rows.length / 2, high: 'Your games last {rate} moves on average.', low: 'Your games are short: {rate} moves on average.', number: true},
  {id: 'shortWins', label: 'Wins inside 25 moves', baseline: 0.25, rate: rows => { const wins = rows.filter(r => r.res === 'w'); return wins.length >= 10 ? wins.filter(r => r.n <= 50).length / wins.length : NaN; }, high: '{rate} of your wins are over inside 25 moves.', low: 'Your wins take time: only {rate} finish inside 25 moves.'},
  {id: 'captures', label: 'Captures per game', baseline: 7, rate: rows => rows.reduce((s, r) => s + r.caps, 0) / rows.length, high: 'You capture {rate} pieces per game.', low: 'You capture only {rate} pieces per game.', number: true},
  {id: 'checks', label: 'Checks per game', baseline: 2.2, rate: rows => rows.reduce((s, r) => s + r.checks, 0) / rows.length, high: 'You give {rate} checks per game.', low: null, number: true},
  {id: 'draws', label: 'Draw rate', baseline: 0.06, rate: rows => rows.filter(r => r.res === 'd').length / rows.length, high: '{rate} of your games end in a draw.', low: 'Draws are rare: {rate} of your games.'},
  {id: 'fightOn', label: 'Plays on in lost games', baseline: 0.5, rate: rows => { const losses = rows.filter(r => r.res === 'l'); return losses.length >= 10 ? losses.filter(r => r.term !== 'resign').length / losses.length : NaN; }, high: 'You rarely resign: {rate} of your losses go to mate or the clock.', low: 'You resign when it is over: only {rate} of your losses go to mate or the clock.'},
  {id: 'promo', label: 'Promotes a pawn', baseline: 0.1, rate: rows => rows.filter(r => r.promo).length / rows.length, high: 'You promote a pawn in {rate} of games.', low: null},
  {id: 'ep', label: 'En passant', baseline: 0.05, rate: rows => rows.reduce((s, r) => s + r.ep, 0) / rows.length, high: 'You capture en passant in {rate} of games.', low: null},
  {id: 'under', label: 'Underpromotion', baseline: 0.005, rate: rows => rows.reduce((s, r) => s + r.under, 0) / rows.length, high: 'You underpromoted in {rate} of games.', low: null},
];
export function signature(rows) {
  if (rows.length < MIN_GAMES) return {heat: decodeHeat(''), habits: [], favouriteSquares: []};
  const heat = new Array(64).fill(0);
  for (const r of rows) decodeHeat(r.heat).forEach((v, i) => { heat[i] += v; });
  const total = heat.reduce((a, b) => a + b, 0);
  const favouriteSquares = heat.map((count, i) => ({square: SQUARES[i], count, share: pct(count, total)})).sort((a, b) => b.count - a.count).slice(0, 3);
  const all = SIGNATURES.map(sig => {
    const rate = sig.rate(rows);
    if (!Number.isFinite(rate)) return null;
    const ratio = (rate + 0.01) / (sig.baseline + 0.01);
    const score = Math.abs(Math.log(ratio)) * Math.min(1, rows.length / 60);
    const direction = ratio >= 1 ? 'high' : 'low';
    const template = sig[direction];
    const shown = sig.number ? rate.toFixed(1) : Math.round(100 * rate) + '%';
    return {id: sig.id, label: sig.label, rate, baseline: sig.baseline, number: !!sig.number, score, direction, text: template ? template.replace('{rate}', shown) : null};
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  const habits = all.filter(h => h.text);
  // Up to six signatures (at least three when the data has them); all keeps every metric for the you-versus-typical list.
  return {heat, favouriteSquares, habits: habits.filter((h, i) => i < 3 || h.score >= 0.25).slice(0, 6), all};
}

/** Engine-sample figures: trend, best game, rival accuracy, verified comeback and choke. */
export function engineInsights(rows, engine, {material: mat, opponents: opp, library = null} = {}) {
  const sampled = rows.filter(r => engine?.[r.id]?.acc != null).sort((a, b) => a.t - b.t);
  // Reviewed library games of the same player add accuracy points the engine check does not need to repeat.
  const extra = (library || []).filter(p => p && Number.isFinite(p.acc) && p.t && !engine?.[p.id]);
  if (!sampled.length && !extra.length) return null;
  const acc = r => r.libraryAcc ?? engine[r.id].acc;
  const points = [...sampled, ...extra.map(p => ({id: p.id, t: p.t, libraryAcc: p.acc}))].sort((a, b) => a.t - b.t);
  const mean = list => list.length ? Math.round(10 * list.reduce((s, r) => s + acc(r), 0) / list.length) / 10 : null;
  const half = Math.floor(points.length / 2);
  const months = new Map();
  for (const p of points) { const d = new Date(p.t * 1000), k = d.getFullYear() * 12 + d.getMonth(); if (!months.has(k)) months.set(k, []); months.get(k).push(p); }
  const monthly = [...months.entries()].sort((a, b) => a[0] - b[0]).map(([k, list]) => ({t: Date.UTC(Math.floor(k / 12), k % 12, 15) / 1000, acc: mean(list), games: list.length}));
  const byClass = {};
  for (const r of sampled) (byClass[r.cls] ||= []).push(r);
  const best = sampled.filter(r => r.myMoves >= 20).sort((a, b) => acc(b) - acc(a))[0] || null;
  const rival = opp?.rival ? mean(sampled.filter(r => r.opp.toLowerCase() === opp.rival.name.toLowerCase())) : null;
  const entry = id => engine[id] || null;
  return {games: points.length, engineGames: sampled.length, libraryGames: extra.length, average: mean(points), monthly,
    trend: points.length >= 20 ? {early: mean(points.slice(0, half)), late: mean(points.slice(half)), earlyGames: half, lateGames: points.length - half,
      from: points[0].t, to: points.at(-1).t} : null,
    byClass: Object.fromEntries(Object.entries(byClass).map(([k, v]) => [k, {accuracy: mean(v), games: v.length}])),
    best: best ? {...evidence(best), accuracy: acc(best), moves: best.myMoves} : null,
    rival: rival != null ? {name: opp.rival.name, accuracy: rival, games: sampled.filter(r => r.opp.toLowerCase() === opp.rival.name.toLowerCase()).length} : null,
    comeback: mat?.comeback && entry(mat.comeback.id) ? {...mat.comeback, minWin: entry(mat.comeback.id).minWin, minPly: entry(mat.comeback.id).minPly, fenMin: entry(mat.comeback.id).fenMin} : null,
    choke: mat?.choke && entry(mat.choke.id) ? {...mat.choke, maxWin: entry(mat.choke.id).maxWin, maxPly: entry(mat.choke.id).maxPly, fenMax: entry(mat.choke.id).fenMax} : null,
    blunderRate: (() => { const withDrops = sampled.filter(r => engine[r.id].blunders != null); const moves = withDrops.reduce((s, r) => s + r.myMoves, 0); return moves ? Math.round(1000 * withDrops.reduce((s, r) => s + engine[r.id].blunders, 0) / moves) / 10 : null; })()};
}

/** Everything the deck needs, from the period's rows plus optional engine results. */
export function buildInsights(rows, {engine = null, library = null, includeBots = false} = {}) {
  const people = includeBots ? rows : humans(rows);
  const mat = material(people), opp = opponents(people);
  return {games: rows.length, humanGames: people.length, botGames: rows.length - people.length,
    totals: totals(people), ratings: ratings(people), openings: openings(people), opponents: opp, streaks: streaks(people),
    habits: habits(people), terminations: terminations(people), clock: clock(people), material: mat, signature: signature(people),
    engine: engineInsights(people, engine, {material: mat, opponents: opp, library}), library: null,
    span: people.length ? {from: Math.min(...people.map(r => r.t || Infinity)), to: Math.max(...people.map(r => r.t || 0))} : null};
}

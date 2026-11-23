// Player profile — the slide deck. Turns insights into slides: headline, lead,
// a few stats, bullets, an evidence link and a board visualization spec. Copy is
// playful but every number is the player's own; negatives are framed kindly.
// Slides whose sample is too small are left out rather than padded.
import {classLabel, byClassOrder, TERM_LABELS, PIECE_NAMES, PATTERN_LABELS, WEEKDAYS, MIN_GAMES} from './insights.js';
import {classify} from './archetypes.js';
import {PREMOVE, GRAIN_EDGES, THINK_BUCKETS, BULLET_BUCKETS} from './features.js';

const tenths = Array.from({length: 20}, (_, i) => (i + 1) / 10);
/** Interval bounds (seconds) of the fine move-time columns; bullet starts with the premove interval [0, PREMOVE]. */
export const FINE_BULLET = [0, ...tenths, 3, 5, 10, Infinity];
export const FINE_CLOCK = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 50, 60, 90, 120, Infinity];
/** Seconds of GRAIN_EDGES bucket i: bucket 0 is the premove interval, the last runs on forever. */
const grainRange = i => [i ? GRAIN_EDGES[i - 1] : 0, GRAIN_EDGES[i] ?? Infinity];

/**
 * The clock chapter's fine chart: the per-move histogram summed into narrow
 * intervals (tenths of a second for bullet, seconds and then wider steps for the
 * rest). Each column names the usual column it splits from (`group`), so the
 * board can split the chart open and close it again.
 */
export function fineClockBoard(grain, bullet) {
  const bounds = bullet ? FINE_BULLET : FINE_CLOCK, coarse = [0, ...(bullet ? BULLET_BUCKETS : THINK_BUCKETS), Infinity];
  const counts = bounds.slice(0, -1).map(() => 0);
  grain.counts.forEach((n, i) => {
    const [low, high] = grainRange(i), j = bounds.findIndex((b, k) => k < bounds.length - 1 && low >= b && high <= bounds[k + 1]);
    if (j >= 0) counts[j] += n || 0;
  });
  const s = n => String(n);
  const columns = counts.map((n, j) => {
    const from = bounds[j], to = bounds[j + 1], share = 100 * n / grain.total;
    const premove = bullet && j === 0;
    const label = premove ? 'Pre' : to === Infinity ? `${s(from)}s+` : `${s(from)}s`;
    const detail = premove ? `${fmt.pct(share)} of your moves were premoves (${PREMOVE} s or less on the clock)`
      : to === Infinity ? `${fmt.pct(share)} of your moves took ${fmt.plural(from, 'second')} or more` : `${fmt.pct(share)} of your moves took ${s(from)} to ${s(to)} seconds`;
    return {value: share, display: share >= 1 || !n ? Math.round(share) + '%' : '<1%', label, color: 'var(--pv-c, var(--accent))', detail, group: coarse.findLastIndex(c => c <= from)};
  });
  return {kind: 'blank', me: 'w', caption: '', scene: {type: 'columns', unit: '%', plainLabels: true, fine: true, floor: true, columns}};
}

/**
 * Greatest hits: one full-height column per opponent-rating band, losses at the
 * bottom, draws, then wins on top. A band with only a few games is drawn fainter.
 */
export function resultsByRating({bands}) {
  const share = (n, b) => b.games ? n / b.games : 0;
  const every = Math.ceil(bands.length / 8);
  const columns = bands.map((b, i) => ({from: b.from, games: b.games, w: share(b.w, b), d: share(b.d, b), l: share(b.l, b),
    label: i % every === 0 ? String(b.from) : '',
    detail: b.games ? `Opponents rated ${b.from}–${b.to}: ${fmt.plural(b.games, 'game')}. Won ${fmt.pct(100 * share(b.w, b))}, drew ${fmt.pct(100 * share(b.d, b))}, lost ${fmt.pct(100 * share(b.l, b))}.` : `Opponents rated ${b.from}–${b.to}: no games.`}));
  const legend = [[null, 'Results by opponent rating:'], ['pv-legend-good', 'Won'], ['pv-legend-draw', 'Drew'], ['pv-legend-loss', 'Lost'], ...(bands.some(b => b.games && b.games < 5) ? [['pv-legend-faint', 'Fainter: under 5 games']] : [])];
  return {kind: 'blank', me: 'w', caption: '', scene: {type: 'results', columns, legend}};
}

/**
 * Results over time against one opponent, drawn like Greatest hits: the games in
 * order, cut into up to twelve runs of consecutive games (so there are never empty
 * columns) of at least five games where there are enough, each column losses at
 * the bottom, then draws, then wins. `history` is [[time, result, time control], …]
 * sorted by time.
 */
export function resultsOverTime(history, name = 'this opponent') {
  const games = (history || []).filter(g => g?.[0]);
  if (games.length < 2) return null;
  const count = Math.min(12, Math.max(Math.min(games.length, 4), Math.floor(games.length / 5))), every = count > 8 ? 2 : 1;
  const columns = Array.from({length: count}, (_, j) => {
    const run = games.slice(Math.floor(j * games.length / count), Math.floor((j + 1) * games.length / count));
    const n = {w: 0, d: 0, l: 0}; for (const [, res] of run) if (res in n) n[res]++;
    const from = run[0][0], to = run.at(-1)[0], when = from === to || fmt.shortDate(from) === fmt.shortDate(to) ? fmt.date(from) : `${fmt.shortDate(from)} – ${fmt.date(to)}`;
    return {games: run.length, w: n.w / run.length, d: n.d / run.length, l: n.l / run.length, label: j % every === 0 ? fmt.shortDate(from) : '',
      detail: `${when}: ${fmt.plural(run.length, 'game')} against ${name}. Won ${n.w}, drew ${n.d}, lost ${n.l}.`};
  });
  const legend = [[null, 'Results over time:'], ['pv-legend-good', 'Won'], ['pv-legend-draw', 'Drew'], ['pv-legend-loss', 'Lost'], ...(columns.some(c => c.games < 5) ? [['pv-legend-faint', 'Fainter: under 5 games']] : [])];
  return {kind: 'blank', me: 'w', caption: '', scene: {type: 'results', columns, legend, label: `Results against ${name} over time, oldest on the left.`}};
}

export const fmt = {
  int: n => n == null ? '–' : Math.round(n).toLocaleString('en-US'),
  pct: n => n == null ? '–' : (Math.round(n * 10) / 10).toLocaleString('en-US', {maximumFractionDigits: 1}) + '%',
  hours: h => h == null ? '–' : h < 1 ? Math.round(h * 60) + ' min' : h < 10 ? (Math.round(h * 10) / 10) + ' h' : Math.round(h).toLocaleString('en-US') + ' h',
  /** Hours as a bare number for places already labelled "Hours" (113, 4.5). */
  hoursNum: h => h == null ? '–' : h < 10 ? String(Math.round(h * 10) / 10) : Math.round(h).toLocaleString('en-US'),
  /** Hours spelled out for running text: "22 hours", "45 minutes". */
  hoursLong: h => h == null ? '–' : h < 1 ? fmt.plural(Math.max(1, Math.round(h * 60)), 'minute') : h < 10 ? `${Math.round(h * 10) / 10} ${Math.round(h * 10) === 10 ? 'hour' : 'hours'}` : fmt.plural(Math.round(h), 'hour'),
  seconds: s => s == null ? '–' : s < 60 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s',
  date: t => t ? new Date(t * 1000).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : '',
  shortDate: t => t ? new Date(t * 1000).toLocaleDateString('en-US', {day: 'numeric', month: 'short'}) : '',
  month: key => { const [y, m] = key.split('-'); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}); },
  signed: n => n == null ? '–' : (n > 0 ? '+' : '') + Math.round(n),
  plural: (n, one, many = one + 's') => fmt.int(n) + ' ' + (Math.abs(n) === 1 ? one : many),
};
const result = res => ({w: 'won', l: 'lost', d: 'drew'})[res] || '';
const recordText = s => `${fmt.plural(s.w, 'win')}, ${fmt.plural(s.l, 'loss', 'losses')}, ${fmt.plural(s.d, 'draw')}`;
/** One sentence for a head-to-head record: "You played 26 games against X: won 8, lost 18, drew 0." */
export const rivalLine = (s, name) => `You played ${fmt.plural(s.games, 'game')} against ${name}: won ${fmt.int(s.w)}, lost ${fmt.int(s.l)}, drew ${fmt.int(s.d)}.`;
/** Replay a game from move one on the board, after a short "you versus them" intro. */
const replaySpec = (ev, account) => ev ? {kind: 'replay', id: ev.id, url: ev.url, site: ev.site || null, t: ev.t, me: ev.me, fen: ev.fen, opp: ev.opp, account, caption: ''} : {kind: 'cover'};
const gameLink = (ev, label) => ev ? {label: label || `${result(ev.res)} v. ${ev.opp}, ${fmt.shortDate(ev.t)}`, url: ev.url, id: ev.id, t: ev.t} : null;

export function buildDeck(insights, {account = '', site = 'chesscom', periodLabel = 'Past 12 months', country = null, engineStatus = 'idle', engineBudgetLabel = '', ratingClass = null} = {}) {
  const slides = [];
  const I = insights, T = I.totals;
  const few = I.humanGames < MIN_GAMES;
  const siteName = site === 'lichess' ? 'Lichess' : site === 'both' ? 'Chess.com and Lichess' : 'Chess.com';

  // 1 — Cover
  const fm = I.openings.firstMoves;
  const white = fm.white?.move || (fm.vsE4 ? 'e4' : fm.vsD4 ? 'd4' : null);
  const black = white === 'e4' ? fm.vsE4?.move : white === 'd4' ? fm.vsD4?.move : null;
  slides.push({id: 'cover', eyebrow: 'Player profile', title: account, lead: few ? `Only ${fmt.plural(I.humanGames, 'game')} in this period. Play a few more and come back.` : `${periodLabel} on ${siteName}: ${fmt.plural(T.games, 'game')}, ${fmt.hoursLong(T.hours)} at the board.`,
    points: few ? null : [`${periodLabel} on ${siteName}`, fmt.plural(T.games, 'game'), `${fmt.hoursLong(T.hours)} at the board`],
    country, stats: [], board: {kind: 'cover', white, black: black || null, caption: white ? `Your usual opening moves: 1. ${white}${black ? ` ${black}` : ''}.` : 'Your games, one board.'}});
  if (few) return slides;

  // 2 — The numbers
  slides.push({id: 'numbers', eyebrow: 'Your games in numbers', title: `${fmt.int(T.games)} games`, lead: `You won ${fmt.pct(T.winRate)} of them, with ${fmt.plural(T.d, 'draw')} along the way.`,
    stats: [{label: 'Wins', value: fmt.int(T.w), tone: 'good'}, {label: 'Draws', value: fmt.int(T.d)}, {label: 'Losses', value: fmt.int(T.l)}, {label: 'Hours played', value: fmt.hoursNum(T.hours)}, {label: 'Moves made', value: fmt.int(T.moves)}, {label: 'Pieces taken', value: fmt.int(T.captures)}, {label: 'Checks given', value: fmt.int(T.checks)}],
    bullets: [T.byColor.w.games && T.byColor.b.games ? `Win rate as White ${fmt.pct(T.byColor.w.winRate)}. Win rate as Black ${fmt.pct(T.byColor.b.winRate)}.` : null,
      T.longest ? `Longest game: ${fmt.int(T.longest.moves)} moves against ${T.longest.opp}.` : null].filter(Boolean),
    evidence: gameLink(T.longest, 'Open your longest game'), board: {kind: 'fill', total: T.games, wins: T.w, draws: T.d, caption: 'Green squares are wins, silver draws, coral losses. Partial squares show the exact proportions.'}});

  // 3 — Rating journey
  const ratingClasses = Object.entries(I.ratings).sort((a, b) => b[1].games - a[1].games);
  if (ratingClasses.length) {
    const [cls, r] = ratingClasses.find(([key]) => key === ratingClass) || ratingClasses[0];
    slides.push({id: 'rating', eyebrow: site === 'both' && I.ratingSite ? `Rating journey · ${I.ratingSite === 'lichess' ? 'Lichess' : 'Chess.com'}` : 'Rating journey', title: `${classLabel(cls)}: ${fmt.signed(r.change)}`, lead: `From ${r.start} to ${r.end}, peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`,
      ratingClass: cls, ratingChoices: byClassOrder(ratingClasses.map(([key]) => key)).map(key => ({id: key, label: classLabel(key)})),
      stats: [{label: 'Current rating', value: String(r.end)}, {label: 'Peak rating', value: String(r.peak.rating)}, {label: 'Rated games', value: fmt.int(r.games)}],
      bullets: [r.bestMonth && r.bestMonth.delta > 0 ? `Best month: ${fmt.month(r.bestMonth.month)}, ${fmt.signed(r.bestMonth.delta)} over ${r.bestMonth.games} games.` : null].filter(Boolean),
      series: {[cls]: r.series}, evidence: gameLink(r.peak, 'Open the game that set your peak'),
      board: {kind: 'fen', fen: r.peak.fen, me: r.peak.me, caption: `The final position of your peak-rating game, ${result(r.peak.res)} against ${r.peak.opp}.`}});
  }

  // 4 — Openings
  const ow = I.openings.w, ob = I.openings.b;
  if (ow.top.length || ob.top.length) {
    const fav = [...ow.top, ...ob.top].sort((a, b) => b.games - a.games)[0];
    const favColor = ow.top.includes(fav) ? 'w' : 'b';
    const pick = o => ({name: o.name, games: o.games, winRate: o.winRate, score: o.score, record: recordText(o), line: o.line || ''});
    slides.push({id: 'openings', eyebrow: 'Your openings', title: fav.name, lead: `Your most played opening: ${fmt.plural(fav.games, 'game')} as ${favColor === 'w' ? 'White' : 'Black'}, ${fmt.pct(fav.winRate)} win rate.`,
      openings: {w: ow.top.map(pick), b: ob.top.map(pick), all: [...(ow.all || ow.top).map(o => ({...pick(o), color: 'w'})), ...(ob.all || ob.top).map(o => ({...pick(o), color: 'b'}))]},
      bullets: [[ow.best, ob.best].filter(Boolean).sort((a, b) => b.score - a.score)[0] ? (() => { const best = [ow.best, ob.best].filter(Boolean).sort((a, b) => b.score - a.score)[0]; return `Your best weapon: ${best.name}, ${fmt.pct(best.winRate)} win rate over ${best.games} games.`; })() : null,
        [ow.worst, ob.worst].filter(Boolean).sort((a, b) => a.score - b.score)[0] ? (() => { const worst = [ow.worst, ob.worst].filter(Boolean).sort((a, b) => a.score - b.score)[0]; return worst.name !== fav.name || worst.winRate < 45 ? `Worth a look: ${worst.name}, ${fmt.pct(worst.winRate)} win rate over ${worst.games} games.` : null; })() : null].filter(Boolean),
      board: {kind: 'moves', moves: fav.line.split(' ').filter(Boolean), me: favColor, caption: `${fav.name}, the way you usually play it.`}});
  }

  // 5 — Historical twin
  const twin = I.twin;
  if (twin) {
    slides.push({id: 'twin', eyebrow: 'Your historical twin', title: twin.winner.name, lead: `${twin.winner.tagline}. ${twin.winner.blurb}`,
      twin: {era: twin.winner.era, reasons: twin.winner.reasons, runnerUp: twin.runnerUp.name, runnerUpTagline: twin.runnerUp.tagline},
      bullets: twin.winner.reasons, evidence: gameLink(twin.exemplar, 'Open your most ' + twin.winner.name.split(' ').at(-1) + '-like game'),
      // The board's pieces first assemble into the twin's face; the game follows on request.
      board: {portrait: twin.winner.id, name: twin.winner.name, ...(twin.famous ? {kind: 'moves', moves: twin.famous.moves, from: twin.famous.from, me: 'w', caption: twin.famous.label}
        : twin.exemplar ? {kind: 'fen', fen: twin.exemplar.fen, me: twin.exemplar.me, caption: twin.exemplar.caption} : {kind: 'cover', caption: twin.winner.tagline})}});
  }

  // 6 — Signature moves
  const sig = I.signature;
  if (sig.habits.length) {
    // A style is several signatures, not one move: each is the player's own rate against a typical club player.
    const compare = (sig.all || sig.habits).map(h => ({id: h.id, label: h.label, rate: h.rate, baseline: h.baseline, number: !!h.number, score: h.score, text: h.text}));
    slides.push({id: 'signature', eyebrow: 'You compared to a typical player', title: sig.habits[0].label, lead: sig.habits[0].text,
      signatures: sig.habits.map(h => ({id: h.id, label: h.label, text: h.text})), compare,
      bullets: sig.habits.slice(1).map(h => h.text).concat(sig.favouriteSquares.length ? [`Your pieces land on ${sig.favouriteSquares.map(s => s.square).join(', ')} more than anywhere else.`] : []),
      board: {kind: 'heat', counts: sig.heat, compare: compare.slice(0, 4), caption: 'Where your pieces go: brighter squares are landed on more often.'}});
  }

  // 7 — Rival
  const O = I.opponents;
  if (O.rival) {
    const r = O.rival, classes = Object.entries(r.byClass).sort((a, b) => b[1].games - a[1].games);
    slides.push({id: 'rival', eyebrow: 'Your rival', title: r.name, lead: rivalLine(r, r.name),
      rival: {name: r.name, games: r.games, w: r.w, d: r.d, l: r.l, byClass: Object.fromEntries(classes.map(([cls, s]) => [cls, {games: s.games, w: s.w, d: s.d, l: s.l}])), history: r.history?.length >= 3 ? r.history : null},
      bullets: [O.nemesis ? `Toughest opponent: ${O.nemesis.name} beat you ${fmt.plural(O.nemesis.l, 'time')} in ${fmt.plural(O.nemesis.games, 'game')}.` : null, O.victim ? `Your best matchup: you beat ${O.victim.name} ${fmt.plural(O.victim.w, 'time')} in ${fmt.plural(O.victim.games, 'game')}.` : null,
        O.revenge && O.revenge.games >= 3 ? `Rematches straight after a loss: ${O.revenge.games}, with a ${fmt.pct(O.revenge.winRate)} win rate.` : null, `${fmt.int(O.distinct)} different opponents in total, averaging ${O.averageRating ?? '–'} rating.`].filter(Boolean),
      board: {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: ''}});
  }

  // 8 — Greatest hits
  const S = I.streaks, strongest = O.strongestBeaten;
  if (strongest || S.win) {
    slides.push({id: 'hits', eyebrow: 'Greatest hits', title: strongest ? `Beat a ${strongest.rating}` : `${S.win.length} wins in a row`,
      lead: strongest ? `${strongest.opp} in ${classLabel(strongest.cls).toLowerCase()}${strongest.myRating ? `, while you were ${strongest.myRating}` : ''}.` : `Your longest winning streak ran from ${fmt.shortDate(S.win.from)} to ${fmt.shortDate(S.win.to)}.`,
      stats: [S.win ? {label: 'Longest win streak', value: String(S.win.length), sub: fmt.shortDate(S.win.from) + ' – ' + fmt.shortDate(S.win.to), tone: 'good'} : null,
        S.unbeaten ? {label: 'Longest unbeaten run', value: String(S.unbeaten.length), sub: 'Wins and draws in a row'} : null,
        O.upsets ? {label: 'Wins v. 100+ higher', value: fmt.int(O.upsets)} : null].filter(Boolean),
      bullets: [S.bestDay && S.bestDay.games >= 3 ? `Best day: ${S.bestDay.date}, ${S.bestDay.w} wins from ${S.bestDay.games} games.` : null].filter(Boolean),
      // The board charts your results by opponent rating; the best win is one press away.
      evidence: strongest ? {...gameLink(strongest, 'View your best win'), title: `Your win against ${strongest.opp} (${strongest.rating}), ${fmt.date(strongest.t)}`} : gameLink(S.win.last, 'View the last win of your streak'),
      board: O.byRating ? resultsByRating(O.byRating) : replaySpec(strongest || S.win.last, account)});
  }

  // 9 — Comeback and the one that got away
  const M = I.material, E = I.engine;
  if (M.comeback || M.choke) {
    const cb = E?.comeback || M.comeback, ch = E?.choke || M.choke;
    slides.push({id: 'swings', eyebrow: 'Comebacks', title: cb ? `Down ${Math.abs(cb.deficit)} points, still won` : 'The one that got away',
      lead: cb ? `Against ${cb.opp} you were ${Math.abs(cb.deficit)} points of material down${cb.minWin != null ? ` (about ${Math.round(cb.minWin)}% winning chances by the engine)` : ''} and still won by ${cb.term === 'mate' ? 'checkmate' : 'resignation'}.`
        : `Against ${ch.opp} you were ${ch.surplus} points up and it slipped. You were up in ${M.aheadGames} games and converted ${fmt.pct(M.conversion)}.`,
      stats: [M.conversion != null ? {label: 'Converted when 3+ up', value: fmt.pct(M.conversion), sub: fmt.plural(M.aheadGames, 'game')} : null,
        M.resilience != null ? {label: 'Saved when 3+ down', value: fmt.pct(M.resilience), sub: fmt.plural(M.behindGames, 'game')} : null,
        {label: 'Wins from 3+ down', value: fmt.int(M.comebacks), sub: 'by mate or resignation', tone: 'good'},
        ch ? {label: 'The one that got away', value: `+${ch.surplus}`, sub: `v. ${ch.opp}, ${result(ch.res)}`, tone: 'gentle'} : null].filter(Boolean),
      bullets: [],
      evidence: gameLink(cb || ch, cb ? 'Open the comeback' : 'Open the one that got away'),
      // The board plays the comeback; the game you lost from ahead is one press away.
      alsoEvidence: cb && ch ? {...gameLink(ch, 'View the one that got away'), title: `${ch.surplus} points up against ${ch.opp} and still lost, ${fmt.date(ch.t)}`} : null,
      board: replaySpec(cb || ch, account)});
  }

  // 10 — Habits
  const H = I.habits;
  if (H.activeDays >= 5) {
    const nightVsDay = H.night.games >= 8 && H.day.games >= 8 ? `Late nights (23:00–05:00): ${fmt.pct(H.night.winRate)} win rate over ${H.night.games} games. Daytime: ${fmt.pct(H.day.winRate)} over ${H.day.games}.` : null;
    slides.push({id: 'habits', eyebrow: 'Chess habits', title: H.busiestWeekday ? `${H.busiestWeekday.day === 'Sat' || H.busiestWeekday.day === 'Sun' ? 'Weekend' : H.busiestWeekday.day} player` : 'Your week', lead: H.bestBand ? `Your best hours are ${H.bestBand.label}: ${fmt.pct(H.bestBand.winRate)} win rate over ${H.bestBand.games} games.` : `You played on ${fmt.plural(H.activeDays, 'different day')}.`,
      stats: [H.busiestWeekday ? {label: 'Busiest weekday', value: WEEKDAYS.includes(H.busiestWeekday.day) ? ({Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'})[H.busiestWeekday.day] : H.busiestWeekday.day, sub: fmt.plural(H.busiestWeekday.games, 'game')} : null,
        H.longestSession ? {label: 'Longest session', value: fmt.plural(H.longestSession.games, 'game'), sub: `${H.longestSession.minutes} min on ${H.longestSession.date}`} : null,
        {label: 'Active days', value: fmt.int(H.activeDays), sub: `${(T.games / H.activeDays).toFixed(1)} games per day`},
        H.busiestBand ? {label: 'Busiest hours', value: H.busiestBand.label.replace(/^(\d+)–(\d+)$/, '$1:00–$2:00'), sub: `${fmt.pct(100 * H.busiestBand.games / Math.max(1, T.games))} of games`} : null].filter(Boolean),
      bullets: [nightVsDay, H.afterLoss.games >= 10 && H.afterWin.games >= 10 ? `Win rate in the next game after a loss: ${fmt.pct(H.afterLoss.winRate)}; after a win: ${fmt.pct(H.afterWin.winRate)}.` : null,
        H.worstBand && H.bestBand && H.worstBand.label !== H.bestBand.label ? `Toughest hours: ${H.worstBand.label}, ${fmt.pct(H.worstBand.winRate)} win rate.` : null].filter(Boolean),
      board: {kind: 'schedule', matrix: H.matrix, habitMatrix: H.habitMatrix, caption: 'Your week on the board: rows are weekdays (Monday at the top), columns are three-hour blocks from midnight. Brighter means more games.'}});
  }

  // 11 — On the clock
  const C = I.clock, X = I.terminations;
  if (C.decisions >= 50) {
    // Bullet gets a finer split: premoves, then half seconds, then up to ten seconds.
    const B = C.bullet;
    const under = limit => (B || C).within?.find(w => w.limit === limit)?.share;
    slides.push({id: 'clock', eyebrow: 'On the clock', title: C.averageThink != null ? `${fmt.seconds(C.averageThink)} per move` : 'Clock habits',
      lead: C.within ? null : `${fmt.pct(C.snapShare)} of your moves took under five seconds.`,
      points: B ? [`${fmt.pct(B.buckets[0])} of your moves were premoves`, `${fmt.pct(under(1))} took under 1 second`, `${fmt.pct(100 - under(10))} took 10 seconds or more`]
        : C.within ? [`${fmt.pct(under(1))} of your moves took under 1 second`, `${fmt.pct(under(5))} under 5 seconds`, `${fmt.pct(100 - under(30))} took 30 seconds or more`] : null,
      stats: [{label: 'Wins on time', value: fmt.int(X.flagWins), tone: 'good'}, {label: 'Losses on time', value: fmt.int(X.flagLosses), tone: 'gentle'}, C.troubleShare != null ? {label: 'Games in time trouble', value: fmt.pct(C.troubleShare)} : null,
        C.aheadShare != null ? {label: 'Ahead on the clock', value: C.aheadShare + '%', sub: 'of the time'} : C.longestThink ? {label: 'Longest think', value: fmt.seconds(C.longestThink.seconds)} : null].filter(Boolean),
      bullets: [],
      // One column per interval (0–1 s, 1–2 s, … 30 s and more): the share of moves that took that long.
      // `group` is the column's place in the usual view; the fine view's columns carry the group they split from.
      // The chart stands on the board's bottom edge, its labels under the board.
      board: B ? {kind: 'blank', me: 'w', caption: '', scene: {type: 'columns', unit: '%', plainLabels: true, floor: true, columns: B.buckets.map((share, i) => {
        const from = i ? B.within[i - 1].limit : 0, to = B.within[i]?.limit;
        const label = i === 0 ? 'Premove' : to ? `${from}–${to}s` : `${from}s+`;
        const detail = i === 0 ? `${fmt.pct(share)} of your moves were premoves (${PREMOVE} s or less on the clock)`
          : to ? `${fmt.pct(share)} of your moves took ${from} to ${to} seconds` : `${fmt.pct(share)} of your moves took ${fmt.plural(from, 'second')} or more`;
        return {value: share, display: Math.round(share) + '%', label, color: 'var(--pv-c, var(--accent))', detail, group: i};
      })}}
        : C.within && C.buckets ? {kind: 'blank', me: 'w', caption: '', scene: {type: 'columns', unit: '%', plainLabels: true, floor: true, columns: C.buckets.map((share, i) => {
        const from = i ? C.within[i - 1].limit : 0, to = C.within[i]?.limit;
        return {value: share, display: Math.round(share) + '%', label: to ? `${from}–${to}s` : `${from}s+`, color: 'var(--pv-c, var(--accent))', group: i,
          detail: `${fmt.pct(share)} of your moves took ${to ? `${from} to ${fmt.plural(to, 'second')}` : `${fmt.plural(from, 'second')} or more`}`};
      })}}
        : C.longestThink ? {kind: 'fen', fen: C.longestThink.fen, me: C.longestThink.me, caption: ''} : {kind: 'cover'},
      // "Increase granularity": the same chart split into many narrower intervals.
      fineBoard: C.grain && (B || C.within && C.buckets) ? fineClockBoard(C.grain, !!B) : null});
  }

  // 12 — Then and now: accuracy over time, from the engine check plus reviewed library games
  if (E || engineStatus !== 'unavailable') {
    // Every day with checked games is a point; the line through them is smoothed.
    const trend = E?.trend, curve = E?.daily?.length >= 2 ? E.daily : E?.monthly?.length >= 2 ? E.monthly : null;
    const running = engineStatus === 'running';
    slides.push({id: 'trend', eyebrow: 'Then and now', title: trend ? `${fmt.pct(trend.early)} → ${fmt.pct(trend.late)}` : E ? `${fmt.pct(E.average)} accuracy` : 'Accuracy over time',
      lead: trend ? `Your first ${trend.earlyGames} checked games against your last ${trend.lateGames}.`
        : E ? `Across ${fmt.plural(E.games, 'checked game')}.` : running ? 'The engine is checking your games in the background. The chart fills in as games finish.' : 'Check your games below to see how your accuracy changes over time.',
      stats: E ? [{label: 'Average accuracy', value: fmt.pct(E.average), sub: fmt.plural(E.games, 'game')}, E.best ? {label: 'Most accurate game', value: fmt.pct(E.best.accuracy), sub: `v. ${E.best.opp}, ${E.best.moves} moves`, tone: 'good'} : null,
        E.blunderRate != null ? {label: 'Big drops per 100 moves', value: String(E.blunderRate)} : null, E.rival ? {label: `v. ${E.rival.name}`, value: fmt.pct(E.rival.accuracy), sub: fmt.plural(E.rival.games, 'checked game')} : null].filter(Boolean) : [],
      bullets: E?.byClass ? [Object.entries(E.byClass).sort((a, b) => b[1].games - a[1].games).slice(0, 3).map(([k, v]) => `${classLabel(k)} ${fmt.pct(v.accuracy)}`).join(' · ')] : [],
      pending: E ? null : 'engine', engineStatus,
      evidence: gameLink(E?.best, 'Open your most accurate game'),
      board: curve ? {kind: 'blank', me: 'w', caption: '', scene: {type: 'line', series: curve.map(p => ({t: p.t, r: p.acc, n: p.games})), peak: null, label: 'Accuracy', unit: '%', smooth: curve === E.daily}}
        : trend ? {kind: 'split', left: {label: 'Then', value: fmt.pct(trend.early)}, right: {label: 'Now', value: fmt.pct(trend.late)}, caption: ''}
        : E?.best ? {kind: 'fen', fen: E.best.fen, me: E.best.me, caption: ''} : {kind: 'cover', caption: ''}});
  }

  // 13 — How your games end
  if (T.w + T.l >= 10) {
    const top = m => Object.entries(m).sort((a, b) => b[1] - a[1]);
    const wins = top(X.wins), losses = top(X.losses), draws = top(X.draws);
    const label = ([term, n], total) => `${TERM_LABELS[term] || term} ${fmt.pct(100 * n / total)}`;
    const share = term => T.w ? fmt.pct(100 * (X.wins[term] || 0) / T.w) : '–';
    slides.push({id: 'endings', eyebrow: 'How your games end', title: X.mates ? `${fmt.int(X.mates)} checkmates delivered` : 'Endings', lead: wins.length ? `Wins by ${wins.slice(0, 3).map(w => label(w, T.w)).join(', ')}.` : 'How your games end.',
      stats: [{label: 'Wins by checkmate', value: share('mate'), sub: fmt.plural(X.wins.mate || 0, 'game'), tone: 'good'}, {label: 'Wins by resignation', value: share('resign'), sub: fmt.plural(X.wins.resign || 0, 'game')},
        {label: 'Wins on time', value: share('time'), sub: fmt.plural(X.wins.time || 0, 'game')},
        // The piece that delivers most of the mates; without mates, how many losses ran out of time.
        X.favouritePiece ? {label: 'Favourite finisher', value: (PIECE_NAMES[X.favouritePiece[0]] || 'piece').replace(/^./, c => c.toUpperCase()), sub: `${fmt.pct(100 * X.favouritePiece[1] / X.mates)} of your mates`}
          : {label: 'Losses on time', value: T.l ? fmt.pct(100 * (X.losses.time || 0) / T.l) : '–', sub: fmt.plural(X.losses.time || 0, 'game'), tone: 'gentle'}],
      bullets: [losses.length ? `Your losses: ${losses.slice(0, 3).map(l => label(l, T.l)).join(', ')}.` : null, draws.length && T.d ? `Draws by ${draws.slice(0, 3).map(d => label(d, T.d)).join(', ')}.` : null].filter(Boolean),
      board: (X.patternGame || X.lastMate) ? {kind: 'fen', fen: (X.patternGame || X.lastMate).fen, me: (X.patternGame || X.lastMate).me, mate: true, caption: X.patternGame ? `A ${PATTERN_LABELS[X.patternGame.pattern]} with the ${PIECE_NAMES[X.patternGame.piece]} against ${X.patternGame.opp}.` : `Your most recent checkmate, against ${X.lastMate.opp}.`} : {kind: 'cover'}});
  }

  // 14 — Share
  slides.push({id: 'share', eyebrow: 'Share', title: 'Your profile, ready to share', lead: 'Copy a link anyone can open in their browser, or download a card for anywhere else. The link holds only the numbers on these slides and the games linked from them.',
    board: {kind: 'card', caption: 'A preview of your card.'}});
  return slides;
}

/** Report = insights plus twin and a few labels; the share payload is a trimmed copy. */
export function buildReport(rows, insights, options) {
  return {...insights, twin: classify(rows.filter(r => !r.bot)), account: options.account, site: options.site, period: options.period, periodLabel: options.periodLabel, builtAt: Date.now(), country: options.country || null};
}

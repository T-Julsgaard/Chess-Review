// Player profile — the slide deck. Turns insights into slides: headline, lead,
// a few stats, bullets, an evidence link and a board visualization spec. Copy is
// playful but every number is the player's own; negatives are framed kindly.
// Slides whose sample is too small are left out rather than padded.
import {classLabel, byClassOrder, TERM_LABELS, PIECE_NAMES, PATTERN_LABELS, WEEKDAYS, MIN_GAMES, smoothed, SMOOTH_MIN_POINTS} from './insights.js';
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
 * bottom, draws, then wins on top, each named by its range. A band with only a
 * few games is drawn fainter.
 */
export function resultsByRating({bands}) {
  const share = (n, b) => b.games ? n / b.games : 0;
  // Every column is named by its rating range ("1200–1249"); the board wraps it when the columns are narrow.
  const columns = bands.map(b => ({from: b.from, games: b.games, w: share(b.w, b), d: share(b.d, b), l: share(b.l, b),
    label: `${b.from}–${b.to}`,
    detail: b.games ? `Opponents rated ${b.from}–${b.to}: ${fmt.plural(b.games, 'game')}. Won ${fmt.pct(100 * share(b.w, b))}, drew ${fmt.pct(100 * share(b.d, b))}, lost ${fmt.pct(100 * share(b.l, b))}.` : `Opponents rated ${b.from}–${b.to}: no games.`}));
  const legend = [[null, 'Results by opponent rating:'], ['pv-legend-good', 'Won'], ['pv-legend-draw', 'Drew'], ['pv-legend-loss', 'Lost'], ...(bands.some(b => b.games && b.games < 5) ? [['pv-legend-faint', 'Fainter: under 5 games']] : [])];
  return {kind: 'blank', me: 'w', caption: '', scene: {type: 'results', columns, legend}};
}

/**
 * Results over time, drawn like Greatest hits: one column per run of consecutive
 * games (see `resultRuns`), losses at the bottom, then draws, then wins. `name`
 * narrows the wording to one opponent.
 */
export function resultsOverTime(runs, name = null) {
  if (!runs?.length) return null;
  const date = (t, options) => new Date(t * 1000).toLocaleDateString('en-US', options);
  // Every column is named, by its month ("Nov") or its year ("2025"); the tooltip gives the month with its year.
  const named = ({from, unit}) => date(from, unit === 'year' ? {year: 'numeric'} : {month: 'short'});
  const when = ({from, unit}) => date(from, unit === 'year' ? {year: 'numeric'} : {month: 'long', year: 'numeric'});
  const columns = runs.map(run => {
    const {games, w, d, l} = run, share = n => games ? n / games : 0;
    return {games, w: share(w), d: share(d), l: share(l), label: named(run),
      detail: games ? `${when(run)}: ${fmt.plural(games, 'game')}${name ? ` against ${name}` : ''}. Won ${w}, drew ${d}, lost ${l}.` : `${when(run)}: no games${name ? ` against ${name}` : ''}.`};
  });
  const legend = [[null, 'Results over time:'], ['pv-legend-good', 'Won'], ['pv-legend-draw', 'Drew'], ['pv-legend-loss', 'Lost'], ...(columns.some(c => c.games < 5) ? [['pv-legend-faint', 'Fainter: under 5 games']] : [])];
  return {kind: 'blank', me: 'w', caption: '', scene: {type: 'results', columns, legend, label: name ? `Results against ${name} over time, oldest on the left.` : 'Your results over time, oldest on the left.'}};
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
/** Played and missed mates in one as whole percents that add up to 100; the larger part takes the rounding, as on the results bar. */
export function mateInOneShares(M) {
  if (!M?.chances) return {found: 0, missed: 0};
  const out = {found: Math.round(100 * M.found / M.chances), missed: Math.round(100 * M.missed / M.chances)};
  out[M.found >= M.missed ? 'found' : 'missed'] += 100 - out.found - out.missed;
  return out;
}
const gameLink = (ev, label) => ev ? {label: label || `${result(ev.res)} v. ${ev.opp}, ${fmt.shortDate(ev.t)}`, url: ev.url, id: ev.id, t: ev.t} : null;

const DAY_NAMES = {Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'};
/**
 * The "When you play" headline: whatever stands out most about when the games
 * are played, by the hour first (late nights, early mornings), then by the day
 * (one weekday, the weekend), and otherwise the part of the day most games fall
 * in. `label` says the share behind it.
 */
export function playTime(H, games) {
  const total = Math.max(1, games), share = n => Math.round(100 * (n || 0) / total);
  const day = H.busiestWeekday, weekend = (H.weekdayGames?.Sat || 0) + (H.weekdayGames?.Sun || 0);
  if (share(H.night?.games) >= 30) return {title: 'Night owl', label: `${share(H.night.games)}% of your games between 23:00 and 05:00`};
  if (share(H.early?.games) >= 20) return {title: 'Early bird', label: `${share(H.early.games)}% of your games between 05:00 and 09:00`};
  if (day && share(day.games) >= 25 && day.day !== 'Sat' && day.day !== 'Sun') return {title: `${DAY_NAMES[day.day]} player`, label: `${share(day.games)}% of your games on ${DAY_NAMES[day.day]}s`};
  if (share(weekend) >= 45) return {title: 'Weekend player', label: `${share(weekend)}% of your games on Saturdays and Sundays`};
  const parts = [['morning', 'Morning player', 'in the morning (05:00–12:00)'], ['day', 'Afternoon player', 'in the afternoon (12:00–18:00)'],
    ['evening', 'Evening player', 'in the evening (18:00–23:00)'], ['night', 'Night owl', 'late at night (23:00–05:00)']].filter(([key]) => H[key]?.games);
  const top = parts.sort((a, b) => H[b[0]].games - H[a[0]].games)[0];
  return top ? {title: top[1], label: `${share(H[top[0]].games)}% of your games ${top[2]}`} : {title: 'Your week', label: null};
}

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
    // The same three facts as figures: the period and site on one line, the games and hours as two numbers under it.
    intro: few ? null : {period: periodLabel, site: siteName, games: T.games, hours: T.hours},
    country, stats: [], board: {kind: 'cover', white, black: black || null, caption: white ? `Your usual opening moves: 1. ${white}${black ? ` ${black}` : ''}.` : 'Your games, one board.'}});
  if (few) return slides;

  // 2 — The numbers
  slides.push({id: 'numbers', eyebrow: 'Games and results', title: `${fmt.int(T.games)} games`, lead: `You won ${fmt.pct(T.winRate)} of them, with ${fmt.plural(T.d, 'draw')} along the way.`,
    stats: [{label: 'Wins', value: fmt.int(T.w), tone: 'good'}, {label: 'Draws', value: fmt.int(T.d)}, {label: 'Losses', value: fmt.int(T.l)}, {label: 'Hours played', value: fmt.hoursNum(T.hours)}, {label: 'Moves made', value: fmt.int(T.moves)}, {label: 'Pieces captured', value: fmt.int(T.captures)}, {label: 'Checks given', value: fmt.int(T.checks)}],
    bullets: [T.byColor.w.games && T.byColor.b.games ? `Win rate as White ${fmt.pct(T.byColor.w.winRate)}. Win rate as Black ${fmt.pct(T.byColor.b.winRate)}.` : null,
      T.longest ? `Longest game: ${fmt.int(T.longest.moves)} moves against ${T.longest.opp}.` : null].filter(Boolean),
    evidence: gameLink(T.longest, 'Open your longest game'), board: {kind: 'fill', total: T.games, wins: T.w, draws: T.d, caption: 'Green squares are wins, silver draws, coral losses. Partial squares show the exact proportions.'}});

  // 3 — Rating journey
  const ratingClasses = Object.entries(I.ratings).sort((a, b) => b[1].games - a[1].games);
  if (ratingClasses.length) {
    const [cls, r] = ratingClasses.find(([key]) => key === ratingClass) || ratingClasses[0];
    slides.push({id: 'rating', eyebrow: site === 'both' && I.ratingSite && !I.otherRatings ? `Rating over time · ${I.ratingSite === 'lichess' ? 'Lichess' : 'Chess.com'}` : 'Rating over time', title: `${classLabel(cls)}: ${fmt.signed(r.change)}`, lead: `From ${r.start} to ${r.end}, peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`,
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
    slides.push({id: 'twin', eyebrow: 'The legend you play like', title: twin.winner.name, lead: `${twin.winner.tagline}. ${twin.winner.blurb}`,
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
    slides.push({id: 'signature', eyebrow: 'You vs. a typical player', title: sig.habits[0].label, lead: sig.habits[0].text,
      signatures: sig.habits.map(h => ({id: h.id, label: h.label, text: h.text})), compare,
      bullets: sig.habits.slice(1).map(h => h.text).concat(sig.favouriteSquares.length ? [`Your pieces land on ${sig.favouriteSquares.map(s => s.square).join(', ')} more than anywhere else.`] : []),
      board: {kind: 'heat', counts: sig.heat, compare: compare.slice(0, 4), caption: 'Where your pieces go: brighter squares are landed on more often.'}});
  }

  // 7 — Rival
  const O = I.opponents;
  if (O.rival) {
    const r = O.rival, classes = Object.entries(r.byClass).sort((a, b) => b[1].games - a[1].games);
    slides.push({id: 'rival', eyebrow: 'Most-played opponent', title: r.name, lead: rivalLine(r, r.name),
      rival: {name: r.name, games: r.games, w: r.w, d: r.d, l: r.l, byClass: Object.fromEntries(classes.map(([cls, s]) => [cls, {games: s.games, w: s.w, d: s.d, l: s.l}]))},
      bullets: [O.nemesis ? `Toughest opponent: ${O.nemesis.name} beat you ${fmt.plural(O.nemesis.l, 'time')} in ${fmt.plural(O.nemesis.games, 'game')}.` : null, O.victim ? `Your best matchup: you beat ${O.victim.name} ${fmt.plural(O.victim.w, 'time')} in ${fmt.plural(O.victim.games, 'game')}.` : null,
        O.revenge && O.revenge.games >= 3 ? `Rematches straight after a loss: ${O.revenge.games}, with a ${fmt.pct(O.revenge.winRate)} win rate.` : null, `${fmt.int(O.distinct)} different opponents in total, averaging ${O.averageRating ?? '–'} rating.`].filter(Boolean),
      board: {kind: 'fill', total: r.games, wins: r.w, draws: r.d, caption: ''}});
  }

  // 8 — Best wins
  const S = I.streaks, strongest = O.strongestBeaten, bestDay = S.bestDay?.games >= 3 ? S.bestDay : null;
  if (strongest || S.win) {
    const stats = [S.win ? {label: 'Longest win streak', value: String(S.win.length), sub: fmt.shortDate(S.win.from) + ' – ' + fmt.shortDate(S.win.to), tone: 'good'} : null,
      S.unbeaten ? {label: 'Longest unbeaten run', value: String(S.unbeaten.length), sub: 'Wins and draws in a row'} : null,
      O.upsets ? {label: 'Wins v. 100+ higher', value: fmt.int(O.upsets)} : null,
      // The fewest moves you needed to win a game; the best day fills in for any tile above that is missing, so there are four.
      T.quickestWin ? {label: 'Quickest win', value: fmt.plural(T.quickestWin.moves, 'move'), sub: `v. ${T.quickestWin.opp}, ${fmt.shortDate(T.quickestWin.t)}`} : null,
      bestDay?.w ? {label: 'Best day', value: fmt.plural(bestDay.w, 'win'), sub: `${fmt.shortDate(Date.parse(bestDay.date + 'T12:00:00') / 1000)}, ${fmt.plural(bestDay.games, 'game')}`} : null].filter(Boolean).slice(0, 4);
    slides.push({id: 'hits', eyebrow: 'Your best wins', title: strongest ? `Beat a ${strongest.rating}` : `${S.win.length} wins in a row`,
      lead: strongest ? `${strongest.opp} in ${classLabel(strongest.cls).toLowerCase()}${strongest.myRating ? `, while you were ${strongest.myRating}` : ''}.` : `Your longest winning streak ran from ${fmt.shortDate(S.win.from)} to ${fmt.shortDate(S.win.to)}.`,
      stats,
      // The best day as a sentence, unless it already has its tile.
      bullets: [bestDay && !stats.some(s => s.label === 'Best day') ? `Best day: ${bestDay.date}, ${bestDay.w} wins from ${bestDay.games} games.` : null].filter(Boolean),
      // The board charts your results by opponent rating; the highest rated win is one press away.
      evidence: strongest ? {...gameLink(strongest, 'View your highest rated win'), title: `Your win against ${strongest.opp} (${strongest.rating}), ${fmt.date(strongest.t)}`} : gameLink(S.win.last, 'View the last win of your streak'),
      board: O.byRating ? resultsByRating(O.byRating) : replaySpec(strongest || S.win.last, account)});
  }

  // 9 — Comeback and the one that got away
  const M = I.material, E = I.engine;
  if (M.comeback || M.choke) {
    const cb = E?.comeback || M.comeback, ch = E?.choke || M.choke;
    slides.push({id: 'swings', eyebrow: 'Comebacks and blown leads', title: cb ? `Down ${Math.abs(cb.deficit)} points, still won` : 'The one that got away',
      lead: cb ? `Against ${cb.opp} you were ${Math.abs(cb.deficit)} points of material down${cb.minWin != null ? ` (about ${Math.round(cb.minWin)}% winning chances by the engine)` : ''} and still won by ${cb.term === 'mate' ? 'checkmate' : 'resignation'}.`
        : `Against ${ch.opp} you were ${ch.surplus} points up and it slipped. You were up in ${M.aheadGames} games and converted ${fmt.pct(M.conversion)}.`,
      stats: [M.conversion != null ? {label: 'Converted when 3+ up', value: fmt.pct(M.conversion), sub: fmt.plural(M.aheadGames, 'game')} : null,
        M.resilience != null ? {label: 'Saved when 3+ down', value: fmt.pct(M.resilience), sub: fmt.plural(M.behindGames, 'game')} : null,
        {label: 'Wins from 3+ down', value: fmt.int(M.comebacks), sub: 'by mate or resignation', tone: 'good'},
        // With a comeback on the board, this fact's name is the link to the game you lost from ahead (alsoEvidence).
        ch ? {label: 'The one that got away', value: `+${ch.surplus}`, sub: `v. ${ch.opp}, ${result(ch.res)}`, tone: 'gentle', game: cb ? 'also' : null} : null].filter(Boolean),
      bullets: [],
      evidence: gameLink(cb || ch, cb ? 'Open the comeback' : 'Open the one that got away'),
      // The board plays the comeback; the game you lost from ahead is one press away.
      alsoEvidence: cb && ch ? {...gameLink(ch, 'View the one that got away'), title: `${ch.surplus} points up against ${ch.opp} and still lost, ${fmt.date(ch.t)}`} : null,
      board: replaySpec(cb || ch, account)});
  }

  // 10 — When you play
  const H = I.habits;
  if (H.activeDays >= 5) {
    // Day against night, and the game after a loss against the game after a win: one point each.
    const nightVsDay = H.night.games >= 8 && H.day.games >= 8 ? [`Daytime: ${fmt.pct(H.day.winRate)} win rate over ${fmt.plural(H.day.games, 'game')}.`,
      `Nighttime (23:00–05:00): ${fmt.pct(H.night.winRate)} win rate over ${fmt.plural(H.night.games, 'game')}.`] : [];
    const nextGame = H.afterLoss.games >= 10 && H.afterWin.games >= 10 ? [`After a loss: ${fmt.pct(H.afterLoss.winRate)} win rate in the next game.`,
      `After a win: ${fmt.pct(H.afterWin.winRate)} win rate in the next game.`] : [];
    const when = playTime(H, T.games);
    slides.push({id: 'habits', eyebrow: 'When you play', title: when.title, heroLabel: when.label, lead: H.bestBand ? `Your best hours are ${H.bestBand.label}: ${fmt.pct(H.bestBand.winRate)} win rate over ${H.bestBand.games} games.` : `You played on ${fmt.plural(H.activeDays, 'different day')}.`,
      stats: [H.busiestWeekday ? {label: 'Busiest weekday', value: WEEKDAYS.includes(H.busiestWeekday.day) ? ({Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'})[H.busiestWeekday.day] : H.busiestWeekday.day, sub: fmt.plural(H.busiestWeekday.games, 'game')} : null,
        H.longestSession ? {label: 'Longest session', value: fmt.plural(H.longestSession.games, 'game'), sub: `${H.longestSession.minutes} min on ${H.longestSession.date}`} : null,
        {label: 'Active days', value: fmt.int(H.activeDays), sub: `${(T.games / H.activeDays).toFixed(1)} games per day`},
        H.busiestBand ? {label: 'Busiest hours', value: H.busiestBand.label.replace(/^(\d+)–(\d+)$/, '$1:00–$2:00'), sub: `${fmt.pct(100 * H.busiestBand.games / Math.max(1, T.games))} of games`} : null].filter(Boolean),
      bullets: [...nightVsDay, ...nextGame,
        H.worstBand && H.bestBand && H.worstBand.label !== H.bestBand.label ? `Toughest hours: ${H.worstBand.label}, ${fmt.pct(H.worstBand.winRate)} win rate.` : null].filter(Boolean),
      board: {kind: 'schedule', matrix: H.matrix, habitMatrix: H.habitMatrix, caption: 'Your week on the board: rows are weekdays (Monday at the top), columns are three-hour blocks from midnight. Brighter means more games.'}});
  }

  // 11 — On the clock
  const C = I.clock, X = I.terminations;
  if (C.decisions >= 50) {
    // Bullet gets a finer split: premoves, then half seconds, then up to ten seconds.
    const B = C.bullet;
    const under = limit => (B || C).within?.find(w => w.limit === limit)?.share;
    slides.push({id: 'clock', eyebrow: 'Time per move', title: C.averageThink != null ? `${fmt.seconds(C.averageThink)} per move` : 'Clock habits',
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

  // 12 — Accuracy over time: accuracy over time, from the engine check plus reviewed library games
  if (E || engineStatus !== 'unavailable') {
    // Every day with checked games is a point; the line through them is smoothed.
    const trend = E?.trend, curve = E?.daily?.length >= 2 ? E.daily : E?.monthly?.length >= 2 ? E.monthly : null;
    const running = engineStatus === 'running';
    const series = curve ? curve.map(p => ({t: p.t, r: p.acc, n: p.games})) : null, smooth = curve === E?.daily;
    // The headline reads the two ends of the line on the board, so the numbers there and here agree.
    const line = smooth && series.length > SMOOTH_MIN_POINTS ? smoothed(series) : null;
    slides.push({id: 'trend', eyebrow: 'Accuracy over time', title: trend && line ? `${fmt.pct(line[0].r)} → ${fmt.pct(line.at(-1).r)}` : trend ? `${fmt.pct(trend.early)} → ${fmt.pct(trend.late)}` : E ? `${fmt.pct(E.average)} accuracy` : 'Accuracy over time',
      lead: trend && line ? `Your average accuracy at the start of the period and at its end, across ${fmt.plural(E.games, 'checked game')}.`
        : trend ? `Your first ${trend.earlyGames} checked games against your last ${trend.lateGames}.`
        : E ? `Across ${fmt.plural(E.games, 'checked game')}.` : running ? 'The engine is checking your games in the background. The chart fills in as games finish.' : 'Check your games below to see how your accuracy changes over time.',
      stats: E ? [{label: 'Average accuracy', value: fmt.pct(E.average), sub: fmt.plural(E.games, 'game')}, E.best ? {label: 'Most accurate game', value: fmt.pct(E.best.accuracy), sub: `v. ${E.best.opp}, ${E.best.moves} moves`, tone: 'good'} : null,
        E.blunderRate != null ? {label: 'Big drops per 100 moves', value: String(E.blunderRate)} : null, E.rival ? {label: `v. ${E.rival.name}`, value: fmt.pct(E.rival.accuracy), sub: fmt.plural(E.rival.games, 'checked game')} : null].filter(Boolean) : [],
      bullets: [],
      pending: E ? null : 'engine', engineStatus,
      evidence: gameLink(E?.best, 'Open your most accurate game'),
      // While the check runs the board shows every checked day as it comes in (live); once it stops, only the average.
      // `games` (every checked game) lets the board draw each game's line before they merge into the average.
      board: curve ? {kind: 'blank', me: 'w', caption: '', scene: {type: 'line', series, peak: null, label: 'Accuracy', tag: false, unit: '%', smooth, live: running, games: smooth ? E.perGame : null}}
        : !running && trend ? {kind: 'split', left: {label: 'Then', value: fmt.pct(trend.early)}, right: {label: 'Now', value: fmt.pct(trend.late)}, caption: ''}
        : !running && E?.best ? {kind: 'fen', fen: E.best.fen, me: E.best.me, caption: ''}
        // No line to draw yet: a level line on the dimmed board stands for no games, and the check's first games take its place.
        : {kind: 'blank', me: 'w', caption: '', scene: {type: 'line', series: [], empty: true, label: 'Accuracy', tag: false, unit: '%', live: running}}});
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

  // 14 — Mate in one: how often a mate was on the board, and how often it was found
  const M1 = I.mateInOne;
  if (M1?.chances >= 3) {
    const shares = mateInOneShares(M1);
    slides.push({id: 'mate1', eyebrow: 'Mate-in-one chances', title: `${shares.missed}% of your mates in one missed`,
      // How often a mate came up, how often it was found, and where the missed ones wait.
      lead: `A mate in one came up in ${fmt.plural(M1.withChance, 'game')}, ${fmt.pct(100 * M1.withChance / Math.max(1, M1.games))} of your games. ${!M1.missed ? 'You found it every time.' : `You found it ${shares.found}% of the time.${M1.misses.length ? ' Now find the ones you missed, right here on the board.' : ''}`}`,
      stats: [{label: 'Mates found', value: fmt.int(M1.found), tone: 'good'}, {label: 'Mates missed', value: fmt.int(M1.missed), tone: M1.missed ? 'gentle' : null},
        {label: 'Games with a mate in one', value: fmt.int(M1.withChance)}, {label: 'Games with a mate missed', value: fmt.int(M1.withMiss)}],
      bullets: [],
      // The board turns the missed mates into puzzles, newest first.
      board: M1.misses.length ? {kind: 'puzzle', puzzles: M1.misses, caption: ''} : {kind: 'cover', caption: ''}});
  }

  // Final chapter: an overview of the chapters on the board, with a share link in the panel.
  // The eyebrow names it in the progress line; the panel itself shows no heading or sentence.
  slides.push({id: 'share', eyebrow: 'Overview', title: 'Your profile at a glance', board: {kind: 'overview'}});
  return slides;
}

/** Report = insights plus twin and a few labels; the share payload is a trimmed copy. */
export function buildReport(rows, insights, options) {
  return {...insights, twin: classify(rows.filter(r => !r.bot)), account: options.account, site: options.site, period: options.period, periodLabel: options.periodLabel, builtAt: Date.now(), country: options.country || null};
}

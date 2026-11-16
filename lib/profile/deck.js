// Player profile — the slide deck. Turns insights into slides: headline, lead,
// a few stats, bullets, an evidence link and a board visualization spec. Copy is
// playful but every number is the player's own; negatives are framed kindly.
// Slides whose sample is too small are left out rather than padded.
import {classLabel, TERM_LABELS, PIECE_NAMES, PATTERN_LABELS, WEEKDAYS, MIN_GAMES} from './insights.js';
import {classify} from './archetypes.js';

export const fmt = {
  int: n => n == null ? '–' : Math.round(n).toLocaleString('en-US'),
  pct: n => n == null ? '–' : (Math.round(n * 10) / 10).toLocaleString('en-US', {maximumFractionDigits: 1}) + '%',
  hours: h => h == null ? '–' : h < 1 ? Math.round(h * 60) + ' min' : h < 10 ? (Math.round(h * 10) / 10) + ' h' : Math.round(h).toLocaleString('en-US') + ' h',
  seconds: s => s == null ? '–' : s < 60 ? Math.round(s) + ' s' : Math.floor(s / 60) + ' min ' + String(Math.round(s % 60)).padStart(2, '0') + ' s',
  date: t => t ? new Date(t * 1000).toLocaleDateString('en-US', {day: 'numeric', month: 'short', year: 'numeric'}) : '',
  shortDate: t => t ? new Date(t * 1000).toLocaleDateString('en-US', {day: 'numeric', month: 'short'}) : '',
  month: key => { const [y, m] = key.split('-'); return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {month: 'long', year: 'numeric'}); },
  signed: n => n == null ? '–' : (n > 0 ? '+' : '') + Math.round(n),
  plural: (n, one, many = one + 's') => fmt.int(n) + ' ' + (Math.abs(n) === 1 ? one : many),
};
const result = res => ({w: 'won', l: 'lost', d: 'drew'})[res] || '';
const recordText = s => `${s.w}–${s.l}–${s.d}`;
const gameLink = (ev, label) => ev ? {label: label || `${result(ev.res)} v. ${ev.opp}, ${fmt.shortDate(ev.t)}`, url: ev.url, id: ev.id} : null;

export function buildDeck(insights, {account = '', site = 'chesscom', periodLabel = 'Past 12 months', country = null, engineStatus = 'idle', engineBudgetLabel = ''} = {}) {
  const slides = [];
  const I = insights, T = I.totals;
  const few = I.humanGames < MIN_GAMES;
  const siteName = site === 'lichess' ? 'Lichess' : site === 'both' ? 'Chess.com and Lichess' : 'Chess.com';

  // 1 — Cover
  const fm = I.openings.firstMoves;
  const white = fm.white?.move || (fm.vsE4 ? 'e4' : fm.vsD4 ? 'd4' : null);
  const black = white === 'e4' ? fm.vsE4?.move : white === 'd4' ? fm.vsD4?.move : null;
  slides.push({id: 'cover', eyebrow: 'Player profile', title: account, lead: few ? `Only ${fmt.plural(I.humanGames, 'game')} in this period. Play a few more and come back.` : `${periodLabel} on ${siteName}: ${fmt.plural(T.games, 'game')}, ${fmt.hours(T.hours)} at the board, one story.`,
    country, stats: [], board: {kind: 'cover', white, black: black || null, caption: white ? `Your usual opening moves: 1. ${white}${black ? ` ${black}` : ''}.` : 'Your games, one board.'}});
  if (few) return slides;

  // 2 — The numbers
  slides.push({id: 'numbers', eyebrow: 'The numbers', title: `${fmt.int(T.games)} games`, lead: `You won ${fmt.pct(T.winRate)} of them, with ${fmt.plural(T.d, 'draw')} along the way.`,
    stats: [{label: 'Wins', value: fmt.int(T.w), tone: 'good'}, {label: 'Draws', value: fmt.int(T.d)}, {label: 'Losses', value: fmt.int(T.l)}, {label: 'Hours played', value: fmt.hours(T.hours)}, {label: 'Moves made', value: fmt.int(T.moves)}, {label: 'Pieces taken', value: fmt.int(T.captures)}],
    bullets: [Object.entries(T.byClass).sort((a, b) => b[1].games - a[1].games).slice(0, 3).map(([cls, s]) => `${classLabel(cls)}: ${fmt.int(s.games)} games, ${fmt.pct(s.winRate)} wins`).join(' · '),
      T.byColor.w.games && T.byColor.b.games ? `As White you win ${fmt.pct(T.byColor.w.winRate)}, as Black ${fmt.pct(T.byColor.b.winRate)}.` : null,
      T.longest ? `Longest game: ${fmt.int(T.longest.moves)} moves against ${T.longest.opp}.` : null].filter(Boolean),
    evidence: gameLink(T.longest, 'Open your longest game'), board: {kind: 'fill', total: T.games, wins: T.w, draws: T.d, caption: 'Each square lights up as your games are counted. Green squares are wins.'}});

  // 3 — Rating journey
  const ratingClasses = Object.entries(I.ratings).sort((a, b) => b[1].games - a[1].games);
  if (ratingClasses.length) {
    const [cls, r] = ratingClasses[0];
    slides.push({id: 'rating', eyebrow: site === 'both' && I.ratingSite ? `Rating journey · ${I.ratingSite === 'lichess' ? 'Lichess' : 'Chess.com'}` : 'Rating journey', title: `${classLabel(cls)}: ${fmt.signed(r.change)}`, lead: `From ${r.start} to ${r.end}, peaking at ${r.peak.rating} on ${fmt.date(r.peak.t)}.`,
      stats: ratingClasses.slice(0, 3).map(([k, v]) => ({label: classLabel(k), value: String(v.end), sub: `${fmt.signed(v.change)} · peak ${v.peak.rating}`, tone: v.change > 0 ? 'good' : v.change < 0 ? 'gentle' : null})),
      bullets: [r.bestMonth && r.bestMonth.delta > 0 ? `Best month: ${fmt.month(r.bestMonth.month)}, ${fmt.signed(r.bestMonth.delta)} over ${r.bestMonth.games} games.` : null].filter(Boolean),
      series: Object.fromEntries(ratingClasses.slice(0, 3).map(([k, v]) => [k, v.series])), evidence: gameLink(r.peak, 'Open the game that set your peak'),
      board: {kind: 'fen', fen: r.peak.fen, me: r.peak.me, caption: `The final position of your peak-rating game, ${result(r.peak.res)} against ${r.peak.opp}.`}});
  }

  // 4 — Openings
  const ow = I.openings.w, ob = I.openings.b;
  if (ow.top.length || ob.top.length) {
    const fav = [...ow.top, ...ob.top].sort((a, b) => b.games - a.games)[0];
    const favColor = ow.top.includes(fav) ? 'w' : 'b';
    slides.push({id: 'openings', eyebrow: 'Your openings', title: fav.name, lead: `Your most played opening: ${fmt.plural(fav.games, 'game')} as ${favColor === 'w' ? 'White' : 'Black'}, ${fmt.pct(fav.winRate)} wins.`,
      openings: {w: ow.top.map(o => ({name: o.name, games: o.games, winRate: o.winRate, record: recordText(o)})), b: ob.top.map(o => ({name: o.name, games: o.games, winRate: o.winRate, record: recordText(o)}))},
      bullets: [[ow.best, ob.best].filter(Boolean).sort((a, b) => b.score - a.score)[0] ? (() => { const best = [ow.best, ob.best].filter(Boolean).sort((a, b) => b.score - a.score)[0]; return `Your best weapon: ${best.name}, ${fmt.pct(best.winRate)} wins over ${best.games} games.`; })() : null,
        [ow.worst, ob.worst].filter(Boolean).sort((a, b) => a.score - b.score)[0] ? (() => { const worst = [ow.worst, ob.worst].filter(Boolean).sort((a, b) => a.score - b.score)[0]; return worst.name !== fav.name || worst.winRate < 45 ? `Worth a look: ${worst.name}, ${fmt.pct(worst.winRate)} wins over ${worst.games} games.` : null; })() : null].filter(Boolean),
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
    slides.push({id: 'signature', eyebrow: 'Signature moves', title: sig.habits[0].label, lead: sig.habits[0].text,
      bullets: sig.habits.slice(1).map(h => h.text).concat(sig.favouriteSquares.length ? [`Your pieces land on ${sig.favouriteSquares.map(s => s.square).join(', ')} more than anywhere else.`] : []),
      board: {kind: 'heat', counts: sig.heat, caption: 'Where your pieces go: brighter squares are landed on more often.'}});
  }

  // 7 — Rival
  const O = I.opponents;
  if (O.rival) {
    const r = O.rival, classes = Object.entries(r.byClass).sort((a, b) => b[1].games - a[1].games);
    slides.push({id: 'rival', eyebrow: 'Your rival', title: r.name, lead: `${fmt.plural(r.games, 'game')} together. You are ${recordText(r)} (wins–losses–draws)${r.winRate >= 50 ? ', and ahead' : r.winRate >= 40 ? ', close' : '. They have your number, for now'}.`,
      stats: classes.slice(0, 3).map(([cls, s]) => ({label: classLabel(cls), value: recordText(s), sub: fmt.plural(s.games, 'game')})),
      bullets: [O.nemesis ? `Nemesis: ${O.nemesis.name}, ${O.nemesis.l} losses in ${O.nemesis.games} games.` : null, O.victim ? `Favourite opponent: ${O.victim.name}, ${O.victim.w} wins in ${O.victim.games} games.` : null,
        O.revenge && O.revenge.games >= 3 ? `Rematches straight after a loss: ${O.revenge.games}, and you won ${fmt.pct(O.revenge.winRate)} of them.` : null, `${fmt.int(O.distinct)} different opponents in total, averaging ${O.averageRating ?? '–'} rating.`].filter(Boolean),
      evidence: gameLink(r.decisive, 'Open your latest decisive game against ' + r.name),
      board: r.decisive ? {kind: 'fen', fen: r.decisive.fen, me: r.decisive.me, caption: `Your most recent decisive game against ${r.name}: you ${result(r.decisive.res)}.`} : {kind: 'cover'}});
  }

  // 8 — Greatest hits
  const S = I.streaks, strongest = O.strongestBeaten;
  if (strongest || S.win) {
    slides.push({id: 'hits', eyebrow: 'Greatest hits', title: strongest ? `Beat a ${strongest.rating}` : `${S.win.length} wins in a row`,
      lead: strongest ? `Your strongest scalp: ${strongest.opp}, rated ${strongest.rating}${strongest.myRating ? ` while you were ${strongest.myRating}` : ''}, in ${classLabel(strongest.cls).toLowerCase()}.` : `Your longest winning streak ran from ${fmt.shortDate(S.win.from)} to ${fmt.shortDate(S.win.to)}.`,
      stats: [S.win ? {label: 'Longest win streak', value: String(S.win.length), sub: fmt.shortDate(S.win.from) + ' – ' + fmt.shortDate(S.win.to), tone: 'good'} : null,
        S.unbeaten ? {label: 'Longest unbeaten run', value: String(S.unbeaten.length)} : null,
        S.busiestDay ? {label: 'Most games in a day', value: String(S.busiestDay.games), sub: S.busiestDay.date} : null,
        T.quickestWin ? {label: 'Quickest win', value: fmt.int(T.quickestWin.moves) + ' moves', sub: 'v. ' + T.quickestWin.opp} : null].filter(Boolean),
      bullets: [S.bestDay && S.bestDay.games >= 3 ? `Best day: ${S.bestDay.date}, ${S.bestDay.w} wins from ${S.bestDay.games} games.` : null].filter(Boolean),
      evidence: gameLink(strongest, 'Open the win against ' + strongest?.opp), board: strongest ? {kind: 'fen', fen: strongest.fen, me: strongest.me, caption: `The final position against ${strongest.opp} (${strongest.rating}).`} : {kind: 'fen', fen: S.win.last.fen, me: S.win.last.me, caption: 'The game that completed your longest streak.'}});
  }

  // 9 — Comeback and the one that got away
  const M = I.material, E = I.engine;
  if (M.comeback || M.choke) {
    const cb = E?.comeback || M.comeback, ch = E?.choke || M.choke;
    slides.push({id: 'swings', eyebrow: 'Comebacks', title: cb ? `Down ${Math.abs(cb.deficit)} points, still won` : 'The one that got away',
      lead: cb ? `Against ${cb.opp} you were ${Math.abs(cb.deficit)} points of material down${cb.minWin != null ? ` (about ${Math.round(cb.minWin)}% winning chances by the engine)` : ''} and won anyway. ${M.comebacks > 1 ? `You did that ${M.comebacks} times.` : ''}`
        : `Against ${ch.opp} you were ${ch.surplus} points up and it slipped. It happens to everyone; you were up in ${M.aheadGames} games and converted ${fmt.pct(M.conversion)}.`,
      stats: [M.conversion != null ? {label: 'Converted when 3+ up', value: fmt.pct(M.conversion), sub: fmt.plural(M.aheadGames, 'game')} : null,
        M.resilience != null ? {label: 'Saved when 3+ down', value: fmt.pct(M.resilience), sub: fmt.plural(M.behindGames, 'game')} : null,
        ch && cb ? {label: 'The one that got away', value: `+${ch.surplus}`, sub: `v. ${ch.opp}, ${result(ch.res)}`, tone: 'gentle'} : null].filter(Boolean),
      bullets: [cb && ch ? `The one that got away: ${ch.surplus} points up against ${ch.opp}${ch.maxWin != null ? ` (${Math.round(ch.maxWin)}% winning chances at the top)` : ''}, and it ended in a ${result(ch.res) === 'lost' ? 'loss' : 'draw'}. Chess is hard.` : null].filter(Boolean),
      evidence: gameLink(cb || ch, cb ? 'Open the comeback' : 'Open the game'),
      board: cb ? {kind: 'journey', fenFrom: cb.fenMin || cb.fenLow, fenTo: cb.fen, me: cb.me, caption: `From your lowest point (move ${Math.ceil((cb.minPly || cb.lowPly) / 2)}) to the final position.`}
        : {kind: 'journey', fenFrom: ch.fenMax || ch.fenHigh, fenTo: ch.fen, me: ch.me, caption: `From your best moment (move ${Math.ceil((ch.maxPly || ch.highPly) / 2)}) to the end.`}});
  }

  // 10 — Habits
  const H = I.habits;
  if (H.activeDays >= 5) {
    const nightVsDay = H.night.games >= 8 && H.day.games >= 8 ? `Late nights (23:00–05:00): ${fmt.pct(H.night.winRate)} wins over ${H.night.games} games. Daytime: ${fmt.pct(H.day.winRate)} over ${H.day.games}.${H.night.winRate > H.day.winRate + 5 ? ' Night owl.' : H.day.winRate > H.night.winRate + 5 ? ' Sleep helps.' : ''}` : null;
    slides.push({id: 'habits', eyebrow: 'Chess habits', title: H.busiestWeekday ? `${H.busiestWeekday.day === 'Sat' || H.busiestWeekday.day === 'Sun' ? 'Weekend' : H.busiestWeekday.day} player` : 'Your week', lead: H.bestBand ? `Your best hours are ${H.bestBand.label}: ${fmt.pct(H.bestBand.winRate)} wins over ${H.bestBand.games} games.` : `You played on ${fmt.plural(H.activeDays, 'different day')}.`,
      stats: [H.busiestWeekday ? {label: 'Busiest weekday', value: WEEKDAYS.includes(H.busiestWeekday.day) ? ({Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday'})[H.busiestWeekday.day] : H.busiestWeekday.day, sub: fmt.plural(H.busiestWeekday.games, 'game')} : null,
        H.longestSession ? {label: 'Longest session', value: fmt.plural(H.longestSession.games, 'game'), sub: `${H.longestSession.minutes} min on ${H.longestSession.date}`} : null,
        {label: 'Active days', value: fmt.int(H.activeDays), sub: `${(T.games / H.activeDays).toFixed(1)} games per day`}].filter(Boolean),
      bullets: [nightVsDay, H.afterLoss.games >= 10 && H.afterWin.games >= 10 ? `After a loss you win ${fmt.pct(H.afterLoss.winRate)} of the next game; after a win, ${fmt.pct(H.afterWin.winRate)}.${H.afterLoss.winRate + 8 < H.afterWin.winRate ? ' A short break after a loss might pay off.' : H.afterLoss.winRate > H.afterWin.winRate + 5 ? ' Losses sharpen you.' : ' Steady nerves.'}` : null,
        H.worstBand && H.bestBand && H.worstBand.label !== H.bestBand.label ? `Toughest hours: ${H.worstBand.label}, ${fmt.pct(H.worstBand.winRate)} wins.` : null].filter(Boolean),
      board: {kind: 'schedule', matrix: H.matrix, caption: 'Your week on the board: rows are weekdays (Monday at the top), columns are three-hour blocks from midnight. Brighter means more games.'}});
  }

  // 11 — On the clock
  const C = I.clock, X = I.terminations;
  if (C.decisions >= 50) {
    slides.push({id: 'clock', eyebrow: 'On the clock', title: C.averageThink != null ? `${fmt.seconds(C.averageThink)} per move` : 'Clock habits', lead: `${fmt.pct(C.snapShare)} of your moves took under five seconds${C.aheadShare != null ? `, and you were ahead on the clock ${C.aheadShare}% of the time` : ''}.`,
      stats: [{label: 'Wins on time', value: fmt.int(X.flagWins), tone: 'good'}, {label: 'Losses on time', value: fmt.int(X.flagLosses), tone: 'gentle'}, C.troubleShare != null ? {label: 'Games in time trouble', value: fmt.pct(C.troubleShare)} : null,
        C.longestThink ? {label: 'Longest think', value: fmt.seconds(C.longestThink.seconds), sub: `v. ${C.longestThink.opp}`} : null].filter(Boolean),
      bullets: [], pending: engineStatus === 'done' ? null : 'engine', engineLine: E?.byClass ? Object.entries(E.byClass).sort((a, b) => b[1].games - a[1].games).slice(0, 3).map(([k, v]) => `${classLabel(k)} accuracy ${fmt.pct(v.accuracy)} over ${v.games} sampled games`).join(' · ') : null,
      evidence: gameLink(C.longestThink, 'Open the game with your longest think'), board: C.longestThink ? {kind: 'fen', fen: C.longestThink.fen, me: C.longestThink.me, caption: `The game where you paused for ${fmt.seconds(C.longestThink.seconds)} on move ${Math.ceil(C.longestThink.ply / 2)}.`} : {kind: 'cover'}});
  }

  // 12 — Then and now (engine)
  const tilt = H.afterLoss.games >= 10 ? H.afterLoss : null;
  if (E || engineStatus !== 'unavailable') {
    const trend = E?.trend;
    slides.push({id: 'trend', eyebrow: 'Then and now', title: trend ? `${fmt.pct(trend.early)} → ${fmt.pct(trend.late)}` : E ? `${fmt.pct(E.average)} accuracy` : 'Accuracy, by your own engine',
      lead: trend ? `Average accuracy in your first ${trend.earlyGames} sampled games against the last ${trend.lateGames}.${trend.late > trend.early + 1 ? ' Trending up.' : trend.early > trend.late + 1 ? ' A dip; the sample is small, so take it lightly.' : ' Steady.'}`
        : E ? `Across ${fmt.plural(E.games, 'sampled game')}, analysed locally at depth 8.` : `Run the engine check to see your accuracy trend, your most accurate game and the verified comeback. ${engineBudgetLabel}`,
      stats: E ? [{label: 'Average accuracy', value: fmt.pct(E.average), sub: fmt.plural(E.games, 'game')}, E.best ? {label: 'Most accurate game', value: fmt.pct(E.best.accuracy), sub: `v. ${E.best.opp}, ${E.best.moves} moves`, tone: 'good'} : null,
        E.blunderRate != null ? {label: 'Big drops per 100 moves', value: String(E.blunderRate)} : null, E.rival ? {label: `v. ${E.rival.name}`, value: fmt.pct(E.rival.accuracy), sub: fmt.plural(E.rival.games, 'sampled game')} : null].filter(Boolean) : [],
      pending: E ? null : 'engine', engineStatus,
      evidence: gameLink(E?.best, 'Open your most accurate game'), board: trend ? {kind: 'split', left: {label: 'Then', value: fmt.pct(trend.early)}, right: {label: 'Now', value: fmt.pct(trend.late)}, caption: 'Left half: your earlier sampled games. Right half: the most recent.'}
        : E?.best ? {kind: 'fen', fen: E.best.fen, me: E.best.me, caption: `Your most accurate game: ${fmt.pct(E.best.accuracy)} against ${E.best.opp}.`} : {kind: 'cover', caption: 'Accuracy is computed by the bundled Stockfish on your own machine.'}});
  }

  // 13 — How your games end
  if (T.w + T.l >= 10) {
    const top = m => Object.entries(m).sort((a, b) => b[1] - a[1]);
    const wins = top(X.wins), losses = top(X.losses), draws = top(X.draws);
    const label = ([term, n], total) => `${TERM_LABELS[term] || term} ${fmt.pct(100 * n / total)}`;
    slides.push({id: 'endings', eyebrow: 'How your games end', title: X.mates ? `${fmt.int(X.mates)} checkmates delivered` : 'Endings', lead: wins.length ? `Your wins come by ${wins.slice(0, 3).map(w => label(w, T.w)).join(', ')}.` : 'How your games end.',
      stats: [X.favouritePiece ? {label: 'Favourite mating piece', value: PIECE_NAMES[X.favouritePiece[0]], sub: fmt.plural(X.favouritePiece[1], 'mate')} : null,
        X.favouritePattern && X.favouritePattern[0] !== 'other' ? {label: 'Signature mate', value: PATTERN_LABELS[X.favouritePattern[0]], sub: fmt.plural(X.favouritePattern[1], 'time')} : null,
        {label: 'Mated yourself', value: fmt.int(X.matedCount), tone: 'gentle'}].filter(Boolean),
      bullets: [losses.length ? `Your losses: ${losses.slice(0, 3).map(l => label(l, T.l)).join(', ')}.` : null, draws.length && T.d ? `Draws by ${draws.slice(0, 3).map(d => label(d, T.d)).join(', ')}.` : null].filter(Boolean),
      evidence: gameLink(X.patternGame || X.lastMate, 'Open the checkmate'), board: (X.patternGame || X.lastMate) ? {kind: 'fen', fen: (X.patternGame || X.lastMate).fen, me: (X.patternGame || X.lastMate).me, mate: true, caption: X.patternGame ? `A ${PATTERN_LABELS[X.patternGame.pattern]} with the ${PIECE_NAMES[X.patternGame.piece]} against ${X.patternGame.opp}.` : `Your most recent checkmate, against ${X.lastMate.opp}.`} : {kind: 'cover'}});
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

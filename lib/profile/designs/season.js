// Month-by-month activity and playing streaks for the season chapter.
import {fmt} from '../deck.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pct = (part, whole) => whole ? Math.round(1000 * part / whole) / 10 : null;
const dayKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const monthKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthShort = key => MONTHS[Number(key.split('-')[1]) - 1] || key;

/** Months (gaps filled), days with games, the longest run of consecutive playing days. */
export function seasonStats(rows, {from = null, to = null} = {}) {
  const sorted = rows.filter(r => r.t).sort((a, b) => a.t - b.t);
  if (!sorted.length) return null;
  const months = new Map(), days = new Map();
  for (const row of sorted) {
    const d = new Date(row.t * 1000), mk = monthKey(d), dk = dayKey(d);
    if (!months.has(mk)) months.set(mk, {key: mk, games: 0, w: 0, d: 0, l: 0});
    const m = months.get(mk); m.games++; m[row.res]++;
    if (!days.has(dk)) days.set(dk, {key: dk, games: 0, w: 0, d: 0, l: 0});
    const day = days.get(dk); day.games++; day[row.res]++;
  }
  // Fill empty months between the first and the last so the chart keeps time honest.
  // The chart covers the whole chosen period when its bounds are known, not just the months with games.
  const first = new Date((from > 0 ? Math.min(from + 43200, sorted[0].t) : sorted[0].t) * 1000), last = new Date((to ? Math.max(to, sorted.at(-1).t) : sorted.at(-1).t) * 1000), list = [];
  for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m === 11 ? (y++, m = 0) : m++) {
    const key = y + '-' + String(m + 1).padStart(2, '0');
    const entry = months.get(key) || {key, games: 0, w: 0, d: 0, l: 0};
    list.push({...entry, label: MONTHS[m], winRate: pct(entry.w, entry.games), score: pct(entry.w + entry.d / 2, entry.games)});
  }
  let run = null, best = null, prev = null;
  for (const k of [...days.keys()].sort()) {
    const d = new Date(k + 'T12:00:00');
    if (prev && Math.round((d - prev) / 86400000) === 1) { run.length++; run.to = k; } else run = {length: 1, from: k, to: k};
    if (!best || run.length > best.length) best = {...run};
    prev = d;
  }
  const played = list.filter(m => m.games);
  const busiest = played.reduce((a, b) => b.games > a.games ? b : a, played[0]);
  const eligible = played.filter(m => m.games >= 10);
  const bestMonth = eligible.length > 1 ? eligible.reduce((a, b) => b.score > a.score ? b : a) : null;
  return {months: list, activeDays: days.size, dayStreak: best, busiest, bestMonth,
    perActiveDay: days.size ? sorted.length / days.size : null, maxDay: Math.max(...[...days.values()].map(d => d.games))};
}

const dateLabel = key => new Date(key + 'T12:00:00').toLocaleDateString('en-US', {day: 'numeric', month: 'short'});
/** The month-by-month chapter, shown after "Your games in numbers". */
export function seasonSlide(season) {
  if (!season || season.months.filter(m => m.games).length < 2) return null;
  const {busiest, bestMonth, dayStreak} = season;
  const columns = seasonColumns(season.months);
  // Against an average month of the period (quiet months count), so the busiest one reads in proportion.
  const average = Math.round(season.months.reduce((sum, m) => sum + m.games, 0) / season.months.length);
  const versus = average && average < busiest.games ? `, against ${fmt.plural(average, 'game')} in an average month` : '';
  return {id: 'season', eyebrow: 'Month by month', title: `${fmt.month(busiest.key).split(' ')[0]} was your busiest month`,
    lead: `${fmt.plural(busiest.games, 'game')} in ${fmt.month(busiest.key)}${versus}. You played on ${fmt.plural(season.activeDays, 'different day')}.`,
    points: [`${fmt.plural(busiest.games, 'game')} in ${fmt.month(busiest.key)}${versus}`, `Played on ${fmt.plural(season.activeDays, 'different day')}`],
    stats: [dayStreak && dayStreak.length > 1 ? {label: 'Days in a row', value: String(dayStreak.length), sub: `${dateLabel(dayStreak.from)} – ${dateLabel(dayStreak.to)}`, tone: 'good'} : null,
      {label: 'Active days', value: fmt.int(season.activeDays), sub: `${season.perActiveDay.toFixed(1)} games per day`},
      bestMonth ? {label: 'Best month', value: monthShort(bestMonth.key), sub: `${fmt.pct(bestMonth.winRate)} win rate, ${bestMonth.games} games`} : null,
      {label: 'Most in one day', value: fmt.int(season.maxDay)}].filter(Boolean),
    bullets: [], season,
    board: {kind: 'blank', me: 'w', scene: {type: 'columns', columns, compactLabels: true, floor: true}, caption: ''}};
}
/**
 * Every month of the chosen period, as chart columns. Up to sixteen months show one
 * column each; longer periods are grouped by quarter, and very long ones by year.
 */
export function seasonColumns(months) {
  const group = months.length <= 16 ? 1 : months.length <= 48 ? 3 : 12;
  const groups = [];
  for (const m of months) {
    const [y, mo] = m.key.split('-').map(Number);
    const key = group === 1 ? m.key : group === 3 ? `${y}-Q${Math.floor((mo - 1) / 3) + 1}` : String(y);
    let g = groups.at(-1);
    if (!g || g.key !== key) groups.push(g = {key, games: 0, w: 0, d: 0, l: 0, label: group === 1 ? m.label : group === 3 ? `Q${Math.floor((mo - 1) / 3) + 1} '${String(y).slice(2)}` : String(y), month: m.key});
    g.games += m.games; g.w += m.w; g.d += m.d; g.l += m.l;
  }
  return groups.map(g => {
    const winRate = g.games ? Math.round(1000 * g.w / g.games) / 10 : null, score = g.games ? Math.round(1000 * (g.w + g.d / 2) / g.games) / 10 : null;
    const name = group === 1 ? fmt.month(g.month) : g.label;
    return {value: g.games, label: g.label, tone: g.games ? score : null, detail: `${name}: ${fmt.plural(g.games, 'game')}${g.games ? `, ${fmt.pct(winRate)} win rate` : ''}`};
  });
}

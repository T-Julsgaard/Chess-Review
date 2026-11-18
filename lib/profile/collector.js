// Player profile — collection orchestration. Fetches the account's games for the
// requested period, replays them into feature rows in small chunks that yield to
// the page, merges into the store and reports progress. Cancellable; a later run
// reuses everything already collected.
import {collectChesscom, collectLichess} from './sources.js';
import {gameFeatures, needsThinkBuckets} from './features.js';
import {checkImport} from '../import-request.js';

export const PERIODS = [
  {id: 'year', label: 'Past 12 months', months: 12},
  {id: 'calendar', label: 'This year', months: null},
  {id: 'all', label: 'All time', months: Infinity},
  {id: 'custom', label: 'Custom period'},
];
/** Date inputs describe inclusive UTC calendar days, independent of the viewer's timezone. */
export function customPeriodBounds(range) {
  const day = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return NaN;
    const ms = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value ? ms / 1000 : NaN;
  };
  const start = day(range?.start), end = day(range?.end);
  return Number.isFinite(start) && Number.isFinite(end) && start <= end ? {start, end: end + 86400} : null;
}
export function periodLabel(id, range) {
  if (id !== 'custom') return (PERIODS.find(p => p.id === id) || PERIODS[0]).label;
  const bounds = customPeriodBounds(range);
  if (!bounds) return 'Custom period';
  const date = t => new Date(t * 1000).toLocaleDateString(undefined, {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
  return `${date(bounds.start)} – ${date(bounds.end - 86400)}`;
}
export function periodStart(id, now = new Date(), range) {
  if (id === 'custom') return customPeriodBounds(range)?.start ?? NaN;
  const period = PERIODS.find(p => p.id === id) || PERIODS[0];
  if (period.id === 'calendar') return Date.UTC(now.getUTCFullYear(), 0, 1) / 1000;
  if (period.months === Infinity) return 0;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period.months, 1) / 1000;
}
export function periodRows(rows, id, now = new Date(), range) {
  const period = PERIODS.find(p => p.id === id) || PERIODS[0];
  if (id === 'custom') {
    const bounds = customPeriodBounds(range);
    return bounds ? rows.filter(row => row.t != null && row.t >= bounds.start && row.t < bounds.end && row.t <= now.getTime() / 1000 + 3600).sort((a, b) => a.t - b.t) : [];
  }
  const start = periodStart(period.id, now), end = now.getTime() / 1000 + 3600;
  return rows.filter(row => row.t != null && row.t >= start && row.t <= end).sort((a, b) => a.t - b.t);
}

const yieldToPage = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Collect rows for {site, account} back to `since`. Reports via onProgress
 * ({phase:'archives'|'month'|'replay'|'done', ...}). Returns the merged store data.
 */
export async function collectProfile({site, account, since = 0, store, signal, onProgress, now = new Date()}) {
  const name = String(account || '').trim();
  if (!name) throw new Error('Choose a player first.');
  const existing = await store.loadRows(site, name);
  const known = new Set(existing.months);
  // A wider period than before must revisit months the previous run never asked for.
  const sinceBefore = existing.since || 0;
  // Rows saved before the move-time buckets existed are replayed once more.
  const upgrade = existing.rows.some(needsThinkBuckets);
  if (existing.rows.length && (since < sinceBefore || upgrade)) known.clear();
  let replayed = 0, kept = 0, pending = [], months = [];
  const flush = async () => {
    if (!pending.length) return;
    const rows = pending; pending = [];
    await store.mergeRows(site, name, rows, {months, since});
    months = [];
  };
  const replay = async games => {
    let budget = performance.now() + 14;
    for (const game of games) {
      checkImport(signal);
      const row = gameFeatures(game, name);
      replayed++;
      if (row) { pending.push(row); kept++; }
      if (performance.now() > budget) { onProgress?.({phase: 'replay', replayed, kept}); await yieldToPage(); budget = performance.now() + 14; }
    }
  };
  onProgress?.({phase: 'archives'});
  if (site === 'chesscom') {
    await collectChesscom(name, {since, known, signal, now,
      onMonth: async (url, games, {current}) => { await replay(games); if (!current) months.push(url); if (pending.length >= 200) await flush(); },
      onProgress: info => onProgress?.({phase: 'month', ...info, replayed, kept})});
  } else if (site === 'lichess') {
    const from = existing.rows.length && since >= sinceBefore && !upgrade ? Math.max(since, existing.updatedAt ? Math.floor(existing.updatedAt / 1000) - 86400 : since) : since;
    await collectLichess(name, {since: from, signal, onBatch: replay, onProgress: info => onProgress?.({phase: 'month', ...info, replayed, kept})});
  } else throw new Error('Unsupported site.');
  await flush();
  const data = await store.mergeRows(site, name, [], {since});
  onProgress?.({phase: 'done', replayed, kept, total: data.rows.length});
  return data;
}

// Player profile — collection orchestration. Fetches the account's games for the
// requested period, replays them into feature rows in small chunks that yield to
// the page, merges into the store and reports progress. Cancellable; a later run
// reuses everything already collected.
import {collectChesscom, collectLichess} from './sources.js';
import {gameFeatures} from './features.js';
import {checkImport} from '../import-request.js';

export const PERIODS = [
  {id: 'year', label: 'Past 12 months', months: 12},
  {id: 'calendar', label: 'This year', months: null},
  {id: 'all', label: 'All time', months: Infinity},
  {id: 'last100', label: 'Last 100 games', months: 6, limit: 100},
];
export function periodStart(id, now = new Date()) {
  const period = PERIODS.find(p => p.id === id) || PERIODS[0];
  if (period.id === 'calendar') return Date.UTC(now.getUTCFullYear(), 0, 1) / 1000;
  if (period.months === Infinity) return 0;
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - period.months, 1) / 1000;
}
export function periodRows(rows, id, now = new Date()) {
  const period = PERIODS.find(p => p.id === id) || PERIODS[0];
  const start = periodStart(period.id, now), end = now.getTime() / 1000 + 3600;
  let out = rows.filter(row => row.t != null && row.t >= start && row.t <= end).sort((a, b) => a.t - b.t);
  if (period.limit) out = out.slice(-period.limit);
  return out;
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
  if (existing.rows.length && since < sinceBefore) known.clear();
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
    const from = existing.rows.length && since >= sinceBefore ? Math.max(since, existing.updatedAt ? Math.floor(existing.updatedAt / 1000) - 86400 : since) : since;
    await collectLichess(name, {since: from, signal, onBatch: replay, onProgress: info => onProgress?.({phase: 'month', ...info, replayed, kept})});
  } else throw new Error('Unsupported site.');
  await flush();
  const data = await store.mergeRows(site, name, [], {since});
  onProgress?.({phase: 'done', replayed, kept, total: data.rows.length});
  return data;
}

// Player profile — local storage. Feature rows per site+account, the engine
// sample cache per game with a bounded index, and the engine job status.
// Everything stays in chrome.storage.local; nothing is sent anywhere.
import {validRow} from './features.js';

export const PROFILE_PREFIX = 'profile:v1:';
export const rowsKey = (site, account) => `${PROFILE_PREFIX}games:${site}:${String(account).toLowerCase()}`;
/** A few bytes per player ({games, updatedAt}) so the Compare menu can list players without reading their games. */
export const summaryKey = (site, account) => `${PROFILE_PREFIX}summary:${site}:${String(account).toLowerCase()}`;
export const engineKey = (site, id) => `${PROFILE_PREFIX}engine:${site}:${id}`;
export const ENGINE_INDEX_KEY = PROFILE_PREFIX + 'engineIndex';
export const JOB_KEY = PROFILE_PREFIX + 'job';
export const MAX_ENGINE_ENTRIES = 2000;
/** The mate-in-one puzzles solved, as "site:gameId", newest last; bounded. */
export const MATE_SOLVED_KEY = PROFILE_PREFIX + 'mateSolved';
export const MAX_MATE_SOLVED = 5000;

const queues = new Map();
function locked(key, task) {
  if (globalThis.navigator?.locks?.request) return navigator.locks.request('chess-review-' + key, task);
  const pending = (queues.get(key) || Promise.resolve()).catch(() => {}).then(task);
  queues.set(key, pending);
  return pending.finally(() => { if (queues.get(key) === pending) queues.delete(key); });
}

export function createProfileStore(storage) {
  return {
    async loadRows(site, account) {
      const key = rowsKey(site, account);
      const got = await storage.get(key);
      const data = got[key];
      if (!data || !Array.isArray(data.rows)) return {rows: [], months: [], since: 0, updatedAt: 0};
      return {rows: data.rows.filter(validRow), months: Array.isArray(data.months) ? data.months : [], since: data.since || 0, updatedAt: data.updatedAt || 0, complete: data.complete !== false};
    },
    /** Merge rows by id; newest write wins. Keeps the collected-month list for incremental refreshes. */
    async mergeRows(site, account, rows, {months = [], since, complete} = {}) {
      const key = rowsKey(site, account);
      return locked(key, async () => {
        const got = await storage.get(key), prior = got[key] && Array.isArray(got[key].rows) ? got[key] : {rows: [], months: []};
        const byId = new Map(prior.rows.filter(validRow).map(row => [row.id, row]));
        for (const row of rows) if (validRow(row)) byId.set(row.id, row);
        const merged = [...byId.values()].sort((a, b) => (a.t || 0) - (b.t || 0));
        const data = {rows: merged, months: [...new Set([...(prior.months || []), ...months])],
          since: since ?? prior.since ?? 0, updatedAt: Date.now(), complete: complete ?? prior.complete ?? true};
        await storage.set({[key]: data, [summaryKey(site, account)]: {games: merged.length, updatedAt: data.updatedAt}});
        return data;
      });
    },
    async forgetAccount(site, account) { await storage.remove([rowsKey(site, account), summaryKey(site, account)]); },
    async loadEngine(site, ids) {
      const keys = ids.map(id => engineKey(site, id));
      if (!keys.length) return {};
      const got = await storage.get(keys);
      const out = {};
      for (const id of ids) { const entry = got[engineKey(site, id)]; if (entry) out[id] = entry; }
      return out;
    },
    async saveEngine(site, id, entry) {
      const key = engineKey(site, id);
      return locked(ENGINE_INDEX_KEY, async () => {
        const got = await storage.get(ENGINE_INDEX_KEY);
        let index = Array.isArray(got[ENGINE_INDEX_KEY]) ? got[ENGINE_INDEX_KEY].filter(k => k !== key) : [];
        index.push(key);
        const evict = index.length > MAX_ENGINE_ENTRIES ? index.splice(0, index.length - MAX_ENGINE_ENTRIES) : [];
        await storage.set({[key]: entry, [ENGINE_INDEX_KEY]: index});
        if (evict.length) await storage.remove(evict);
      });
    },
    async loadSolvedMates() { const got = await storage.get(MATE_SOLVED_KEY); return Array.isArray(got[MATE_SOLVED_KEY]) ? got[MATE_SOLVED_KEY].filter(key => typeof key === 'string') : []; },
    async addSolvedMate(key) {
      return locked(MATE_SOLVED_KEY, async () => {
        const list = (await this.loadSolvedMates()).filter(k => k !== key);
        list.push(key);
        await storage.set({[MATE_SOLVED_KEY]: list.slice(-MAX_MATE_SOLVED)});
      });
    },
    async loadJob() { const got = await storage.get(JOB_KEY); return got[JOB_KEY] || null; },
    async saveJob(job) { await storage.set({[JOB_KEY]: job}); },
    async clearJob() { await storage.remove(JOB_KEY); },
    /** Remove every profile key: rows for every account, engine entries and the job. */
    async deleteAll() {
      const all = await storage.get(null);
      const keys = Object.keys(all || {}).filter(key => key.startsWith(PROFILE_PREFIX));
      if (keys.length) await storage.remove(keys);
      return keys.length;
    },
    /** Every player whose games were read before: {site, account (lower case), games, updatedAt}, most recent first. */
    async listAccounts() {
      const prefix = PROFILE_PREFIX + 'games:', summaries = PROFILE_PREFIX + 'summary:', out = [];
      let entries;
      if (typeof storage.getKeys === 'function') {
        // Only the key names, then each player's small summary; a player saved before summaries existed is read in full once.
        const keys = (await storage.getKeys()).filter(key => key.startsWith(prefix));
        const got = keys.length ? await storage.get(keys.map(key => summaries + key.slice(prefix.length))) : {};
        const missing = keys.filter(key => !Number.isFinite(got[summaries + key.slice(prefix.length)]?.games));
        const full = missing.length ? await storage.get(missing) : {};
        entries = keys.map(key => [key, got[summaries + key.slice(prefix.length)] || (Array.isArray(full[key]?.rows) ? {games: full[key].rows.length, updatedAt: full[key].updatedAt || 0} : null)]);
        // Save the summaries that were missing, unless a save of new games wrote its own meanwhile.
        for (const key of missing) {
          const summary = summaries + key.slice(prefix.length), value = Array.isArray(full[key]?.rows) ? {games: full[key].rows.length, updatedAt: full[key].updatedAt || 0} : null;
          if (value) locked(key, async () => { const now = await storage.get(summary); if (!now[summary]) await storage.set({[summary]: value}); }).catch(() => {});
        }
      } else {
        const all = await storage.get(null);
        entries = Object.entries(all || {}).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key, Array.isArray(value?.rows) ? {games: value.rows.length, updatedAt: value.updatedAt} : null]);
      }
      for (const [key, value] of entries) {
        if (!value) continue;
        const rest = key.slice(prefix.length), split = rest.indexOf(':');
        if (split < 1) continue;
        out.push({site: rest.slice(0, split), account: rest.slice(split + 1), games: value.games, updatedAt: value.updatedAt || 0});
      }
      return out.filter(entry => entry.account && entry.games).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async usage() {
      const all = await storage.get(null);
      let bytes = 0, accounts = 0, engine = 0;
      for (const [key, value] of Object.entries(all || {})) {
        if (!key.startsWith(PROFILE_PREFIX)) continue;
        bytes += JSON.stringify(value).length;
        if (key.startsWith(PROFILE_PREFIX + 'games:')) accounts++;
        if (key.startsWith(PROFILE_PREFIX + 'engine:')) engine++;
      }
      return {bytes, accounts, engine};
    },
  };
}

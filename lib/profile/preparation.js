import {selectSample, ENGINE_ENTRY_VERSION, AUTO_MINUTES} from './engine-sample.js';
import {checkImport, importDelay} from '../import-request.js';

// Serialize small host jobs while collection continues independently. Completed
// entries stay in memory as well as the bounded disk cache for large histories.
export function createPreparation({store, sendMessage, sites, accounts, rows, settings, library = [], pgns = new Map(), signal, onProgress = () => {}, now = () => Date.now()}) {
  const attempted = new Set(), entries = {}, run = `profile-${now()}-${Math.random().toString(36).slice(2)}`;
  let pending = Promise.resolve(), dirty = false, error = null, active = null, sequence = 0, spent = 0, done = 0, failed = 0, collecting = true;
  const {depth, sample, workers, ms, off} = settings;
  const candidates = site => {
    const source = rows().filter(r => r.site === site);
    const cached = new Set([...library, ...source.filter(r => attempted.has(`${site}:${r.id}`)).map(r => r.id)]);
    return selectSample(source, {every: sample.every, games: Infinity, cached});
  };
  const progress = job => {
    const remaining = off ? 0 : sites.reduce((sum, site) => sum + candidates(site).length, 0);
    const running = job ? Math.max(0, job.total - job.done) : 0;
    const perGame = job?.perGameMs ?? ms / workers;
    let etaMs = (remaining + running) * perGame;
    if (!sample.every) etaMs = Math.min(etaMs, Math.max(0, AUTO_MINUTES * 60000 - spent - (job ? now() - job.startedAt : 0)));
    onProgress({done: done + (job?.done || 0), failed: failed + (job?.failed || 0), remaining: !sample.every && spent >= AUTO_MINUTES * 60000 ? 0 : remaining + running, etaMs, collecting, job});
  };
  const pump = async () => {
    while (dirty) {
      dirty = false; checkImport(signal);
      if (off || (sample.every > 1 && collecting) || (!sample.every && spent >= AUTO_MINUTES * 60000)) { progress(); continue; }
      for (const site of sites) {
        let ids = candidates(site);
        if (!ids.length) continue;
        const cached = await store.loadEngine(site, ids);
        for (const [id, entry] of Object.entries(cached)) if (entry?.v === ENGINE_ENTRY_VERSION && entry.acc != null) { attempted.add(`${site}:${id}`); entries[id] = entry; done++; pgns.delete(`${site}:${id}`); }
        ids = candidates(site).slice(0, 40);
        if (!ids.length) continue;
        const source = new Map(rows().filter(r => r.site === site).map(r => [r.id, r]));
        const id = `${run}-${++sequence}`, deadlineMs = sample.every ? null : Math.max(1, AUTO_MINUTES * 60000 - spent);
        const job = {id, site, account: accounts[site], depth: depth.depth, budget: sample.id, deadlineMs, workers,
          rows: ids.map(key => { const row = source.get(key), pgn = pgns.get(`${site}:${key}`); return {id: row.id, t: row.t, me: row.me, ...(pgn ? {pgn} : {})}; })};
        let result;
        do {
          checkImport(signal);
          result = await sendMessage({type: 'profileEngine', action: 'start', job});
          if (!result?.ok && result?.reason === 'busy') {
            const other = await store.loadJob();
            if (!other || now() - other.updatedAt > 180000) throw Error('The accuracy engine is unavailable. Try again.');
            onProgress({done, failed, remaining: ids.length, etaMs: null, collecting, waiting: true});
            await importDelay(500, signal);
          }
        } while (!result?.ok && result?.reason === 'busy');
        if (!result?.ok) throw Error('The accuracy check could not start. ' + (result?.reason || 'Try again.'));
        active = id;
        if (signal?.aborted) { await sendMessage({type: 'profileEngine', action: 'cancel', id}); checkImport(signal); }
        for (const key of ids) attempted.add(`${site}:${key}`);
        let state, seen = false;
        const waitingSince = now();
        do {
          checkImport(signal);
          state = await store.loadJob();
          if (state?.id === id) {
            seen = true;
            progress(state);
            if (state.status !== 'running') break;
            if (now() - state.updatedAt > 180000) throw Error('The accuracy check stopped responding. Try again.');
          } else if (seen) throw Error('The accuracy check was replaced. Try again.');
          if (now() - waitingSince > 180000 && !seen) throw Error('The accuracy check did not start. Try again.');
          await importDelay(300, signal);
        } while (true);
        active = null;
        if (state.status !== 'done') throw Error(state.error || 'The accuracy check was interrupted. Try again.');
        done += state.done; failed += state.failed || 0; spent += Math.max(0, (state.finishedAt || now()) - state.startedAt);
        Object.assign(entries, await store.loadEngine(site, ids));
        for (const key of ids) pgns.delete(`${site}:${key}`);
        dirty = true; progress();
        if (!sample.every && spent >= AUTO_MINUTES * 60000) break;
      }
    }
  };
  const cancel = () => { if (active) sendMessage({type: 'profileEngine', action: 'cancel', id: active}).catch(() => {}); };
  signal?.addEventListener('abort', cancel, {once: true});
  return {
    entries,
    notify() { if (error) return; dirty = true; pending = pending.then(pump).catch(e => { error = e; }); },
    async finish() { collecting = false; this.notify(); await pending; if (error) cancel(); signal?.removeEventListener('abort', cancel); checkImport(signal); if (error) throw error; progress(); return {entries, done, failed}; },
  };
}

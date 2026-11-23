// Player profile — the budgeted engine sample (tier 2). Chooses which games a
// depth-8, single-line pass should look at, runs that pass with the same
// estimate-only engine discipline as the review-button previews, and hosts the
// job so it survives the review tab (offscreen document on Chrome, background
// page on Firefox). Every result is explicitly an estimate.
import {Engine} from '../../engine/uci.js';
import {PreviewPositions, finishedPreviewGame} from '../preview-analysis.js';
import {publicMoveQuality, publicGameAccuracy, expectedPoints} from '../public-scoring.js';
import {createImportRequest, checkImport, waitImport} from '../import-request.js';

export const ENGINE_ENTRY_VERSION = 1;
export const BUDGETS = [
  {id: 'quick', label: 'Quick', games: 40, minutes: 2},
  {id: 'standard', label: 'Standard', games: 150, minutes: 10},
  {id: 'deep', label: 'Deep', games: 400, minutes: 30},
];
export const budgetById = id => BUDGETS.find(b => b.id === id) || BUDGETS[1];
/** Accuracy-check depth, chosen when the profile is built. `ms` is a first guess per game until this computer has been measured. */
export const DEPTHS = [
  {id: 'fast', label: 'Fast', depth: 6, ms: 1400},
  {id: 'balanced', label: 'Balanced', depth: 8, ms: 2600},
  {id: 'deep', label: 'Deep', depth: 12, ms: 7500},
];
export const depthById = id => DEPTHS.find(d => d.id === id) || DEPTHS[1];
/**
 * Which games to check: every n-th game of the period. A time-capped "auto"
 * selection (every: null, AUTO_MINUTES) is still understood by selectSample and
 * the preparation queue, but is no longer offered; a saved 'auto' reads as Every game.
 */
export const AUTO_MINUTES = 6;
export const SAMPLES = [
  {id: 'all', label: 'Every game', every: 1},
  {id: '2', label: '1 in 2', every: 2},
  {id: '5', label: '1 in 5', every: 5},
  {id: '10', label: '1 in 10', every: 10},
];
/**
 * Minutes a check takes: `games` at `msPerGame` (measured on this computer when
 * known) over `workers` engines. Auto is capped at AUTO_MINUTES.
 */
export function estimateMinutes(games, msPerGame, {workers = 1, every = null} = {}) {
  const minutes = games * msPerGame / Math.max(1, workers) / 60000;
  return every ? minutes : Math.min(AUTO_MINUTES, minutes);
}
/** Indices 0..n-1 coarse to fine (0, n/2, n/4, 3n/4, …), so any prefix spans the whole range. */
export function spreadOrder(n) {
  const order = [], seen = new Uint8Array(n);
  let step = 1; while (step < n) step *= 2;
  for (; step >= 1; step /= 2) for (let i = 0; i < n; i += step) if (!seen[i]) { seen[i] = 1; order.push(i); }
  return order;
}

/**
 * Pick the games to analyse: pre-filtered candidates first (comebacks, chokes,
 * rival games, clean short wins), then a time-stratified fill so the accuracy
 * trend covers the whole period. Already-cached games cost nothing and are kept
 * out of the budget. Returns row ids in processing order.
 */
export function selectSample(rows, {games = 150, cached = new Set(), rivalName = null, every = undefined} = {}) {
  // Every n-th game, oldest first, spread order so a stopped check still covers the period.
  if (every) {
    const usable = rows.filter(r => !r.bot && r.n >= 10).sort((a, b) => a.t - b.t).filter((_, i) => i % every === 0);
    return spreadOrder(usable.length).map(i => usable[i]).filter(r => !cached.has(r.id)).slice(0, games).map(r => r.id);
  }
  // Auto (every === null): the interesting games first, then the whole period coarse to fine; the job's deadline decides how many.
  if (every === null) {
    const usable = rows.filter(r => !r.bot && r.n >= 10).sort((a, b) => a.t - b.t);
    const first = selectSample(rows, {games: 0, cached, rivalName});
    const seen = new Set(first);
    return [...first, ...spreadOrder(usable.length).map(i => usable[i].id).filter(id => !seen.has(id) && !cached.has(id))].slice(0, games);
  }
  const usable = rows.filter(r => !r.bot && r.n >= 10);
  const chosen = [], seen = new Set();
  const take = row => { if (row && !seen.has(row.id)) { seen.add(row.id); if (!cached.has(row.id)) chosen.push(row.id); } };
  const byLow = [...usable].filter(r => r.res === 'w' && r.matMin <= -3).sort((a, b) => a.matMin - b.matMin).slice(0, 4);
  const byHigh = [...usable].filter(r => r.res !== 'w' && r.matMax >= 3).sort((a, b) => b.matMax - a.matMax).slice(0, 4);
  const clean = [...usable].filter(r => r.res === 'w' && r.matMin >= 0 && r.myMoves >= 20).sort((a, b) => a.n - b.n).slice(0, 4);
  const rival = rivalName ? usable.filter(r => r.opp.toLowerCase() === rivalName.toLowerCase()).sort((a, b) => b.t - a.t).slice(0, 8) : [];
  for (const row of [...byLow, ...byHigh, ...clean, ...rival]) take(row);
  // Stratified fill: walk the period in equal slices and take the newest unseen game of each.
  const sorted = [...usable].sort((a, b) => a.t - b.t);
  const remaining = Math.max(0, games - chosen.length);
  if (remaining && sorted.length) {
    const pool = sorted.filter(r => !seen.has(r.id));
    const step = pool.length / Math.max(1, Math.min(remaining, pool.length));
    for (let i = 0; i < Math.min(remaining, pool.length); i++) take(pool[Math.min(pool.length - 1, Math.floor(i * step))]);
  }
  return chosen;
}

class ProfileEngine extends Engine {
  constructor(prepared, scriptPath = 'engine/stockfish-nnue.js') {
    super(scriptPath);
    this.positionCommands = {get: (fen, history) => prepared.command(fen, history), clear() {}};
  }
  _send(command) {
    if (command === 'ucinewgame') { if (this.started) return; this.started = true; }
    super._send(command);
  }
}

/**
 * Depth-8 single-line pass over one finished game from `me`'s perspective.
 * Returns an engine entry: accuracy for both sides, the player's winning-chance
 * curve, its extremes with FENs, and the count of big drops.
 */
export async function analyseProfileGame(pgn, me, {signal, createEngine = prepared => new ProfileEngine(prepared), budgetMs = 9000, depth = 8,
  loadCalibration = async () => (await fetch(new URL('../../data/calibration.json', import.meta.url))).json()} = {}) {
  const request = createImportRequest(signal, budgetMs), started = performance.now();
  const check = () => { checkImport(request.signal); if (performance.now() - started > budgetMs) throw Error('Profile sample timed out'); };
  const wait = promise => waitImport(promise, request.signal);
  let engine;
  const stop = () => engine?.terminate();
  request.signal.addEventListener('abort', stop, {once: true});
  try {
    check();
    const parsed = finishedPreviewGame(pgn), prepared = new PreviewPositions(parsed.moves, check);
    engine = createEngine(prepared); check();
    const calibration = await wait(loadCalibration()); check();
    await wait(engine.setOptions({Hash: 16, 'Skill Level': 20, UCI_LimitStrength: false, UCI_ShowWDL: true, UCI_Chess960: false}));
    const decisions = {w: [], b: []}, curve = [];
    let blunders = 0, min = null, max = null;
    for (let i = 0; i < prepared.roots.length; i++) {
      const root = prepared.roots[i];
      check();
      if (root.forced) continue;
      const options = {requireExact: true, cold: false, budget: {kind: 'depth', value: depth}};
      let best;
      try { best = await wait(engine.analyse(root.fen, depth, 1, root.history, null, options)); }
      catch (error) { check(); if (!error.scoringMove) throw error; best = await wait(engine.analyse(root.fen, depth, 1, root.history, null, {...options, searchMove: error.scoringMove})); }
      const top = best.bestmove === root.played;
      const played = top ? best : await wait(engine.analyse(root.fen, depth, 1, root.history, null, {...options, searchMove: root.played}));
      const quality = publicMoveQuality(best.score, played.score, calibration.quality, {top});
      decisions[root.color].push(quality);
      let ep;
      try { ep = expectedPoints(best.score, calibration.quality.outcome); } catch { continue; }
      const mine = root.color === me;
      const win = Math.round(100 * (mine ? ep : 1 - ep));
      curve.push({ply: i + 1, win});
      if (mine) {
        if (!min || win < min.win) min = {win, ply: i + 1, fen: root.fen};
        if (!max || win > max.win) max = {win, ply: i + 1, fen: root.fen};
        let playedEp = ep;
        try { playedEp = expectedPoints(played.score, calibration.quality.outcome); } catch {}
        if (ep - playedEp >= 0.2) blunders++;
      }
    }
    check();
    const sampled = curve.length > 32 ? curve.filter((_, i) => i % Math.ceil(curve.length / 32) === 0 || i === curve.length - 1) : curve;
    return {v: ENGINE_ENTRY_VERSION, depth, estimated: true, acc: round(publicGameAccuracy(decisions[me])), oppAcc: round(publicGameAccuracy(decisions[me === 'w' ? 'b' : 'w'])),
      n: decisions[me].length, blunders, minWin: min?.win ?? null, minPly: min?.ply ?? null, fenMin: min?.fen ?? '', maxWin: max?.win ?? null, maxPly: max?.ply ?? null, fenMax: max?.fen ?? '',
      curve: sampled.map(p => [p.ply, p.win])};
  } finally { request.dispose(); request.signal.removeEventListener('abort', stop); engine?.terminate(); }
}
const round = v => v == null ? null : Math.round(v * 10) / 10;

/**
 * Job host. One job at a time; progress is written to the store's job record so
 * any tab can follow it through storage.onChanged. `loadPgn(site, row)` fetches a
 * game's PGN (cached months, Lichess export); `workers` engines run in parallel.
 */
export function createProfileEngineHost({store, loadPgn, analyse = analyseProfileGame, workers = 1, onBusy = () => {}, now = () => Date.now()}) {
  let current = null;
  async function run(job, controller) {
    const started = now();
    const lanes = Math.max(1, Math.min(4, Number(job.workers) || workers, job.rows.length || 1));
    const depth = Math.max(4, Math.min(16, Number(job.depth) || 8)), deadline = job.deadlineMs ? started + job.deadlineMs : Infinity;
    const state = {id: job.id, status: 'running', site: job.site, account: job.account, budget: job.budget, depth, deadlineMs: job.deadlineMs || null, total: job.rows.length, done: 0, skipped: 0, failed: 0, startedAt: started, updatedAt: started, perGameMs: null, workers: lanes};
    const write = async () => { state.updatedAt = now(); await store.saveJob({...state}); };
    await write();
    const queue = [...job.rows];
    let timings = [];
    const worker = async () => {
      while (queue.length) {
        checkImport(controller.signal);
        // An automatic check stops at its time budget; what finished is kept.
        if (now() >= deadline) { queue.length = 0; break; }
        const row = queue.shift();
        const cached = await store.loadEngine(job.site, [row.id]);
        // A game checked before at this depth or deeper (or at an unrecorded one) is kept; a shallower result is checked again at this depth.
        if (cached[row.id]?.v === ENGINE_ENTRY_VERSION && (cached[row.id].depth ?? Infinity) >= depth) { state.skipped++; state.done++; await write(); continue; }
        const t0 = now();
        try {
          const pgn = row.pgn || await loadPgn(job.site, row, controller.signal, job.account);
          checkImport(controller.signal);
          if (!pgn) throw Error('No PGN');
          const entry = await analyse(pgn, row.me, {signal: controller.signal, depth, budgetMs: Math.max(9000, depth * 1500)});
          await store.saveEngine(job.site, row.id, {...entry, t: row.t});
          timings.push(now() - t0);
        } catch (error) {
          checkImport(controller.signal);
          state.failed++;
        }
        state.done++;
        if (timings.length) state.perGameMs = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length / lanes);
        await write();
      }
    };
    try {
      await Promise.all(Array.from({length: Math.min(lanes, queue.length || 1)}, worker));
      if (now() >= deadline) state.total = state.done;
      state.status = 'done';
    } catch (error) {
      state.status = controller.signal.aborted ? 'cancelled' : 'error';
      state.error = error?.message || String(error);
    }
    state.finishedAt = now();
    await write();
    return state;
  }
  return {
    async start(job) {
      if (current) return {ok: false, reason: 'busy'};
      if (!job || !Array.isArray(job.rows) || !job.rows.length) return {ok: false, reason: 'empty'};
      const controller = new AbortController();
      current = {controller, job};
      onBusy(true);
      current.promise = run(job, controller).finally(() => { current = null; onBusy(false); });
      return {ok: true, total: job.rows.length};
    },
    cancel(id) { if (!current || (id && current.job.id !== id)) return {ok: false}; current.controller.abort(); return {ok: true}; },
    status() { return current ? {active: true, site: current.job.site, account: current.job.account} : {active: false}; },
    get active() { return !!current; },
    async finished() { return current ? current.promise : null; },
  };
}

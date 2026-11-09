import {normalizePuzzleRating} from './puzzle-rating.js';
export const PROGRESS_KEY = 'learning:v1';
const blank = () => ({schema:1, lessons:{}, openings:{}, puzzles:{}, puzzleTimeMs:0, puzzleRating:normalizePuzzleRating(null), puzzleRatingEnabled:true, challenges:[], bests:{}, runStats:Object.fromEntries(RUN_STAT_MODES.map(mode=>[mode,blankRunStats()])), resume:null, puzzleResume:null});
export const RUN_STAT_MODES = ['timeAttack','knockout'];
const count = n => Number.isSafeInteger(n) && n > 0 ? n : 0;
const blankRunStats = () => ({runs:0, solved:0, attempted:0, topRating:0, timeMs:0});
function normalizeRunStats(value) {
  const stats = blankRunStats();
  for (const key of ['runs','solved','attempted','topRating']) stats[key] = count(value?.[key]);
  stats.timeMs = Number.isFinite(value?.timeMs) && value.timeMs > 0 ? value.timeMs : 0;
  stats.solved = Math.min(stats.solved, stats.attempted);
  return stats;
}
// Lifetime totals per run mode. The challenge log only keeps the last 100 runs
// across every mode, so totals are kept separately and seeded once from that log.
export function recordRunStats(progress, mode, run) {
  const stats = progress.runStats[mode] = normalizeRunStats(progress.runStats[mode]);
  const results = Array.isArray(run.results) ? run.results : [];
  if (!results.length) return stats;
  stats.runs++; stats.attempted += results.length; stats.solved += results.filter(r=>r.correct).length;
  for (const r of results) if (r.correct && Number.isSafeInteger(r.rating)) stats.topRating = Math.max(stats.topRating, r.rating);
  return stats;
}
export function normalizeProgress(value) {
  if (!value || value.schema !== 1) return blank();
  const normalized = blank();
  for (const key of ['lessons','openings','puzzles','bests']) if (value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])) normalized[key] = value[key];
  normalized.challenges = Array.isArray(value.challenges) ? value.challenges.slice(-100) : [];
  if (value.runStats && typeof value.runStats === 'object' && !Array.isArray(value.runStats)) {
    for (const mode of RUN_STAT_MODES) normalized.runStats[mode] = normalizeRunStats(value.runStats[mode]);
  } else {
    for (const run of normalized.challenges) if (RUN_STAT_MODES.includes(run?.mode)) recordRunStats(normalized, run.mode, run);
  }
  normalized.resume = value.resume && typeof value.resume === 'object' ? value.resume : null;
  const puzzleResume = value.puzzleResume ?? (normalized.resume?.kind === 'puzzle' ? normalized.resume : null);
  normalized.puzzleResume = puzzleResume?.kind === 'puzzle' ? puzzleResume : null;
  normalized.puzzleRating = normalizePuzzleRating(value.puzzleRating);
  normalized.puzzleRatingEnabled = value.puzzleRatingEnabled !== false;
  normalized.puzzleTimeMs = Number.isFinite(value.puzzleTimeMs) && value.puzzleTimeMs > 0 ? value.puzzleTimeMs : 0;
  return normalized;
}
const pendingByStorage = new WeakMap();
export class ProgressStore {
  constructor(storage, locks = globalThis.navigator?.locks) {
    this.storage = storage; this.locks = locks; this.value = blank(); this.queue = Promise.resolve(); this.error = null;
    if (!pendingByStorage.has(storage)) pendingByStorage.set(storage, {changes:[], retry:null, warning:null});
    this.pending = pendingByStorage.get(storage);
  }
  async load() {try {this.value = normalizeProgress((await this.storage.get(PROGRESS_KEY))[PROGRESS_KEY]); this.error = null;} catch (error) {this.error = error;} return this.value;}
  async update(change) {
    const commit = async () => {
      const latest = normalizeProgress((await this.storage.get(PROGRESS_KEY))[PROGRESS_KEY]);
      change(latest);
      await this.storage.set({[PROGRESS_KEY]:latest}); this.value = latest; this.error = null;
      return latest;
    };
    const job = () => this.locks?.request ? this.locks.request('chess-review-learning', commit) : commit();
    const pending = this.queue.then(job, job);
    this.queue = pending.catch(error => {this.error = error;});
    return pending;
  }
}
export function recordPuzzle(progress, id, attempt) {
  const p = progress.puzzles[id] ||= {clean:0, assisted:0, mistakes:0, attempts:0, struggled:false};
  p.attempts++; p.mistakes += attempt.mistakes || 0;
  if (attempt.completed) {
    if (attempt.assisted) p.assisted++;
    else if (attempt.mistakes) p.recovered = (p.recovered || 0) + 1;
    else p.clean++;
  }
  if (attempt.mistakes || attempt.skipped || attempt.assisted) p.struggled = true;
  else if (attempt.completed) p.struggled = false;
  p.last = {...attempt, at:Date.now()};
}
export function progressTotals(progress) {
  const puzzles = Object.values(progress.puzzles);
  return {unique:puzzles.filter(p=>p.clean>0).length, repeats:puzzles.reduce((n,p)=>n+Math.max(0,p.clean-1),0), assisted:puzzles.reduce((n,p)=>n+p.assisted,0),
    lessons:Object.values(progress.lessons).filter(l=>l.status === 'completed').length,
    openings:Object.values(progress.openings).filter(o=>o.status === 'completed').length};
}
// Monotonic active-time accounting. Loading, validation and saving are excluded;
// thinking time, wrong answers, hints and switching tabs continue to consume time.
export class ChallengeClock {
  constructor(seconds, now = () => performance.now()) {this.seconds = seconds; this.now = now; this.remainingMs = seconds*1000; this.runningAt = null; this.started = false;}
  ready() {if (this.runningAt !== null || this.remainingMs <= 0) return; this.started = true; this.runningAt = this.now();}
  pause() {if (this.runningAt !== null) {this.remainingMs = this.remaining(); this.runningAt = null;}}
  remaining() {return Math.max(0, this.remainingMs - (this.runningAt === null ? 0 : this.now()-this.runningAt));}
  expired() {return this.started && this.remaining() <= 0;}
}
export function challengeResult(run, previousBest = 0) {
  const attempts = run.correctMoves + run.mistakes;
  return {duration:run.duration, solved:run.solved, assisted:run.assisted, mistakes:run.mistakes, skips:run.skips,
    accuracy:attempts ? Math.round(100*run.correctMoves/attempts) : 0, best:Math.max(previousBest,run.solved), personalBest:run.solved > previousBest,
    missed:[...new Set(run.missed)], at:Date.now()};
}

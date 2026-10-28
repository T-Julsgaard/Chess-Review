export const PUZZLE_RUN_MODES = {
  timeAttack: {name:'Time attack', duration:180, lives:3, ratingStep:40, description:'3 minutes · 3 lives'},
  knockout: {name:'Knockout', duration:null, lives:1, ratingStep:25, description:'No timer · 1 life'}
};

// Keep a steady climb through the opening, with a gentler pace for Knockout.
export function runPuzzleRating(index, mode = 'timeAttack') {
  return Math.min(3000, 450 + index * PUZZLE_RUN_MODES[mode].ratingStep);
}

export function pickRunPuzzle(puzzles, results = [], mode = 'timeAttack', random = Math.random) {
  const seen = new Set(results.map(r=>r.id));
  const available = puzzles.filter(p=>!seen.has(p.id));
  if (!available.length) return null;
  const previous = results.at(-1)?.rating || 0;
  const target = Math.max(previous, runPuzzleRating(results.length, mode));
  const rising = available.filter(p=>p.rating >= previous);
  let pool = rising.length ? rising : available;
  if (results.length < 8 && pool.some(p=>p.rating <= 800)) pool = pool.filter(p=>p.rating <= 800);
  let distance = Infinity;
  for (const puzzle of pool) distance = Math.min(distance, Math.abs(puzzle.rating-target));
  // Wider variation can ratchet ratings upward faster than the intended step.
  const variation = PUZZLE_RUN_MODES[mode].ratingStep;
  let candidates = pool.filter(p=>Math.abs(p.rating-target) <= distance + variation);
  if (results.length < 8 && candidates.some(p=>p.solution.length <= 3)) candidates = candidates.filter(p=>p.solution.length <= 3);
  return candidates[Math.min(candidates.length-1, Math.floor(random()*candidates.length))];
}

export function runBest(progress, mode) {
  const best = progress.bests[mode];
  return Number.isSafeInteger(best) && best > 0 ? best : 0;
}

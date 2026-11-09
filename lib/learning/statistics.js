import {THEME_NAMES} from './content.js';
import {normalizePuzzleRating} from './puzzle-rating.js';
import {RUN_STAT_MODES} from './progress.js';

export const RECENT_RUNS = 10;

export function formatDuration(ms) {
  const seconds=Math.floor(Math.max(0,ms||0)/1000),minutes=Math.floor(seconds/60),hours=Math.floor(minutes/60);
  return hours?`${hours}h ${minutes%60}m ${seconds%60}s`:minutes?`${minutes}m ${seconds%60}s`:`${seconds}s`;
}

const runTime = progress => RUN_STAT_MODES.reduce((sum,mode)=>sum+(progress.runStats?.[mode]?.timeMs||0),0);

// Solve a puzzle: rating, accuracy and pattern breakdown. Time attributed to
// runs is excluded; time saved before runs were tracked separately stays here.
export function solveStatistics(progress, puzzles) {
  const stats=puzzleStatistics(progress,puzzles),rating=normalizePuzzleRating(progress.puzzleRating);
  let peak=rating.elo;
  for (const record of Object.values(progress.puzzles)) {
    const after=record?.ratingResult?.after;
    if (Number.isSafeInteger(after)) peak=Math.max(peak,after);
  }
  const timeMs=Math.max(0,(progress.puzzleTimeMs||0)-runTime(progress));
  return {...stats,rating,peak,timeMs,timePerAttempt:stats.attempts?timeMs/stats.attempts:null};
}

// Time attack and Knockout: lifetime totals plus the most recent scores.
export function runStatistics(progress, mode) {
  const totals=progress.runStats?.[mode]||{runs:0,solved:0,attempted:0,topRating:0,timeMs:0};
  const best=Number.isSafeInteger(progress.bests?.[mode])&&progress.bests[mode]>0?progress.bests[mode]:0;
  const recent=(progress.challenges||[]).filter(run=>run?.mode===mode&&Array.isArray(run.results)&&run.results.length)
    .slice(-RECENT_RUNS).map(run=>({solved:run.results.filter(r=>r.correct).length,attempted:run.results.length,at:run.at}));
  // The personal best matches the ticket: only runs over the full library count.
  return {...totals,best,
    average:totals.runs?totals.solved/totals.runs:null,
    rate:totals.attempted?totals.solved/totals.attempted:null,
    timePerRun:totals.runs?totals.timeMs/totals.runs:null,recent};
}

// Count finished attempts, not wrong moves. A retry can contain several wrong
// moves but still contributes only one result to each of its puzzle's types.
export function puzzleStatistics(progress, puzzles) {
  const types = Object.entries(THEME_NAMES).map(([theme,name])=>({theme,name,attempts:0,clean:0}));
  const byTheme = new Map(types.map(type=>[type.theme,type]));
  let attempts=0,clean=0;
  for (const puzzle of puzzles) {
    const record=progress.puzzles[puzzle.id];
    if (!record) continue;
    const count=Number.isSafeInteger(record.attempts)&&record.attempts>0?record.attempts:0;
    const solved=Number.isSafeInteger(record.clean)&&record.clean>0?Math.min(count,record.clean):0;
    attempts+=count;clean+=solved;
    for (const theme of new Set(puzzle.themes)) {
      const type=byTheme.get(theme);
      if (type) {type.attempts+=count;type.clean+=solved;}
    }
  }
  for (const type of types) {
    type.needsWork=type.attempts-type.clean;
    type.rate=type.attempts?type.clean/type.attempts:null;
  }
  types.sort((a,b)=>(a.rate===null)-(b.rate===null)||(b.rate??0)-(a.rate??0)||b.attempts-a.attempts||a.name.localeCompare(b.name));
  // A single result isn't a pattern. Highlights need at least three attempts;
  // equally performing types aren't presented as opposing strengths/weaknesses.
  const established=types.filter(type=>type.attempts>=3);
  const weakest=[...established].sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts||a.name.localeCompare(b.name))
    .find(type=>type.rate<1)||null;
  const strongest=established.find(type=>type.rate>0&&(!weakest||type.rate>weakest.rate))||null;
  return {attempts,clean,needsWork:attempts-clean,rate:attempts?clean/attempts:null,types,weakest,strongest};
}

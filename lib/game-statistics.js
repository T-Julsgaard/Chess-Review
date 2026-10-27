import {publicGameAccuracy, sf19GameAccuracy, expectedPoints, SF19_OUTCOME} from './public-scoring.js';

export const GAME_PHASES = ['opening', 'middlegame', 'endgame'];

// Independent, deliberately simple board-based division, inspired by Lichess's
// Divider: https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Divider.scala
// At most ten non-pawn pieces, or a back rank with fewer than four friendly
// pieces, ends the opening. At most six non-pawn pieces starts the endgame.
// Classify the position BEFORE the decision; phases never go backwards, even
// after a promotion. Custom FENs can start directly in a later phase.
export function gamePhases(positions) {
  let phase = 0;
  return positions.map(position => {
    const ranks = position.fen.split(' ')[0].split('/');
    const pieces = (ranks.join('').match(/[nbrq]/gi) || []).length;
    const whiteHome = (ranks[7].match(/[A-Z]/g) || []).length;
    const blackHome = (ranks[0].match(/[a-z]/g) || []).length;
    if (pieces <= 6) phase = 2;
    else if (pieces <= 10 || whiteHome < 4 || blackHome < 4) phase = Math.max(phase, 1);
    return GAME_PHASES[phase];
  });
}

function accuracy(moves, complete) {
  const engines = new Set(moves.map(move => move.engine));
  if (!complete || engines.size !== 1) return null;
  return engines.has('sf19lite') ? sf19GameAccuracy(moves) : publicGameAccuracy(moves);
}

// Reuse the scored decisions; never re-search, infer missing evidence, or mix
// mate distances into centipawn statistics. Root scores are mover-relative.
export function gameStatistics(positions, bests, calibrated, {classifications = [], clocks = [], headers = {}, evals = []} = {}) {
  const phases = gamePhases(positions), result = {}, clock = clockAdvantage(positions, clocks, headers);
  const complete = ['w', 'b'].every(color => calibrated?.[color]?.complete)
    && new Set(['w', 'b'].flatMap(color => (calibrated?.[color]?.moves || []).map(move => move.engine))).size === 1;
  for (const color of ['w', 'b']) {
    const side = calibrated?.[color], moves = side?.moves || [];
    const phaseStats = Object.fromEntries(GAME_PHASES.map(phase => {
      const plies = positions.flatMap((position, ply) => ply > 0 && position.color === color && phases[ply - 1] === phase ? [ply] : []);
      const included = new Set(plies), scored = moves.filter(move => included.has(move.ply));
      return [phase, {moves: plies.length, complete: scored.length === plies.length,
        decisions: scored.filter(move => move.eligible).length,
        accuracy: accuracy(scored, plies.length > 0 && scored.length === plies.length)}];
    }));
    const eligible = moves.filter(move => move.eligible), losses = [];
    let matches = 0;
    for (const move of eligible) {
      const position = positions[move.ply], root = bests[move.ply - 1];
      const top = root?.bestmove === position.from + position.to + (position.promotion || '');
      matches += Number(top);
      const best = root?.score, played = top ? best : root?.playedScore;
      if (best?.mate == null && played?.mate == null && Number.isFinite(best?.cp) && Number.isFinite(played?.cp)) {
        losses.push({ply: move.ply, loss: Math.max(0, best.cp - played.cp)});
      }
    }
    const ready = side?.complete && new Set(moves.map(move => move.engine)).size === 1;
    const largest = losses.reduce((max, move) => !max || move.loss > max.loss ? move : max, null);
    result[color] = {phases: phaseStats, decisions: eligible.length,
      cpMoves: ready ? losses.length : 0,
      averageCpLoss: ready && losses.length ? losses.reduce((sum, move) => sum + move.loss, 0) / losses.length : null,
      topMatch: ready && eligible.length ? 100 * matches / eligible.length : null,
      largestLoss: ready ? largest : null,
      cleanStreak: ready ? longestCleanStreak(positions, moves, classifications, color) : null,
      timeAhead: clock && {...clock, percent: 100 * clock.ahead[color] / clock.seconds},
      comeback: complete ? comebackRecovery(evals, positions.length, headers.Result, color) : null};
  }
  return result;
}

const CLEAN = new Set(['brilliant', 'great', 'best', 'excellent', 'good', 'book']);
function longestCleanStreak(positions, moves, classifications, color) {
  const scored = new Map(moves.map(move => [move.ply, move]));
  let best = {count: 0, startPly: null, endPly: null}, run = {...best}, decisions = 0;
  for (let ply = 1; ply < positions.length; ply++) {
    if (positions[ply].color !== color) continue;
    const move = scored.get(ply);
    if (!move) return null;
    if (!move.eligible) continue; // Forced replies neither add to nor break a run.
    if (!classifications[ply]) return null;
    decisions++;
    if (!CLEAN.has(classifications[ply])) { run = {count: 0, startPly: null, endPly: null}; continue; }
    run = {count: run.count + 1, startPly: run.startPly ?? ply, endPly: ply};
    if (run.count > best.count) best = {...run};
  }
  return decisions ? best : null;
}

function clockSeconds(value) {
  if (typeof value !== 'string' || !/^\d+(?::\d{1,2}){1,2}(?:\.\d+)?$/.test(value)) return null;
  const parts = value.split(':').map(Number);
  if (parts.slice(1).some(part => part >= 60)) return null;
  return parts.reduce((sum, part) => sum * 60 + part, 0);
}

// Integrate clock leads over recorded thinking time, splitting a turn at the
// exact crossover. Adding an increment consumes no time. Never bridge missing
// clock tags or infer initial time for a custom starting position.
function clockAdvantage(positions, clocks, headers) {
  const control = /^(\d+)(?:\+(\d+))?$/.exec(String(headers.TimeControl || ''));
  if (!control || Number(control[1]) <= 0) return null;
  const base = Number(control[1]), increment = Number(control[2] || 0);
  const initial = !headers.FEN && headers.SetUp !== '1'
    && positions[0]?.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const last = {w: initial ? base : null, b: initial ? base : null};
  const ahead = {w: 0, b: 0};
  let seconds = 0, turns = 0;
  for (let ply = 1; ply < positions.length; ply++) {
    const side = positions[ply].color, opponent = side === 'w' ? 'b' : 'w';
    const after = clockSeconds(clocks[ply]), before = last[side], other = last[opponent];
    if (after != null && before != null && other != null) {
      const spent = before + increment - after;
      if (spent > 0 && spent <= before) {
        const lead = Math.max(0, Math.min(spent, before - other));
        ahead[side] += lead; ahead[opponent] += spent - lead;
        seconds += spent; turns++;
      }
    }
    last[side] = after;
  }
  return seconds ? {ahead, seconds, turns, totalTurns: Math.max(0, positions.length - 1)} : null;
}

// This is an original recovery measure, not a rating or a win probability.
// A deficit must reach <=35% expected score. Credit only the recovery still
// present at the finish; a declared loss always scores zero.
function comebackRecovery(evals, length, result, color) {
  if (length < 2 || evals.length < length) return null;
  const points = [];
  for (let ply = 0; ply < length; ply++) {
    try {
      const value = expectedPoints(evals[ply], SF19_OUTCOME);
      points.push(color === 'w' ? value : 1 - value);
    } catch { return null; }
  }
  let finish = points.at(-1);
  if (result === '1-0') finish = color === 'w' ? 1 : 0;
  else if (result === '0-1') finish = color === 'b' ? 1 : 0;
  else if (result === '1/2-1/2') finish = .5;
  const worst = Math.min(...points), ply = points.indexOf(worst);
  return {score: worst <= .35 ? Math.max(0, Math.min(100, 100 * (finish - worst))) : 0,
    worst, finish, ply, hadDeficit: worst <= .35, finalResult: ['1-0', '0-1', '1/2-1/2'].includes(result)};
}

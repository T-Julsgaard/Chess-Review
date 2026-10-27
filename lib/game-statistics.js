import {publicGameAccuracy, sf19GameAccuracy} from './public-scoring.js';

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
export function gameStatistics(positions, bests, calibrated, {classifications = [], clocks = [], headers = {}} = {}) {
  const phases = gamePhases(positions), result = {}, clock = clockStatistics(positions, clocks, headers);
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
      clock: clock[color],
      insights: ready ? decisionInsights(bests, moves, classifications) : null,
      activity: activityStatistics(positions, color)};
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

// Compare after each pair of turns, so each player has moved once. Missing
// pairs are skipped, ties count for neither side, and increments are already
// included in the recorded remaining clocks. This is a share of checkpoints,
// not a reconstruction of wall-clock seconds.
function clockStatistics(positions, clocks, headers) {
  const control = /^(\d+)(?:\+(\d+))?$/.exec(String(headers.TimeControl || ''));
  const base = control && Number(control[1]), increment = control ? Number(control[2] || 0) : null;
  const initial = !headers.FEN && headers.SetUp !== '1'
    && positions[0]?.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const last = {w: initial && base > 0 ? base : null, b: initial && base > 0 ? base : null};
  const rows = {w: [], b: []}, ahead = {w: 0, b: 0}, largestLead = {w: null, b: null};
  let samples = 0;
  for (let ply = 1; ply < positions.length; ply++) {
    const side = positions[ply].color, after = clockSeconds(clocks[ply]), before = last[side];
    if (increment != null && before != null && after != null) {
      const seconds = before + increment - after;
      if (seconds >= 0 && seconds <= before) rows[side].push({ply, seconds});
    }
    last[side] = after;
    if (ply % 2 !== 0 || positions[ply - 1].color === side) continue;
    const previous = clockSeconds(clocks[ply - 1]);
    if (previous == null || after == null) continue;
    const values = {[side]: after, [positions[ply - 1].color]: previous};
    samples++;
    for (const color of ['w', 'b']) {
      const lead = values[color] - values[color === 'w' ? 'b' : 'w'];
      if (lead > 0) ahead[color]++;
      if (!largestLead[color] || lead > largestLead[color].seconds) largestLead[color] = {seconds: Math.max(0, lead), ply};
    }
  }
  return Object.fromEntries(['w', 'b'].map(color => {
    const turns = rows[color], longest = turns.reduce((best, row) => !best || row.seconds > best.seconds ? row : best, null);
    return [color, {advantage: samples ? {percent: 100 * ahead[color] / samples, ahead: ahead[color], samples,
      total: Math.floor((positions.length - 1) / 2)} : null,
      largestLead: largestLead[color], thinkMoves: turns.length,
      averageThink: turns.length ? turns.reduce((sum, row) => sum + row.seconds, 0) / turns.length : null, longestThink: longest}];
  }));
}

function decisionInsights(bests, moves, classifications) {
  const eligible = [...moves].filter(move => move.eligible).sort((a, b) => a.ply - b.ply);
  const sample = decisions => ({accuracy: accuracy(decisions, decisions.length > 0), count: decisions.length});
  const byPosition = predicate => sample(eligible.filter(move => {
    const score = bests[move.ply - 1]?.score;
    return score?.mate == null && Number.isFinite(score?.cp) && predicate(score.cp);
  }));
  let bestStretch = null;
  for (let i = 0; i + 5 <= eligible.length; i++) {
    const sequence = eligible.slice(i, i + 5), value = accuracy(sequence, true);
    if (!bestStretch || value > bestStretch.accuracy) bestStretch = {accuracy: value, startPly: sequence[0].ply, endPly: sequence.at(-1).ply};
  }
  const classified = eligible.every(move => classifications[move.ply]);
  return {cleanShare: eligible.length && classified ? 100 * eligible.filter(move => CLEAN.has(classifications[move.ply])).length / eligible.length : null,
    bestStretch, balanced: byPosition(cp => Math.abs(cp) < 100), winning: byPosition(cp => cp >= 100),
    defending: byPosition(cp => cp <= -100), lastTen: sample(eligible.slice(-10)),
    decisions: eligible.length};
}

function activityStatistics(positions, color) {
  const moves = positions.map((position, ply) => ({...position, ply})).filter(position => position.ply > 0 && position.color === color);
  const pieces = new Map();
  for (const move of moves) {
    const piece = /^[KQRBN]/.exec(move.san || '')?.[0] || (/^O-O/.test(move.san || '') ? 'K' : 'P');
    pieces.set(piece, (pieces.get(piece) || 0) + 1);
  }
  const active = [...pieces].sort((a, b) => b[1] - a[1])[0];
  return {checks: moves.filter(move => /[+#]$/.test(move.san || '')).length,
    captures: moves.filter(move => move.captured || (move.san || '').includes('x')).length,
    castled: moves.find(move => /^O-O/.test(move.san || ''))?.ply ?? null,
    activePiece: active ? {piece: active[0], moves: active[1]} : null};
}

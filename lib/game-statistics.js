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
export function gameStatistics(positions, bests, calibrated, {classifications = [], clocks = [], headers = {}, annotations = bests} = {}) {
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
      replies: ready ? replyInsights(positions, moves, classifications, color) : null,
      critical: ready ? criticalDecisions(positions, annotations, eligible) : null,
      timing: ready ? timingInsights(eligible, clock[color], clock.base) : null};
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
  const remaining = {w: new Map(), b: new Map()};
  let samples = 0;
  for (let ply = 1; ply < positions.length; ply++) {
    const side = positions[ply].color, after = clockSeconds(clocks[ply]), before = last[side];
    if (before != null) remaining[side].set(ply, before);
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
  const result = Object.fromEntries(['w', 'b'].map(color => {
    const turns = rows[color], longest = turns.reduce((best, row) => !best || row.seconds > best.seconds ? row : best, null);
    return [color, {advantage: samples ? {percent: 100 * ahead[color] / samples, ahead: ahead[color], samples,
      total: Math.floor((positions.length - 1) / 2)} : null,
      largestLead: largestLead[color], thinkMoves: turns.length,
      averageThink: turns.length ? turns.reduce((sum, row) => sum + row.seconds, 0) / turns.length : null, longestThink: longest,
      thinks: turns, remaining: remaining[color]}];
  }));
  result.base = base > 0 ? base : null;
  return result;
}

// Accuracy of the scored decisions a player made under three clock conditions:
// in time trouble (own clock below a tenth of the base time, or ten seconds if
// that is more), on snap moves (under five seconds of thinking) and on long
// thinks (at least twice the player's own average). Increments are already
// removed from thinking times. Each sample needs its own clock evidence; a
// missing time control leaves time trouble unavailable rather than guessed.
function timingInsights(eligible, clock, base) {
  const sample = decisions => ({accuracy: accuracy(decisions, decisions.length > 0), count: decisions.length});
  const thinks = new Map(clock.thinks.map(row => [row.ply, row.seconds]));
  const select = (source, predicate) => sample(eligible.filter(move => source.has(move.ply) && predicate(source.get(move.ply))));
  const average = clock.averageThink;
  return {pressure: base && clock.remaining.size ? select(clock.remaining, seconds => seconds < Math.max(10, base / 10)) : null,
    quick: thinks.size ? select(thinks, seconds => seconds < 5) : null,
    deep: thinks.size && average > 0 ? select(thinks, seconds => seconds >= 2 * average) : null};
}

const ERRORS = new Set(['inacc', 'mistake', 'miss', 'blunder']);
const CLEAR_ERRORS = new Set(['mistake', 'miss', 'blunder']);
const PUNISHING = new Set(['brilliant', 'great', 'best', 'excellent']);
// How a player answered errors: the share of the opponent's clear errors met
// with an Excellent-or-better reply, and the accuracy of the player's next
// decision after each of their own errors. Forced replies are skipped. A missing
// classification on a relevant move leaves the figure unavailable, never zero.
function replyInsights(positions, moves, classifications, color) {
  const scored = new Map(moves.map(move => [move.ply, move]));
  let punished = {found: 0, total: 0}, recoveries = [];
  for (let ply = 1; ply < positions.length; ply++) {
    const own = positions[ply].color === color;
    if (!own) {
      const reply = ply + 1;
      if (!positions[reply] || positions[reply].color !== color) continue;
      const move = scored.get(reply);
      if (!move) return {punished: null, recovery: null};
      if (!classifications[ply] || !classifications[reply]) { punished = null; continue; }
      if (!CLEAR_ERRORS.has(classifications[ply]) || !move.eligible) continue;
      if (punished) { punished.total++; punished.found += Number(PUNISHING.has(classifications[reply])); }
      continue;
    }
    const move = scored.get(ply);
    if (!move) return {punished: null, recovery: null};
    if (!move.eligible) continue;
    if (!classifications[ply]) { recoveries = null; continue; }
    if (!ERRORS.has(classifications[ply]) || !recoveries) continue;
    for (let next = ply + 1; next < positions.length; next++) {
      if (positions[next].color !== color) continue;
      const later = scored.get(next);
      if (!later) return {punished: null, recovery: null};
      if (later.eligible) { recoveries.push(later); break; }
    }
  }
  return {punished, recovery: recoveries
    ? {accuracy: accuracy(recoveries, recoveries.length > 0), count: recoveries.length} : null};
}

// Critical decisions: the engine's first choice beats its second by at least a
// pawn, so one move mattered. The roots are the multi-line annotation searches
// (the same evidence that decides Great), indexed like bests. Every scored
// decision needs both lines with centipawn scores; a review searched with one
// line, or one whose background searches are still running, is unavailable.
function criticalDecisions(positions, roots, eligible) {
  const result = {found: 0, total: 0};
  for (const move of eligible) {
    const root = roots[move.ply - 1], lines = root?.lines || [];
    const top = lines.find(line => line.multipv === 1), next = lines.find(line => line.multipv === 2);
    if (!top || !next) return null;
    if (top.score?.mate != null || next.score?.mate != null || !Number.isFinite(top.score?.cp) || !Number.isFinite(next.score?.cp)) continue;
    if (top.score.cp - next.score.cp < 100) continue;
    const position = positions[move.ply], topMove = (top.pv || '').split(' ')[0] || root.bestmove;
    result.total++;
    result.found += Number(topMove === position.from + position.to + (position.promotion || ''));
  }
  return result;
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
    defending: byPosition(cp => cp <= -100),
    decisions: eligible.length};
}

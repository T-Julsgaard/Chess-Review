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
export function gameStatistics(positions, bests, calibrated) {
  const phases = gamePhases(positions), result = {};
  for (const color of ['w', 'b']) {
    const side = calibrated?.[color], moves = side?.moves || [];
    const phaseStats = Object.fromEntries(GAME_PHASES.map(phase => {
      const plies = positions.flatMap((position, ply) => ply > 0 && position.color === color && phases[ply - 1] === phase ? [ply] : []);
      const included = new Set(plies), scored = moves.filter(move => included.has(move.ply));
      return [phase, {moves: plies.length, decisions: scored.filter(move => move.eligible).length,
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
      largestLoss: ready ? largest : null};
  }
  return result;
}

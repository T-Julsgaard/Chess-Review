import {Chess} from './chess.js';
import {engineExpectedPoints, publicMoveQuality, publicGameAccuracy, contextualRating, movesOnlyRating} from './public-scoring.js';

const legalCounts = new WeakMap();
function legalCount(position) {
  const previous = legalCounts.get(position);
  if (previous?.fen === position.fen) return previous.count;
  const count = new Chess(position.fen).moves().length;
  legalCounts.set(position, {fen: position.fen, count});
  return count;
}

export function calibratedReview(positions, bests, calibration, players = {}, mode = 'context') {
  const result = {w: {moves: [], ratingMoves: []}, b: {moves: [], ratingMoves: []}};
  let fullContext = positions.length > 1;
  for (let i = 1; i < positions.length; i++) {
    const position = positions[i], root = bests[i - 1], tag = root?.calibration;
    const side = result[position.color];
    if (!side) throw Error('Missing mover color');
    const played = position.from + position.to + (position.promotion || '');
    const top = root?.bestmove === played, actual = top ? root?.score : root?.playedScore;
    const legalChoices = legalCount(positions[i - 1]), forced = legalChoices === 1;
    const valid = tag?.version === calibration?.version && actual;
    const depthModel = valid && tag.build === 'nnue' && tag.qualityVersion === calibration?.quality?.candidateVersion;
    fullContext &&= !!depthModel;
    let decision = null;
    try {
      if (depthModel) decision = publicMoveQuality(root.score, actual, calibration.quality, {top, forced});
      else if (valid && tag.build === 'sf19lite' && tag.nodes === 20000) {
        const residual = engineExpectedPoints(root.score) - engineExpectedPoints(actual), loss = forced || top ? 0 : Math.max(0, residual);
        decision = {quality: 100 * (1 - loss), loss, residual, eligible: !forced};
      }
    } catch { /* A missing/ambiguous observation contributes no numerical score. */ }
    if (decision) side.moves.push({ply: i, ...decision});
    const rating = root?.ratingEvidence, engine = tag?.build === 'sf19lite' ? 'sf19' : 'sf18';
    if (rating?.candidateVersion === calibration?.movesOnly?.[engine]?.candidateVersion) {
      try {
        const bestExpected = engineExpectedPoints(rating.best), playedExpected = engineExpectedPoints(rating.played);
        side.ratingMoves.push({ply: i, legalChoices, top: rating.bestmove === played, eligible: !forced, bestExpected,
          loss: forced || rating.bestmove === played ? 0 : Math.max(0, bestExpected - playedExpected), engine});
      } catch { /* Incomplete WDL evidence is not imputed. */ }
    }
  }
  for (const color of ['w', 'b']) {
    const side = result[color], total = positions.slice(1).filter(p => p.color === color).length;
    side.accuracy = publicGameAccuracy(side.moves);
    side.decisions = side.moves.filter(m => m.eligible).length;
    side.complete = side.moves.length === total;
    side.rating = null; side.ratingMethod = null; side.shortExcerpt = false;
    const recorded = Number(players[color]?.rating);
    if (mode === 'context' && fullContext && side.complete && side.accuracy != null && recorded > 0) {
      const estimate = contextualRating(recorded, side.accuracy, side.decisions, calibration.context.model);
      if (estimate) { side.rating = estimate.rating; side.shortExcerpt = estimate.shortExcerpt; side.ratingMethod = 'context'; }
    } else if (side.ratingMoves.length === total && new Set(side.ratingMoves.map(m => m.engine)).size === 1) {
      const engine = side.ratingMoves[0]?.engine;
      if (engine) { side.rating = movesOnlyRating(side.ratingMoves, calibration.movesOnly[engine].model); side.ratingMethod = 'moves'; }
    }
  }
  return result;
}

export function scoringEvidenceComplete(bests, total, calibration) {
  return Array.isArray(bests) && bests.slice(0, total).length === total && bests.slice(0, total).every(root =>
    root?.calibration?.version === calibration?.version && root.playedScore);
}

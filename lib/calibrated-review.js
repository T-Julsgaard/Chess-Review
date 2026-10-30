import {Chess} from './chess.js';
import {engineExpectedPoints, publicMoveQuality, publicGameAccuracy, sf19MoveQuality, sf19GameAccuracy, contextualRating, movesOnlyRating, ratingGameQuality} from './public-scoring.js';

const legalCounts = new WeakMap();
const scoringBuilds = new Set(['nnue', 'sf19lite']);
function currentProtocol(tag, calibration) {
  return !!calibration?.version && tag?.version === calibration.version
    && scoringBuilds.has(tag.build) && (tag.build !== 'sf19lite' || tag.nodes === 20000);
}
function validScore(score) {
  return score?.mate != null ? Number.isInteger(score.mate) && score.mate !== 0 : Number.isFinite(score?.cp);
}
function legalCount(position) {
  const previous = legalCounts.get(position);
  if (previous?.fen === position.fen) return previous.count;
  const count = new Chess(position.fen).moves().length;
  legalCounts.set(position, {fen: position.fen, count});
  return count;
}

export function calibratedReview(positions, bests, calibration, players = {}, mode = 'context') {
  const result = {w: {moves: [], ratingMoves: []}, b: {moves: [], ratingMoves: []}};
  const standardStart = positions[0]?.fen === new Chess().fen();
  let fullContext = positions.length > 1;
  let fullSf19Context = positions.length > 1;
  for (let i = 1; i < positions.length; i++) {
    const position = positions[i], root = bests[i - 1], tag = root?.calibration;
    const side = result[position.color];
    if (!side) throw Error('Missing mover color');
    const played = position.from + position.to + (position.promotion || '');
    const top = root?.bestmove === played, actual = top ? root?.score : root?.playedScore;
    const legalChoices = legalCount(positions[i - 1]), forced = legalChoices === 1;
    const protocol = currentProtocol(tag, calibration);
    const valid = protocol && actual;
    // A null qualityVersion records a custom SF18 search, not missing scores.
    // Keep its numerical estimates available without claiming a calibrated run.
    // Stale model versions and setup-FEN excerpts remain outside this fallback.
    const sf18Quality = valid && tag.build === 'nnue'
      && (tag.qualityVersion === calibration?.quality?.candidateVersion
        || (standardStart && tag.qualityVersion === null));
    fullContext &&= !!sf18Quality;
    fullSf19Context &&= !!(valid && tag.build === 'sf19lite' && tag.nodes === 20000
      && calibration?.context?.sf19?.candidateVersion
      && tag.contextVersion === calibration.context.sf19.candidateVersion);
    let decision = null;
    try {
      if (sf18Quality) decision = publicMoveQuality(root.score, actual, calibration.quality, {top, forced});
      else if (valid && tag.build === 'sf19lite' && tag.nodes === 20000) {
        decision = sf19MoveQuality(root.score, actual, {top, forced});
      }
    } catch { /* A missing/ambiguous observation contributes no numerical score. */ }
    if (decision) side.moves.push({ply: i, engine: tag.build, ...decision});
    const rating = root?.ratingEvidence, engine = tag?.build === 'sf19lite' ? 'sf19' : 'sf18';
    if (protocol && rating?.candidateVersion
        && rating.candidateVersion === calibration?.movesOnly?.[engine]?.candidateVersion) {
      try {
        const bestExpected = engineExpectedPoints(rating.best), playedExpected = engineExpectedPoints(rating.played);
        side.ratingMoves.push({ply: i, legalChoices, top: rating.bestmove === played, eligible: !forced, bestExpected,
          loss: forced || rating.bestmove === played ? 0 : Math.max(0, bestExpected - playedExpected), engine});
      } catch { /* Incomplete WDL evidence is not imputed. */ }
    }
  }
  for (const color of ['w', 'b']) {
    const side = result[color], total = positions.slice(1).filter(p => p.color === color).length;
    const engines = new Set(side.moves.map(move => move.engine));
    side.decisions = side.moves.filter(m => m.eligible).length;
    side.complete = side.moves.length === total;
    // Missing decisions must not silently turn an excerpt into whole-game accuracy.
    side.accuracy = !side.complete || engines.size > 1 ? null
      : engines.has('sf19lite') ? sf19GameAccuracy(side.moves) : publicGameAccuracy(side.moves);
    side.rating = null; side.ratingMethod = null; side.shortExcerpt = false;
    const recorded = Number(players[color]?.rating);
    const ratingComplete = side.ratingMoves.length === total && new Set(side.ratingMoves.map(m => m.engine)).size === 1;
    const sf19Context = fullSf19Context && ratingComplete && side.ratingMoves[0]?.engine === 'sf19';
    if (mode === 'context' && fullContext && side.complete && side.accuracy != null && recorded > 0) {
      const estimate = contextualRating(recorded, side.accuracy, side.decisions, calibration.context.model);
      if (estimate) { side.rating = estimate.rating; side.shortExcerpt = estimate.shortExcerpt; side.ratingMethod = 'context'; }
    } else if (mode === 'context' && sf19Context && recorded > 0) {
      const quality = ratingGameQuality(side.ratingMoves);
      const estimate = contextualRating(recorded, quality ?? 100, side.ratingMoves.filter(m => m.eligible).length, calibration.context.sf19.model);
      if (estimate) { side.rating = estimate.rating; side.shortExcerpt = estimate.shortExcerpt; side.ratingMethod = 'context'; }
    } else if (ratingComplete) {
      const engine = side.ratingMoves[0]?.engine;
      if (engine) { side.rating = movesOnlyRating(side.ratingMoves, calibration.movesOnly[engine].model); side.ratingMethod = 'moves'; }
    }
  }
  return result;
}

export function scoringEvidenceComplete(bests, total, calibration) {
  if (!Array.isArray(bests) || !Number.isSafeInteger(total) || total < 0 || bests.length < total) return false;
  let build = null;
  for (let i = 0; i < total; i++) {
    const root = bests[i], tag = root?.calibration;
    if (!currentProtocol(tag, calibration) || !validScore(root.score) || !validScore(root.playedScore)
        || (build && tag.build !== build)) return false;
    build = tag.build;
  }
  return true;
}

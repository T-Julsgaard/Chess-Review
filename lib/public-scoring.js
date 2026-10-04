// Pure scoring definitions shared by the review UI and public reproduction.
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const rms = values => values.length ? Math.sqrt(mean(values.map(value => value * value))) : 0;

export function expectedPoints(score, outcome) {
  if (!Number.isFinite(outcome?.slopePerPawn) || outcome.slopePerPawn <= 0) throw Error("Invalid outcome curve");
  if (score?.mate != null) {
    if (!Number.isInteger(score.mate) || score.mate === 0) throw Error("Ambiguous mate score");
    return score.mate > 0 ? 1 : 0;
  }
  if (!Number.isFinite(score?.cp)) throw Error("Missing engine score");
  const x = outcome.slopePerPawn * score.cp / 100;
  return x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
}

export function engineExpectedPoints(score) {
  if (score?.mate != null) {
    if (!Number.isInteger(score.mate) || score.mate === 0) throw Error("Ambiguous mate score");
    return score.mate > 0 ? 1 : 0;
  }
  const wdl = score?.wdl;
  if (!Array.isArray(wdl) || wdl.length !== 3 || wdl.some(value => !Number.isInteger(value) || value < 0)
      || wdl.reduce((sum, value) => sum + value, 0) !== 1000) throw Error("Missing engine WDL");
  return (wdl[0] + wdl[1] / 2) / 1000;
}

export function publicMoveQuality(best, played, model, { forced = false, top = false } = {}) {
  const residual = expectedPoints(best, model.outcome) - expectedPoints(played, model.outcome);
  if (!Number.isFinite(model.choice?.temperature) || model.choice.temperature <= 0) throw Error("Invalid choice curve");
  const loss = forced || top ? 0 : Math.max(0, residual);
  return { quality: 100 * Math.exp(-model.choice.temperature * loss), loss, residual, eligible: !forced };
}

export function publicGameAccuracy(moves) {
  return mean(moves.filter(move => move.eligible).map(move => move.quality));
}

// SF19 display estimate: Lichess's public centipawn curve and move transform,
// including its one-point search uncertainty bonus. This is separate from the
// fitted SF18 model and WDL rating inputs. https://lichess.org/page/accuracy
export const SF19_OUTCOME = Object.freeze({slopePerPawn: .368208});
export function sf19MoveQuality(best, played, {forced = false, top = false} = {}) {
  const residual = expectedPoints(best, SF19_OUTCOME) - expectedPoints(played, SF19_OUTCOME);
  const loss = forced || top ? 0 : Math.max(0, residual);
  const quality = loss === 0 ? 100 : Math.max(0, Math.min(100,
    103.1668100711649 * Math.exp(-4.354415386753951 * loss) - 3.166924740191411 + 1));
  return {quality, loss, residual, eligible: !forced};
}

// Combine ordinary and harmonic means so one disastrous decision cannot be
// hidden by a long run of easy moves. We do not use Lichess's volatility weights.
export function sf19GameAccuracy(moves) {
  const qualities = moves.filter(move => move.eligible).map(move => move.quality);
  if (!qualities.length) return null;
  if (qualities.some(value => !Number.isFinite(value) || value < 0 || value > 100)) throw Error('Invalid move quality');
  const harmonic = qualities.includes(0) ? 0 : qualities.length / qualities.reduce((sum, value) => sum + 1 / value, 0);
  return Math.max(0, Math.min(100, (mean(qualities) + harmonic) / 2));
}

export function ratingFeatures(moves) {
  const eligible = moves.filter(move => move.eligible);
  if (!eligible.length) return null;
  if (eligible.some(move => !Number.isFinite(move.loss) || move.loss < 0 || move.loss > 1
      || !Number.isFinite(move.bestExpected) || !Number.isInteger(move.ply)
      || !Number.isInteger(move.legalChoices) || move.legalChoices < 2)) throw Error("Invalid rating evidence");
  const early = eligible.filter(move => move.ply <= 20);
  const middle = eligible.filter(move => move.ply > 20 && move.ply <= 80);
  const contested = eligible.filter(move => move.bestExpected > .05 && move.bestExpected < .95);
  return {
    logRmsLoss: Math.log1p(100 * rms(eligible.map(move => move.loss))),
    topRate: mean(eligible.map(move => Number(move.top))),
    earlyRmsLoss: rms(early.map(move => move.loss)),
    contestedRmsLoss: rms(contested.map(move => move.loss)),
    contestedFraction: contested.length / eligible.length,
    earlyTopRate: mean(early.map(move => Number(move.top))) ?? 0,
    middleTopRate: mean(middle.map(move => Number(move.top))) ?? 0,
    decisionsLog: Math.log1p(eligible.length),
    legalChoicesLog: mean(eligible.map(move => Math.log1p(move.legalChoices))),
  };
}

export function movesOnlyRating(moves, model) {
  if (moves.filter(move => move.eligible).length < 10) return null;
  const row = ratingFeatures(moves), size = model?.featureNames?.length;
  if (!size || model.center?.length !== size || model.scale?.length !== size
      || model.coefficients?.length !== size + 1 || model.scale.some(value => !(value > 0))
      || model.featureNames.some(name => !Number.isFinite(row[name]))) throw Error("Invalid rating model");
  return model.coefficients[0] + model.featureNames.reduce((sum, name, index) =>
    sum + model.coefficients[index + 1] * (row[name] - model.center[index]) / model.scale[index], 0);
}

// SF19 contextual peers were observed with fixed-node WDL searches. Keep this
// quality statistic separate from the centipawn-based displayed accuracy.
export function ratingGameQuality(moves) {
  const eligible = moves.filter(move => move.eligible);
  if (eligible.some(move => !Number.isFinite(move.loss) || move.loss < 0 || move.loss > 1)) {
    throw Error('Invalid rating quality evidence');
  }
  return mean(eligible.map(move => 100 * (1 - move.loss)));
}

export function contextualRating(rating, quality, decisions, model) {
  if (!Number.isFinite(rating) || rating <= 0 || rating > 5000 || !Number.isFinite(quality)
      || quality < 0 || quality > 100 || !Number.isInteger(decisions) || decisions < 0) return null;
  if (![200, 400, 800].includes(model?.bandwidth) || !model.peers?.length) throw Error("Invalid contextual model");
  if (!decisions) return { rating, adjusted: false, shortExcerpt: false };
  const logits = model.peers.map(peer => Math.log(peer.weight) - .5 * ((peer.rating - rating) / model.bandwidth) ** 2);
  const maximum = Math.max(...logits), weights = logits.map(value => Math.exp(value - maximum));
  const total = weights.reduce((sum, value) => sum + value, 0), normalized = weights.map(value => value / total);
  const effectiveSides = 1 / normalized.reduce((sum, value) => sum + value * value, 0);
  const shortExcerpt = decisions < 10;
  if (effectiveSides < 20) return { rating, effectiveSides, adjusted: false, shortExcerpt };
  let percentile = 0;
  for (let i = 0; i < model.peers.length; i++) {
    const peer = model.peers[i];
    if (peer.quality <= quality) percentile += normalized[i] * (peer.quality === quality ? .5 : 1);
  }
  percentile = (percentile * effectiveSides + .5) / (effectiveSides + 1);
  const deviation = 400 / Math.log(10) * (Math.log(percentile) - Math.log1p(-percentile));
  return { rating: rating + deviation, deviation, percentile, effectiveSides, adjusted: true, shortExcerpt };
}

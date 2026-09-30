import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { args, json, save, hash, codeIdentity } from './io.mjs';
import { mean, correlation } from './core.mjs';

export const featureNames = ['meanLoss', 'rmsLoss', 'majorLossRate', 'topRate'];
export function solve(matrix, target) {
  const a = matrix.map((row, i) => [...row, target[i]]), n = target.length;
  for (let j = 0; j < n; j++) {
    let pivot = j;
    for (let i = j + 1; i < n; i++) if (Math.abs(a[i][j]) > Math.abs(a[pivot][j])) pivot = i;
    [a[j], a[pivot]] = [a[pivot], a[j]];
    if (Math.abs(a[j][j]) < 1e-12) throw Error('Singular fit');
    const scale = a[j][j]; for (let k = j; k <= n; k++) a[j][k] /= scale;
    for (let i = 0; i < n; i++) if (i !== j) {
      const f = a[i][j]; for (let k = j; k <= n; k++) a[i][k] -= f * a[j][k];
    }
  }
  return a.map(row => row[n]);
}
export function fit(rows, lambda) {
  const center = featureNames.map(f => mean(rows.map(r => r[f])));
  const scale = featureNames.map((f, j) => Math.sqrt(mean(rows.map(r => (r[f] - center[j]) ** 2))) || 1);
  const x = rows.map(r => [1, ...featureNames.map((f, j) => (r[f] - center[j]) / scale[j])]);
  const p = x[0].length, a = Array.from({ length: p }, () => Array(p).fill(0)), b = Array(p).fill(0);
  x.forEach((row, i) => row.forEach((v, j) => {
    b[j] += v * rows[i].ratingTarget;
    row.forEach((w, k) => { a[j][k] += v * w; });
  }));
  for (let j = 1; j < p; j++) a[j][j] += lambda;
  return { featureNames, center, scale, lambda, coefficients: solve(a, b) };
}
export function predict(model, row) {
  return model.coefficients[0] + model.featureNames.reduce((s, f, j) =>
    s + model.coefficients[j + 1] * (row[f] - model.center[j]) / model.scale[j], 0);
}
export function metrics(rows, predictions) {
  if (!rows.length) return null;
  const errors = rows.map((r, i) => predictions[i] - r.ratingTarget), abs = errors.map(Math.abs).sort((a, b) => a - b);
  return { n: rows.length, mae: mean(abs), rmse: Math.sqrt(mean(errors.map(e => e * e))),
    medianAbsoluteError: abs.length % 2 ? abs[(abs.length - 1) / 2] : (abs[abs.length / 2 - 1] + abs[abs.length / 2]) / 2,
    bias: mean(errors), correlation: correlation(rows.map(r => r.ratingTarget), predictions),
    predictedRange: [Math.min(...predictions), Math.max(...predictions)] };
}
async function main() {
  const o = args({ run: 'calibration-runs/smoke/n20k' });
  const features = await json(path.join(o.run, 'features.json'));
  const rows = features.rows.filter(r => r.decisions >= 10 && featureNames.every(f => Number.isFinite(r[f])));
  // Final test rows are never used, scored or summarized by this exploratory stage.
  const train = rows.filter(r => r.split === 'train'), validation = rows.filter(r => r.split === 'validation');
  if (train.length < 8 || validation.length < 4) throw Error('Insufficient training/validation samples even for exploratory fit');
  const baseline = mean(train.map(r => r.ratingTarget));
  const candidates = [1, 10, 100].map(lambda => {
    const model = fit(train, lambda);
    return { model, validation: metrics(validation, validation.map(r => predict(model, r))) };
  });
  candidates.sort((a, b) => a.validation.mae - b.validation.mae);
  const selected = candidates[0];
  await save(path.join(o.run, 'rating-exploratory.json'), {
    status: 'exploratory only; not validated or suitable for production', target: 'recorded Lichess blitz rating level',
    modelInputsExcludeActualRating: true, oldCalibrationUsedForTraining: false, externalReviewScoresUsed: false,
    featuresSha256: hash(JSON.stringify(features)), binding: features.binding, trainingSamples: train.length,
    fittingCode: await codeIdentity(),
    finalTestEvaluated: false, baseline, baselineValidation: metrics(validation, validation.map(() => baseline)),
    candidates, selected: selected.model,
    validationByRatingBand: [0, 1, 2, 3].map(band => { const group = validation.filter(r => Math.min(3, Math.max(0, Math.floor((r.ratingTarget - 800) / 400))) === band);
      return { band, ...metrics(group, group.map(r => predict(selected.model, r))) }; }),
    uncertainty: 'Not estimable reliably from this smoke sample; no predictive interval or production artifact exported' });
  console.log(JSON.stringify({ baselineValidation: metrics(validation, validation.map(() => baseline)), selectedValidation: selected.validation }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

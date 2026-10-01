import path from 'node:path';
import { readdir, writeFile } from 'node:fs/promises';
import { args, json, save } from './io.mjs';
import { mean, correlation, gameBootstrap } from './core.mjs';

const o = args({ dataset: 'calibration-runs/smoke/dataset', run: 'calibration-runs/smoke/n20k', compare: null });
const dataset = await json(path.join(o.dataset, 'manifest.json')), f = await json(path.join(o.run, 'features.json'));
if (dataset.gamesSha256 !== f.binding.datasetSha256) throw Error('Report dataset mismatch');
const rows = f.rows.filter(r => r.split !== 'test');
const benchmarks = await Promise.all((await readdir(o.run)).filter(n => /^benchmark-/.test(n)).map(n => json(path.join(o.run, n))));
const report = { status: 'smoke test only; final test reserved', generatedAt: new Date().toISOString(),
  dataset, engineConfig: f.binding.engineConfig, analysisCode: f.analysisCode, featureCode: f.featureCode,
  developmentSideSamples: rows.length, benchmarks: benchmarks.map(b => ({ ...b,
    ...(b.newSearches === 0 ? { projectedHours: null, caveat: 'Cache-only resume; not a throughput benchmark' } : {}) })),
  accuracy: { meanRange: [Math.min(...rows.map(r => r.accuracyMean)), Math.max(...rows.map(r => r.accuracyMean))],
    rmsRange: [Math.min(...rows.map(r => r.accuracyRms)), Math.max(...rows.map(r => r.accuracyRms))],
    ratingCorrelationMean: correlation(rows.map(r => r.ratingTarget), rows.map(r => r.accuracyMean)),
    ratingCorrelationRms: correlation(rows.map(r => r.ratingTarget), rows.map(r => r.accuracyRms)),
    lengthCorrelationRms: correlation(rows.map(r => r.decisions), rows.map(r => r.accuracyRms)),
    ratingCorrelationMeanBootstrap: gameBootstrap(rows, r => correlation(r.map(x => x.ratingTarget), r.map(x => x.accuracyMean))),
    ratingCorrelationRmsBootstrap: gameBootstrap(rows, r => correlation(r.map(x => x.ratingTarget), r.map(x => x.accuracyRms))),
    lengthCorrelationRmsBootstrap: gameBootstrap(rows, r => correlation(r.map(x => x.decisions), r.map(x => x.accuracyRms))),
    negativeResiduals: rows.reduce((s, r) => s + r.negativeResiduals, 0),
    decisions: rows.reduce((s, r) => s + r.decisions, 0),
    byRatingBand: [0, 1, 2, 3].map(b => { const g = rows.filter(r => Math.min(3, Math.max(0, Math.floor((r.ratingTarget - 800) / 400))) === b);
      return { band: b, n: g.length, meanAccuracy: mean(g.map(r => r.accuracyMean)), rmsAccuracy: mean(g.map(r => r.accuracyRms)) }; }) },
  limitations: ['Historical, small, stratified sample cannot establish modern rating calibration.',
    'Validation metrics are model-selection estimates, not final test results.',
    'WDL self-play estimates saturate and shallow search introduces noise.',
    'Bootstrap intervals are descriptive game-cluster estimates, not predictive rating intervals.',
    'No old-calibration comparison, final test evaluation, or production export.'] };
try { report.rating = await json(path.join(o.run, 'rating-exploratory.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (o.compare) {
  const stronger = await json(path.join(o.compare, 'features.json'));
  if (stronger.binding.datasetSha256 !== f.binding.datasetSha256) throw Error('Stability datasets differ');
  const pairs = stronger.rows.filter(r => r.split !== 'test').map(r => [rows.find(b => b.gameId === r.gameId && b.color === r.color), r]).filter(([r]) => r);
  report.stability = { sideSamples: pairs.length, strongerBudget: stronger.binding.engineConfig.budget,
    largerBudgetRatio: stronger.binding.engineConfig.budget.value / f.binding.engineConfig.budget.value,
    rmsScoreCorrelation: correlation(pairs.map(([a]) => a.accuracyRms), pairs.map(([, b]) => b.accuracyRms)),
    rmsMeanAbsoluteChange: mean(pairs.map(([a, b]) => Math.abs(a.accuracyRms - b.accuracyRms))),
    rmsMaxAbsoluteChange: Math.max(...pairs.map(([a, b]) => Math.abs(a.accuracyRms - b.accuracyRms))),
    meanMeanAbsoluteChange: mean(pairs.map(([a, b]) => Math.abs(a.accuracyMean - b.accuracyMean))) };
}
await save(path.join(o.run, 'report.json'), report);
const num = n => n == null ? 'unavailable' : n.toFixed(2);
await writeFile(path.join(o.run, 'report.md'), `# Independent calibration smoke test\n\n` +
  `Historical CC0 Lichess sample: ${dataset.selectedGames} rated ${dataset.category} games; ${rows.length} development side samples. Final test remains reserved.\n\n` +
  `Engine: bundled SF18 Lite, ${JSON.stringify(f.binding.engineConfig.budget)}, MultiPV 1, WDL on, one thread per worker.\n\n` +
  `Arithmetic accuracy range: ${report.accuracy.meanRange.map(num).join('–')}; RMS accuracy range: ${report.accuracy.rmsRange.map(num).join('–')}.\n\n` +
  `Rating correlation (RMS): ${num(report.accuracy.ratingCorrelationRms)}; length correlation: ${num(report.accuracy.lengthCorrelationRms)}. These are descriptive, underpowered statistics.\n\n` +
  `Negative search residuals greater than .02: ${report.accuracy.negativeResiduals}/${report.accuracy.decisions}.\n\n` +
  (report.rating ? `Exploratory validation MAE: ${num(report.rating.candidates[0].validation.mae)} vs constant baseline ${num(report.rating.baselineValidation.mae)} Lichess rating points.\n\n` : '') +
  (report.stability ? `At ${report.stability.largerBudgetRatio}x search budget (${report.stability.sideSamples} side samples), RMS accuracy mean absolute change ${num(report.stability.rmsMeanAbsoluteChange)}, maximum ${num(report.stability.rmsMaxAbsoluteChange)}, correlation ${num(report.stability.rmsScoreCorrelation)}.\n\n` : '') +
  `See report.json for hashes, options, provenance, throughput and projections.\n\nNo production calibration was exported. Next: recent 100–200-game budget/worker benchmark, then a sufficiently powered 2k-game pilot.\n`);
console.log(JSON.stringify({ accuracy: report.accuracy, stability: report.stability }));

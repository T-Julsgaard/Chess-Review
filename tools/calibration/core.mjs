export const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
export const rms = a => a.length ? Math.sqrt(mean(a.map(x => x * x))) : null;
export function expected(score) {
  if (score.mate != null) return score.mate > 0 ? 1 : 0;
  const w = score.wdl;
  if (!Array.isArray(w) || w.length !== 3 || w.some(x => !Number.isInteger(x) || x < 0) || w.reduce((a, b) => a + b, 0) !== 1000)
    throw Error('Valid engine WDL required; no fallback probability mapping');
  return (w[0] + w[1] / 2) / 1000;
}
export function moveQuality(best, played, { forced = false, top = false } = {}) {
  const residual = expected(best) - expected(played);
  const loss = top || forced ? 0 : Math.max(0, residual);
  return { loss, quality: 100 * (1 - loss), residual, eligible: !forced };
}
export function summarize(moves) {
  const eligible = moves.filter(m => m.eligible);
  const losses = eligible.map(m => m.loss);
  return { decisions: losses.length, forced: moves.length - losses.length,
    meanLoss: mean(losses), rmsLoss: rms(losses),
    accuracyMean: losses.length ? 100 * (1 - mean(losses)) : null,
    accuracyRms: losses.length ? 100 * (1 - rms(losses)) : null,
    majorLossRate: mean(eligible.map(m => Number(m.loss >= .2))),
    topRate: mean(eligible.map(m => Number(m.top))),
    maxLoss: losses.length ? Math.max(...losses) : null,
    negativeResiduals: eligible.filter(m => m.residual < -.02).length };
}
export function assertCompatible(artifact, config) {
  if (JSON.stringify(artifact.engineConfig) !== JSON.stringify(config)) throw Error('Incompatible engine/search metadata');
}
export function assertDisjoint(games) {
  const players = new Map();
  for (const game of games) for (const p of game.players) {
    if (players.has(p.id) && players.get(p.id) !== game.split) throw Error(`Player leakage: ${p.id}`);
    players.set(p.id, game.split);
  }
}
export function correlation(a, b) {
  if (a.length < 2) return null;
  const ma = mean(a), mb = mean(b);
  const cov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
  const den = Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
  return den ? cov / den : null;
}
export function gameBootstrap(rows, statistic, iterations = 1000, seed = 18019) {
  const groups = [...new Set(rows.map(r => r.gameId))].map(id => rows.filter(r => r.gameId === id));
  if (groups.length < 2) return null;
  let state = seed >>> 0;
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const sample = [];
    for (let j = 0; j < groups.length; j++) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      sample.push(...groups[Math.floor(state / 4294967296 * groups.length)]);
    }
    const value = statistic(sample); if (Number.isFinite(value)) samples.push(value);
  }
  samples.sort((a, b) => a - b);
  return samples.length ? { estimate: statistic(rows), lower: samples[Math.floor(.025 * (samples.length - 1))],
    upper: samples[Math.floor(.975 * (samples.length - 1))], iterations, seed,
    unit: 'game (both player sides resampled together)', interpretation: 'exploratory percentile interval; small stratified sample' } : null;
}

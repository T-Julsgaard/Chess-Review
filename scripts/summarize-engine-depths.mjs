import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync, gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {Chess} from '../lib/chess.js';
import {publicMoveQuality, publicGameAccuracy, sf19MoveQuality, sf19GameAccuracy} from '../lib/public-scoring.js';

const args = process.argv.slice(2), input = path.resolve(args[args.indexOf('--input') + 1] || ''), out = path.resolve(args[args.indexOf('--out') + 1] || '');
if (!args.includes('--input') || !args.includes('--out')) throw Error('Usage: node scripts/summarize-engine-depths.mjs --input RUN --out REPORT');
const manifest = JSON.parse(await fs.readFile(path.join(input, 'manifest.json')));
const results = JSON.parse(await fs.readFile(path.join(input, 'results.json')));
assert.equal(manifest.pilot, false); assert.equal(results.results.length, manifest.longGames || manifest.fastPreview ? 18 : 60);
const root = fileURLToPath(new URL('../', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [name, expected] of Object.entries(manifest.inputHashes)) {
  const current = sha256(await fs.readFile(path.join(root, name)));
  // A later documentation/protocol-label correction must not rewrite the source
  // identity of an already retained run. Verify its frozen commit when needed.
  const actual = current === expected ? current : sha256(execFileSync('git', ['show', manifest.revision + ':' + name], {cwd: root, maxBuffer: 32 * 1024 * 1024}));
  assert.equal(actual, expected, 'Frozen source/input differs: ' + name);
}
const rows = results.results, raw = [], keys = new Set();
for (const row of rows) {
  assert.ok(!keys.has(row.key)); keys.add(row.key);
  const record = JSON.parse(gunzipSync(await fs.readFile(path.join(input, row.key + '.json.gz'))));
  const {type, observations, ...summary} = record;
  assert.equal(type, 'result'); assert.deepEqual(summary, row);
  const game = manifest.games.find(game => game.id === row.game);
  assert.ok(game); assert.equal(row.plies, game.plies); assert.equal(observations.length, game.plies);
  assert.ok(row.totalMs >= row.startupMs + row.searchMs - 1);
  assert.ok(row.searches >= row.plies && row.searches <= row.plies * 3);
  const chess = new Chess(), moves = [];
  for (const observation of observations) {
    const legal = chess.moves({verbose: true});
    assert.equal(observation.ply, moves.length + 1); assert.equal(observation.color, chess.turn());
    assert.equal(observation.legalChoices, legal.length);
    assert.ok(legal.some(move => move.lan === observation.bestmove));
    const flags = {top: observation.played === observation.bestmove, forced: legal.length === 1};
    const quality = row.build === 'nnue'
      ? publicMoveQuality(observation.best, observation.actual, manifest.qualityModel, flags)
      : sf19MoveQuality(observation.best, observation.actual, flags);
    assert.equal(observation.top, flags.top); assert.equal(observation.eligible, quality.eligible);
    assert.ok(Math.abs(observation.quality - quality.quality) < 1e-10);
    chess.move({from: observation.played.slice(0, 2), to: observation.played.slice(2, 4), promotion: observation.played[4]});
    moves.push(observation.played);
  }
  assert.equal(sha256(JSON.stringify(moves)), game.movesSha256);
  for (const color of ['w', 'b']) {
    const decisions = observations.filter(observation => observation.color === color);
    const accuracy = row.build === 'nnue' ? publicGameAccuracy(decisions) : sf19GameAccuracy(decisions);
    assert.ok(Math.abs(accuracy - row.accuracy[color]) < 1e-10);
    assert.equal(row.decisions[color], decisions.filter(move => move.eligible).length);
  }
  raw.push(record);
}
const median = values => { const sorted = [...values].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; };
const select = (build, depth, cold = true, game) => rows.filter(row => row.build === build && row.depth === depth && row.cold === cold && (!game || row.game === game));
const engineName = build => build === 'nnue' ? 'Stockfish 18 NNUE' : 'Stockfish 19 Lite';
if (manifest.fastPreview) { await summarizeFastPreview(); process.exit(0); }
if (manifest.longGames) { await summarizeLongGames(); process.exit(0); }
const timing = [], accuracy = [], errors = [], byGame = [], singleResetErrors = [];
for (const build of ['nnue', 'sf19lite']) {
  for (const [depth, cold] of [[6, true], [8, true], [16, true], [8, false]]) {
    const samples = select(build, depth, cold);
    assert.equal(samples.length, depth === 16 ? 3 : 9);
    timing.push({build, depth, cold, n: samples.length, medianMs: median(samples.map(row => row.totalMs)),
      minMs: Math.min(...samples.map(row => row.totalMs)), maxMs: Math.max(...samples.map(row => row.totalMs)), startupMedianMs: median(samples.map(row => row.startupMs))});
  }
  for (const game of manifest.games) {
    const times = {};
    for (const depth of [6, 8, 16]) times[depth] = median(select(build, depth, true, game.id).map(row => row.totalMs));
    byGame.push({build, game: game.id, times, singleReset8Ms: median(select(build, 8, false, game.id).map(row => row.totalMs))});
    for (const color of ['w', 'b']) {
      const scores = Object.fromEntries([6, 8, 16].map(depth => [depth, median(select(build, depth, true, game.id).map(row => row.accuracy[color]))]));
      accuracy.push({build, game: game.id, color, scores, delta6: scores[6] - scores[16], delta8: scores[8] - scores[16]});
    }
  }
  for (const depth of [6, 8]) {
    const deltas = accuracy.filter(row => row.build === build).map(row => row['delta' + depth]);
    errors.push({build, depth, meanAbsolutePoints: deltas.reduce((sum, value) => sum + Math.abs(value), 0) / deltas.length, maxAbsolutePoints: Math.max(...deltas.map(Math.abs))});
  }
  const singleResetDeltas = accuracy.filter(row => row.build === build).map(row =>
    median(select(build, 8, false, row.game).map(run => run.accuracy[row.color])) - row.scores[16]);
  singleResetErrors.push({build, meanAbsolutePoints: singleResetDeltas.reduce((sum, value) => sum + Math.abs(value), 0) / singleResetDeltas.length,
    maxAbsolutePoints: Math.max(...singleResetDeltas.map(Math.abs))});
}
const trialScoreRanges = [];
const resetModeScoreDifferences = [];
for (const build of ['nnue', 'sf19lite']) for (const depth of [6, 8]) for (const cold of depth === 8 ? [true, false] : [true]) for (const game of manifest.games) for (const color of ['w', 'b']) {
  const values = select(build, depth, cold, game.id).map(row => row.accuracy[color]);
  trialScoreRanges.push(Math.max(...values) - Math.min(...values));
  if (!cold) resetModeScoreDifferences.push(Math.abs(median(values) - median(select(build, 8, true, game.id).map(row => row.accuracy[color]))));
}
const summary = {sourceRevision: manifest.revision, startedAt: manifest.startedAt, finishedAt: results.finishedAt,
  cpu: manifest.cpu, browser: results.userAgent, verifiedRuns: rows.length, verifiedHalfMoves: raw.reduce((sum, row) => sum + row.plies, 0),
  maxRepeatedScoreRange: Math.max(...trialScoreRanges), maxResetModeScoreDifference: Math.max(...resetModeScoreDifferences), timing, accuracy, errors, byGame, singleResetErrors,
  protocolCorrection: 'Historical retained keys mean no extra Clear Hash command. The production wrapper still sends ucinewgame before each search, so these are single-reset runs, not retained-cache runs.'};
const number = value => value.toFixed(1), seconds = ms => (ms / 1000).toFixed(2), delta = value => (value >= 0 ? '+' : '') + value.toFixed(1);
let report = '# Bundled-engine depth comparison\n\n';
report += 'Collected ' + new Intl.DateTimeFormat('en-GB', {dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Copenhagen'}).format(new Date(manifest.startedAt)) + ' (Europe/Copenhagen). Source revision `' + manifest.revision.slice(0, 8) + '`.\n\n';
report += 'Measured in real headless Chrome workers on **' + manifest.cpu + '**. One worker, Hash16, maximum skill, MultiPV1, full mainline history, exact best/played observations at each original root. Times include fresh worker startup, searches and scoring; site fetching, network downloads and review UI are excluded.\n\n';
report += '**Depth 6 works in both engines. The app currently exposes only depths 8–22.** Stockfish 19 Lite production review scoring uses fixed 20,000-node searches at Hash32, independently of the depth slider. The SF19 depth-based scores below are experimental applications of its display formula, not its production fixed-node review.\n\n';
report += 'Three previously exposed CC0 Lichess training games, selected before measurement:\n\n| Game | Half-moves | White rating | Black rating |\n|---|---:|---:|---:|\n';
for (const game of manifest.games) report += '| [' + game.id + '](' + game.source + ') | ' + game.plies + ' | ' + game.players.find(player => player.color === 'w').rating + ' | ' + game.players.find(player => player.color === 'b').rating + ' |\n';
report += '\n## Startup-inclusive whole-game timing\n\nClear hash before every search, matching the main review scoring approach. Depth6/depth8: three repeats per engine/game; depth16: one run per engine/game. The pooled timing range includes differences between games.\n\n| Engine | Depth | Runs | Median seconds | Range seconds | Median startup seconds |\n|---|---:|---:|---:|---:|---:|\n';
for (const row of timing.filter(row => row.cold)) report += '| ' + engineName(row.build) + ' | ' + row.depth + ' | ' + row.n + ' | ' + seconds(row.medianMs) + ' | ' + seconds(row.minMs) + '–' + seconds(row.maxMs) + ' | ' + seconds(row.startupMedianMs) + ' |\n';
report += '\nDepth8 median by game (three repeats):\n\n| Game | SF18 seconds | SF19 Lite seconds |\n|---|---:|---:|\n';
for (const game of manifest.games) report += '| ' + game.id + ' | ' + seconds(byGame.find(row => row.game === game.id && row.build === 'nnue').times[8]) + ' | ' + seconds(byGame.find(row => row.game === game.id && row.build === 'sf19lite').times[8]) + ' |\n';
report += '\n## Accuracy versus each engine’s depth16 reference\n\nScores are percentages. Deltas are percentage points: shallow score minus depth16. Shallow repeats use their median score. The two engines have different display formulas; compare each engine with itself across depths.\n';
for (const build of ['nnue', 'sf19lite']) {
  report += '\n### ' + engineName(build) + '\n\n| Game / side | Depth16 | Depth8 | Depth6 | Δ8 | Δ6 |\n|---|---:|---:|---:|---:|---:|\n';
  for (const row of accuracy.filter(row => row.build === build)) report += '| ' + row.game + ' / ' + (row.color === 'w' ? 'White' : 'Black') + ' | ' + number(row.scores[16]) + ' | ' + number(row.scores[8]) + ' | ' + number(row.scores[6]) + ' | ' + delta(row.delta8) + ' | ' + delta(row.delta6) + ' |\n';
}
report += '\n| Engine | Shallow depth | Mean absolute difference | Largest absolute difference |\n|---|---:|---:|---:|\n';
for (const row of errors) report += '| ' + engineName(row.build) + ' | ' + row.depth + ' | ' + number(row.meanAbsolutePoints) + ' points | ' + number(row.maxAbsolutePoints) + ' points |\n';
report += '\n## Separate depth8 reset-overhead comparison\n\nThe plan intended this as a retained-cache variant, and raw keys retain that historical name. Inspection after collection found that the production wrapper still sends `ucinewgame` before every search; Stockfish clears its search state for that command. Therefore these runs remove the additional explicit `Clear Hash` command, but **do not retain the search cache**. The source protocol is visible in [engine/uci.js](../../../engine/uci.js); upstream confirms the [ucinewgame handler](https://github.com/nmrugg/stockfish.js/blob/v18.0.0/src/uci.cpp) and [search_clear implementation](https://github.com/nmrugg/stockfish.js/blob/v19.0.0/src/engine.cpp). Maximum score difference from the corresponding double-reset runs: ' + summary.maxResetModeScoreDifference.toFixed(10) + ' points.\n\n| Engine | Runs | Median seconds | Range seconds |\n|---|---:|---:|---:|\n';
for (const row of timing.filter(row => !row.cold)) report += '| ' + engineName(row.build) + ' | ' + row.n + ' | ' + seconds(row.medianMs) + ' | ' + seconds(row.minMs) + '–' + seconds(row.maxMs) + ' |\n';
report += '\nSingle-reset depth8 accuracy differences from that engine’s depth16 reference:\n\n| Engine | Mean absolute difference | Largest absolute difference |\n|---|---:|---:|\n';
for (const row of singleResetErrors) report += '| ' + engineName(row.build) + ' | ' + number(row.meanAbsolutePoints) + ' points | ' + number(row.maxAbsolutePoints) + ' points |\n';
report += '\n## Evidence and limits\n\nAll ' + rows.length + ' complete-game runs (' + summary.verifiedHalfMoves + ' analysed half-moves) passed independent legal replay and score re-aggregation. Maximum accuracy range across identical shallow repeats: ' + summary.maxRepeatedScoreRange.toFixed(10) + ' points.\n\n';
report += 'The sample contains only three games on one older desktop. A fresh worker is used per run within the same browser process; browser startup is excluded, and browser/WASM caches may be warm. Depth16 is a deeper reference, not ground truth. Results do not establish performance on slower devices or all tactical positions. The supplementary comparison is a reset-overhead test, not a validated fast-preview implementation. Earlier subsecond feasibility timings used a lighter command loop without the current wrapper’s repeated history validation and reset protocol. No production engine, depth slider, scoring formula or calibration has been changed.\n\n';
report += 'Reproduce collection with `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY`; summarise with `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. The published SF18 coefficients are reconstructed from guarded frozen public evidence; no new tuning choices are made.\n\n';
report += 'See [plan](PLAN.md), [input manifest and eligibility receipt](input-manifest.json), [all run timings](runs.json), [summary](summary.json), and [compressed raw observations](observations.json.gz). The raw package retains every repeated run.\n';
await fs.mkdir(out, {recursive: true});
await fs.writeFile(path.join(out, 'input-manifest.json'), JSON.stringify(manifest, null, 2));
await fs.writeFile(path.join(out, 'runs.json'), JSON.stringify(results, null, 2));
await fs.writeFile(path.join(out, 'observations.json.gz'), gzipSync(JSON.stringify(raw), {level: 9}));
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(out, 'RESULT.md'), report);
console.log(JSON.stringify(summary, null, 2));

async function summarizeLongGames() {
  const timing = manifest.games.map(game => {
    const depths = Object.fromEntries([6, 8].map(depth => {
      const samples = select('nnue', depth, true, game.id);
      assert.equal(samples.length, 3);
      assert.deepEqual(samples.map(row => row.trial).sort(), [0, 1, 2]);
      const values = samples.map(row => row.totalMs);
      return [depth, {medianMs: median(values), minMs: Math.min(...values), maxMs: Math.max(...values), samplesMs: values}];
    }));
    return {game: game.id, source: game.source, plies: game.plies, fullMoves: game.plies / 2, depths,
      savedMs: depths[8].medianMs - depths[6].medianMs, reductionPercent: 100 * (1 - depths[6].medianMs / depths[8].medianMs)};
  });
  const summary = {sourceRevision: manifest.revision, startedAt: manifest.startedAt, finishedAt: results.finishedAt,
    cpu: manifest.cpu, browser: results.userAgent, verifiedRuns: rows.length,
    verifiedHalfMoves: raw.reduce((sum, row) => sum + row.plies, 0), timing};
  const seconds = ms => (ms / 1000).toFixed(2);
  let report = '# Stockfish 18 on longer games\n\n';
  report += 'Measured on 31 October 2026 with **' + manifest.cpu + '** in real Chrome workers, using the same configuration as the earlier comparison: one worker, Hash16, maximum skill, MultiPV1, full mainline histories, and exact best/played searches at each original root. Times include worker startup, validation, search and scoring, excluding site fetching and UI. Each game/depth has three independent fresh-worker runs.\n\n';
  report += 'A full move means one White move plus one Black move. These examples contain 122, 160 and 208 half-moves.\n\n| Completed game | Full moves | Depth6 median (range), seconds | Depth8 median (range), seconds | Depth6 saves |\n|---|---:|---:|---:|---:|\n';
  for (const row of timing) {
    const cell = depth => seconds(row.depths[depth].medianMs) + ' (' + seconds(row.depths[depth].minMs) + '–' + seconds(row.depths[depth].maxMs) + ')';
    report += '| [' + row.game + '](' + row.source + ') | ' + row.fullMoves + ' | ' + cell(6) + ' | ' + cell(8) + ' | ' + seconds(row.savedMs) + ' s / ' + row.reductionPercent.toFixed(1) + '% |\n';
  }
  report += '\nAll ' + rows.length + ' complete-game analyses (' + summary.verifiedHalfMoves + ' half-moves) passed independent legal replay and score re-aggregation. No incomplete runs were substituted or dropped.\n\n';
  report += 'These are three measured examples, not a worst-case bound or an estimate of cost per additional move. Different position complexity, legal choices and browser/machine load also affect time. The wrapper replays root histories and resets the engine for each search, so a universal linear estimate is inappropriate. Fresh workers run in the same browser process, and browser/WASM caches may be warm. Production behavior has not been changed.\n\n';
  report += 'Collection: `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY --long-games`. Report/replay: `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. Source revision: `' + manifest.revision + '`.\n\n';
  report += 'See [plan](PLAN.md), [input manifest and eligibility receipt](input-manifest.json), [all run timings](runs.json), [summary](summary.json), and [compressed raw observations](observations.json.gz).\n';
  await fs.mkdir(out, {recursive: true});
  await fs.writeFile(path.join(out, 'input-manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(out, 'runs.json'), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(out, 'observations.json.gz'), gzipSync(JSON.stringify(raw), {level: 9}));
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(out, 'RESULT.md'), report);
  console.log(JSON.stringify(summary, null, 2));
}

async function summarizeFastPreview() {
  const previousDepths = JSON.parse(await fs.readFile(path.join(root, 'docs/benchmarks/2026-10-30-engine-depths/summary.json')));
  const previousLong = JSON.parse(await fs.readFile(path.join(root, 'docs/benchmarks/2026-10-31-long-games/summary.json')));
  const previousLongRuns = JSON.parse(await fs.readFile(path.join(root, 'docs/benchmarks/2026-10-31-long-games/runs.json')));
  const timing = [], scores = [];
  for (const game of manifest.games) {
    const samples = rows.filter(row => row.game === game.id);
    assert.equal(samples.length, 3);
    assert.deepEqual(samples.map(row => row.trial).sort(), [0, 1, 2]);
    assert.ok(samples.every(row => row.fastPreview && row.depth === 8 && row.build === 'nnue'));
    const baseline = previousDepths.byGame.find(row => row.build === 'nnue' && row.game === game.id)?.times[8]
      ?? previousLong.timing.find(row => row.game === game.id)?.depths[8].medianMs;
    assert.ok(Number.isFinite(baseline));
    const values = samples.map(row => row.totalMs), medianMs = median(values);
    timing.push({game: game.id, source: game.source, plies: game.plies, fullMoves: game.plies / 2,
      medianMs, minMs: Math.min(...values), maxMs: Math.max(...values), baselineDepth8Ms: baseline, speedup: baseline / medianMs});
    for (const color of ['w', 'b']) {
      const old = previousDepths.accuracy.find(row => row.build === 'nnue' && row.game === game.id && row.color === color);
      const depth8 = old?.scores[8] ?? median(previousLongRuns.results.filter(row => row.game === game.id && row.depth === 8).map(row => row.accuracy[color]));
      const accuracy = median(samples.map(row => row.accuracy[color]));
      scores.push({game: game.id, color, accuracy, previousColdDepth8: depth8, delta8: accuracy - depth8,
        previousColdDepth16: old?.scores[16] ?? null, delta16: old ? accuracy - old.scores[16] : null});
    }
  }
  const comparisons = scores.map(row => Math.abs(row.delta8));
  const deepComparisons = scores.filter(row => row.delta16 != null).map(row => Math.abs(row.delta16));
  const summary = {sourceRevision: manifest.revision, cpu: manifest.cpu, browser: results.userAgent,
    startedAt: manifest.startedAt, finishedAt: results.finishedAt, verifiedRuns: rows.length,
    verifiedHalfMoves: raw.reduce((sum, row) => sum + row.plies, 0), timing, scores,
    meanAbsoluteDifferenceFromCold8: comparisons.reduce((a, b) => a + b, 0) / comparisons.length,
    maxAbsoluteDifferenceFromCold8: Math.max(...comparisons),
    meanAbsoluteDifferenceFromCold16ShortGames: deepComparisons.reduce((a, b) => a + b, 0) / deepComparisons.length,
    maxAbsoluteDifferenceFromCold16ShortGames: Math.max(...deepComparisons)};
  const seconds = ms => (ms / 1000).toFixed(2);
  let report = '# Batched fast-preview prototype\n\n';
  report += 'Real Chrome workers on **' + manifest.cpu + '**, using SF18 at depth8, Hash16, maximum skill, one worker. Three fresh-worker runs per completed game. Include complete-game validation/preparation, worker startup, searches and scoring; exclude site fetching and UI. Every move is analysed with full history and exact original-root best/played observations.\n\n';
  report += 'The isolated prototype validates the mainline once, admits only its matching immutable root histories, and sends ucinewgame once per game. It retains search state between positions. The production scorer and website buttons are unchanged.\n\n| Game | Full moves | Previous depth8 median | Preview median | Preview range | Speedup |\n|---|---:|---:|---:|---:|---:|\n';
  for (const row of timing) report += '| [' + row.game + '](' + row.source + ') | ' + row.fullMoves + ' | ' + seconds(row.baselineDepth8Ms) + ' s | ' + seconds(row.medianMs) + ' s | ' + seconds(row.minMs) + '–' + seconds(row.maxMs) + ' s | ' + row.speedup.toFixed(1) + '× |\n';
  report += '\nAll ' + rows.length + ' whole-game previews (' + summary.verifiedHalfMoves + ' half-moves) passed independent legal replay and score re-aggregation. Preparation tests also reject mismatched histories and malformed/illegal moves, and verify that exact-score checks remain enabled with only one game reset.\n\n';
  report += 'Retaining state changes search results, so this remains an **estimated accuracy preview**, not calibrated full-review evidence. Across 12 player-sides, the mean absolute difference from the ordinary cold depth8 score was **' + summary.meanAbsoluteDifferenceFromCold8.toFixed(2) + ' points**, maximum **' + summary.maxAbsoluteDifferenceFromCold8.toFixed(2) + '**. On the three short games with existing depth16 references (six player-sides), the mean difference from cold depth16 was **' + summary.meanAbsoluteDifferenceFromCold16ShortGames.toFixed(2) + ' points**, maximum **' + summary.maxAbsoluteDifferenceFromCold16ShortGames.toFixed(2) + '**. No new depth16 references were collected for the long games.\n\n';
  report += '| Game / side | Preview accuracy | Ordinary depth8 | Difference | Depth16 reference |\n|---|---:|---:|---:|---:|\n';
  for (const row of scores) report += '| ' + row.game + ' / ' + row.color + ' | ' + row.accuracy.toFixed(1) + ' | ' + row.previousColdDepth8.toFixed(1) + ' | ' + (row.delta8 >= 0 ? '+' : '') + row.delta8.toFixed(1) + ' | ' + (row.previousColdDepth16 == null ? 'Not collected' : row.previousColdDepth16.toFixed(1)) + ' |\n';
  report += '\nThis is six fixed previously exposed games on one older desktop, not a universal latency guarantee or new accuracy calibration. Browser/WASM caches may be warm; background load and fetching the finished game can add time. The prototype demonstrates a feasible separate preview path. A production feature still needs post-game triggering, score-cache messaging, cancellation/deadline handling and the compact button UI. Full-review calibration and stored exact-review evidence must remain separate.\n\n';
  report += 'Collection: `node scripts/benchmark-engine-depths.mjs --out NEW_DIRECTORY --fast-preview`. Verification/report: `node scripts/summarize-engine-depths.mjs --input NEW_DIRECTORY --out REPORT_DIRECTORY`. Source revision: `' + manifest.revision + '`.\n\n';
  report += 'See [plan](PLAN.md), [manifest](input-manifest.json), [run timings](runs.json), [summary](summary.json) and [all raw observations](observations.json.gz). Baseline measurements come from the two earlier depth/long-game reports.\n';
  await fs.mkdir(out, {recursive: true});
  await fs.writeFile(path.join(out, 'input-manifest.json'), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(out, 'runs.json'), JSON.stringify(results, null, 2));
  await fs.writeFile(path.join(out, 'observations.json.gz'), gzipSync(JSON.stringify(raw), {level: 9}));
  await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2));
  await fs.writeFile(path.join(out, 'RESULT.md'), report);
  console.log(JSON.stringify(summary, null, 2));
}

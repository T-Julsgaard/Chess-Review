import { open, readFile, truncate, access } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Chess } from '../../lib/chess.js';
import { args, integer, hash, hashFile, json, jsonl, save, codeIdentity, snapshotCode } from './io.mjs';
import { Engine, engineConfig } from './engine.mjs';

export function searchKey(configHash, history, played = null) {
  return hash(JSON.stringify([configHash, history, played]));
}
export async function readCache(file) {
  let bytes;
  try { bytes = await readFile(file); } catch (e) { if (e.code === 'ENOENT') return new Map(); throw e; }
  // Only a torn last append may be repaired; complete bad rows are fatal.
  const last = bytes.lastIndexOf(10);
  if (last < bytes.length - 1) { await truncate(file, last + 1); bytes = bytes.subarray(0, last + 1); }
  return new Map(bytes.toString('utf8').split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); return [row.key, row]; }));
}
async function main() {
  const o = args({ dataset: 'calibration-runs/smoke/dataset', out: 'calibration-runs/smoke/n20k',
    nodes: '20000', depth: null, workers: '2', games: null, engine: 'engine/stockfish-nnue.js', 'development-only': false });
  const workers = integer(o.workers, 'workers', 1, 4);
  const budget = { kind: o.depth ? 'depth' : 'nodes', value: integer(o.depth || o.nodes, 'budget', 1, o.depth ? 40 : 100000000) };
  const config = await engineConfig(o.engine, budget), configHash = hash(JSON.stringify(config));
  const dataset = await json(path.join(o.dataset, 'manifest.json'));
  if (await hashFile(path.join(o.dataset, 'games.jsonl')) !== dataset.gamesSha256) throw Error('Dataset changed');
  let games = await jsonl(path.join(o.dataset, 'games.jsonl'));
  if (o['development-only']) games = games.filter(g => g.split !== 'test');
  if (o.games) games = games.slice(0, integer(o.games, 'games'));
  const manifestFile = path.join(o.out, 'manifest.json');
  const code = await codeIdentity();
  const binding = { datasetSha256: dataset.gamesSha256, engineConfig: config, configHash,
    gameIds: games.map(g => g.id) };
  try {
    await access(manifestFile);
    const previous = await json(manifestFile);
    // Statistical code changes must not invalidate reusable engine searches.
    const { code: previousCode, ...previousBinding } = previous.binding;
    if (JSON.stringify(previousBinding) !== JSON.stringify(binding)) throw Error('Run binding changed; choose a new output directory');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    await save(manifestFile, { schemaVersion: 1, generatedAt: new Date().toISOString(), binding, code,
      nodeVersion: process.version, oldCalibrationUsedForTraining: false, externalReviewScoresUsed: false });
  }
  const executionDir = path.join(o.out, 'executions', hash(JSON.stringify(code)));
  await snapshotCode(executionDir, code);
  await save(path.join(executionDir, 'code.json'), { code, nodeVersion: process.version });
  const cacheFile = path.join(o.out, 'evaluations.jsonl');
  const cache = await readCache(cacheFile), pending = new Map();
  const writer = await open(cacheFile, 'a');
  let writeChain = Promise.resolve();
  let newSearches = 0, cacheHits = 0, done = 0, next = 0, totalNodes = 0;
  const started = performance.now(), cpuBefore = os.cpus().map(c => c.times);
  const engines = Array.from({ length: workers }, () => new Engine(o.engine));
  const interrupted = () => { engines.forEach(e => e.close()); };
  process.once('SIGINT', interrupted); process.once('SIGTERM', interrupted);
  async function get(engine, history, played) {
    const key = searchKey(configHash, history, played);
    if (cache.has(key)) { cacheHits++; return cache.get(key); }
    if (pending.has(key)) { cacheHits++; return pending.get(key); }
    const job = (async () => {
      const result = await engine.search(history, played, budget);
      const row = { key, history: history.slice(), played: played || null, ...result };
      writeChain = writeChain.then(async () => { await writer.write(JSON.stringify(row) + '\n'); await writer.sync(); });
      await writeChain; cache.set(key, row); newSearches++;
      totalNodes += Number(/\bnodes (\d+)/.exec(result.finalSearchInfo)?.[1]) || result.nodes;
      return row;
    })();
    pending.set(key, job);
    try { return await job; } finally { pending.delete(key); }
  }
  try {
    const identities = await Promise.all(engines.map(e => e.init(config)));
    await save(path.join(o.out, 'uci.json'), identities[0]);
    await Promise.all(engines.map(async engine => {
      while (next < games.length) {
        const game = games[next++], chess = new Chess(), history = [];
        for (const played of game.moves) {
          const best = await get(engine, history, null);
          if (best.bestmove !== played) await get(engine, history, played);
          chess.move({ from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4] });
          history.push(played);
        }
        done++;
        const elapsed = (performance.now() - started) / 1000;
        console.log(`${done}/${games.length} games; ${newSearches} new searches; ${cacheHits} cache hits; ${(newSearches / elapsed).toFixed(1)} searches/s; ETA ${Math.round(elapsed / done * (games.length - done))}s`);
      }
    }));
    const elapsedSeconds = (performance.now() - started) / 1000, after = os.cpus().map(c => c.times);
    let idle = 0, total = 0;
    after.forEach((t, i) => Object.keys(t).forEach(k => { const d = t[k] - cpuBefore[i][k]; total += d; if (k === 'idle') idle += d; }));
    await save(path.join(o.out, `benchmark-${Date.now()}.json`), {
      games: done, workers, elapsedSeconds, newSearches, cacheHits, totalNodes,
      searchesPerSecond: newSearches / elapsedSeconds, gamesPerHour: done * 3600 / elapsedSeconds,
      systemCpuBusyFraction: total ? 1 - idle / total : null, cpuMeasurement: 'whole-machine activity; includes other processes',
      logicalCpus: os.cpus().length, cpu: os.cpus()[0]?.model,
      projectedHours: newSearches ? Object.fromEntries([2000, 10000, 20000].map(n => [n, n / done * elapsedSeconds / 3600])) : null,
      caveat: 'cache reuse and historical game lengths affect projections; not a worker-scaling benchmark' });
  } finally {
    engines.forEach(e => e.close()); await writeChain; await writer.close();
    process.removeListener('SIGINT', interrupted); process.removeListener('SIGTERM', interrupted);
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();

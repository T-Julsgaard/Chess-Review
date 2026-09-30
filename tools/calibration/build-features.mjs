import path from 'node:path';
import { Chess } from '../../lib/chess.js';
import { args, json, jsonl, save, hashFile, codeIdentity } from './io.mjs';
import { moveQuality, summarize, assertDisjoint } from './core.mjs';
import { searchKey, readCache } from './analyze-games.mjs';

const o = args({ dataset: 'calibration-runs/smoke/dataset', run: 'calibration-runs/smoke/n20k', 'allow-partial': false });
const manifest = await json(path.join(o.run, 'manifest.json'));
if (await hashFile(path.join(o.dataset, 'games.jsonl')) !== manifest.binding.datasetSha256) throw Error('Dataset mismatch');
const games = (await jsonl(path.join(o.dataset, 'games.jsonl'))).filter(g => manifest.binding.gameIds.includes(g.id));
assertDisjoint(games);
const cache = await readCache(path.join(o.run, 'evaluations.jsonl'));
const rows = [], skipped = [];
for (const game of games) {
  const chess = new Chess(), history = [], features = [];
  let missing = false;
  for (const played of game.moves) {
    const best = cache.get(searchKey(manifest.binding.configHash, history));
    const top = best?.bestmove === played;
    const actual = top ? best : cache.get(searchKey(manifest.binding.configHash, history, played));
    if (!best || !actual) { missing = true; break; }
    const forced = chess.moves().length === 1, color = chess.turn();
    features.push({ ply: history.length + 1, color, played, top, ...moveQuality(best.score, actual.score, { forced, top }) });
    chess.move({ from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4] }); history.push(played);
  }
  if (missing) { skipped.push(game.id); continue; }
  for (const player of game.players) rows.push({ gameId: game.id, playerId: player.id, color: player.color,
    split: game.split, ratingTarget: player.rating, band: game.band, category: game.category,
    plies: game.moves.length, ...summarize(features.filter(m => m.color === player.color)),
    moves: features.filter(m => m.color === player.color) });
}
if (skipped.length && !o['allow-partial']) throw Error(`Incomplete games: ${skipped.join(', ')}`);
await save(path.join(o.run, 'features.json'), { schemaVersion: 1, binding: manifest.binding,
  featureCode: await codeIdentity(), analysisCode: manifest.code || manifest.binding.code,
  definition: 'WDL expected-result preservation; arithmetic and RMS loss; no historical helpers', rows, skipped });
console.log(`Built ${rows.length} side samples, ${skipped.length} incomplete games`);

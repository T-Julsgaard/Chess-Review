import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {hash} from '../../../../tools/calibration/io.mjs';
import {ratingFeatures} from '../../../../lib/public-scoring.js';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';

const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const publicDir = path.join(repo, 'tools/calibration/public');
const countBy = (rows, fn) => rows.reduce((s, r) => {const k = fn(r); s[k] = (s[k] || 0) + 1; return s;}, {});
const sorted = values => [...values].sort();

// Games connected through either color's identity must share an evaluation fold.
export function playerComponents(games) {
  const parent = games.map((_, i) => i), owner = new Map();
  const find = i => {while (parent[i] !== i) {parent[i] = parent[parent[i]]; i = parent[i];} return i;};
  for (let i = 0; i < games.length; i++) for (const player of games[i].players) {
    if (!player.id) throw Error('Missing player identity');
    if (owner.has(player.id)) parent[find(i)] = find(owner.get(player.id));
    else owner.set(player.id, i);
  }
  const groups = new Map();
  games.forEach((game, i) => {const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(game.id);});
  return [...groups.values()].map(sorted).sort((a, b) => a[0].localeCompare(b[0], 'en'));
}

export function playerRoleOverlap(games, roleOf = game => game.split) {
  const roles = new Map();
  for (const game of games) for (const p of game.players) {
    if (!roles.has(p.id)) roles.set(p.id, new Set());
    roles.get(p.id).add(roleOf(game));
  }
  return [...roles.values()].filter(r => r.size > 1).length;
}

async function bytesRecord(file) {
  const bytes = await readFile(file);
  return {sha256: hash(bytes), bytes: bytes.length};
}

export async function audit() {
  const data = await openResearchData(['D001'], {purpose: 'analyze'});
  const manifest = await data.readJson('tools/calibration/public/manifest.json');
  const inputs = {}, inputHashes = {}, errors = [];
  for (const [name, expected] of Object.entries(manifest.files)) {
    const bytes = await readFile(path.join(publicDir, name));
    const decoded = name.endsWith('.gz') ? gunzipSync(bytes) : bytes;
    inputHashes[name] = {sha256: hash(bytes), uncompressedSha256: hash(decoded), bytes: bytes.length};
    if (hash(bytes) !== expected.sha256 || hash(decoded) !== expected.uncompressedSha256 || bytes.length !== expected.bytes) errors.push('Hash/size differs: ' + name);
    inputs[name] = await data.readJson('tools/calibration/public/' + name);
  }
  if (errors.length) throw Error(errors.join('\n'));
  const dataset = inputs['dataset.json.gz'], games = new Map(dataset.map(g => [g.id, g]));
  if (games.size !== dataset.length) errors.push('Duplicate normalized game IDs');
  const roleOverlap = playerRoleOverlap(dataset);
  if (roleOverlap) errors.push('Players shared between dataset roles');
  const depth = inputs['sf18-evidence.json.gz'];
  if (hash(dataset.map(g => JSON.stringify(g)).join('\n') + '\n') !== depth.datasetSha256) errors.push('Depth dataset binding differs');
  if (depth.games.some(g => JSON.stringify(g) !== JSON.stringify(games.get(g.id)))) errors.push('Depth cohort binding differs');
  const engines = {};
  for (const name of ['sf18', 'sf19']) {
    const evidence = inputs[name + '-rating-evidence.json.gz'], rowKeys = new Set(), selected = new Set();
    let invalid = 0, negativeResiduals = 0, decisions = 0;
    for (const row of evidence.rows) {
      const key = row.gameId + ':' + row.color, game = games.get(row.gameId), player = game?.players.find(p => p.color === row.color);
      if (rowKeys.has(key)) {errors.push('Duplicate rating side: ' + name); continue;}
      rowKeys.add(key); selected.add(row.gameId);
      if (!player || row.playerId !== player.id || row.ratingTarget !== player.rating || row.split !== 'train' || game.split !== 'train') errors.push('Unbound rating side: ' + name);
      const moves = row.contextMoves;
      if (moves.length !== game?.moves.filter((_, i) => (i % 2 ? 'b' : 'w') === row.color).length) invalid++;
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i], residual = m.bestExpected - m.playedExpected;
        const loss = m.top || !m.eligible ? 0 : Math.max(0, residual);
        if (m.color !== row.color || m.ply !== 2 * i + (row.color === 'w' ? 1 : 2)
            || !Number.isInteger(m.legalChoices) || m.legalChoices < 1 || m.eligible !== (m.legalChoices > 1)
            || ![m.bestExpected, m.playedExpected].every(v => Number.isFinite(v) && v >= 0 && v <= 1)
            || Math.abs(m.loss - loss) > 1e-12 || Math.abs(m.residual - residual) > 1e-12
            || Math.abs(m.quality - 100 * (1 - loss)) > 1e-10) invalid++;
        if (m.eligible) decisions++;
        if (m.eligible && residual < -.02) negativeResiduals++;
      }
      if (Object.values(ratingFeatures(moves)).some(v => !Number.isFinite(v))) invalid++;
    }
    if (invalid) errors.push('Invalid move/feature records: ' + name + ':' + invalid);
    const selectedGames = dataset.filter(g => selected.has(g.id));
    const components = playerComponents(selectedGames);
    const missingSides = [];
    for (const game of selectedGames) {
      const missing = game.players.filter(p => !rowKeys.has(game.id + ':' + p.color));
      if (!missing.length) continue;
      const chess = new Chess(), decisions = {w:0, b:0};
      for (const move of game.moves) {
        if (chess.moves().length > 1) decisions[chess.turn()]++;
        chess.move({from:move.slice(0,2), to:move.slice(2,4), promotion:move[4]});
      }
      missingSides.push(...missing.map(p => ({gameId:game.id, color:p.color, decisions:decisions[p.color],
        reason:decisions[p.color] < 10 ? 'Below maintained ten-decision rating threshold' : 'Unexplained exclusion'})));
      if (missing.some(p => decisions[p.color] >= 10)) errors.push('Unexplained missing rating side: ' + name);
    }
    const foldOf = g => parseInt(hash('fullgame-context-fold-v1:' + g.id).slice(0, 8), 16) % 5;
    engines[name] = {games: selected.size, sides: rowKeys.size, missingSides, decisions, negativeResidualsBelowMinus002: negativeResiduals,
      invalidRecords: invalid, engineConfig: evidence.engineConfig, componentCount: components.length,
      largestComponentGames: Math.max(...components.map(c => c.length)), componentSizes: countBy(components, c => c.length),
      playersCrossingExistingGameFolds: playerRoleOverlap(selectedGames, foldOf),
      datasetRoleCounts: countBy(selectedGames, g => g.split)};
  }
  const archived = [];
  for (const study of ['sf19-quality', 'sf19-choice-confirmation']) {
    // Ignored local studies are not registered inputs. Use only retained,
    // hash-bound snapshots; a new local study must be registered before use.
    archived.push(await data.readJson('research/experiments/E001-evidence-audit/evidence/' + study + '-archive.json'));
  }
  const allConsumed = new Set(archived.flatMap(a => a.consumedTestIds));
  const output = {
    schema: 'research-evidence-audit-v1', dataset: 'D001', inputHashes,
    dataEligibility: data.receipt,
    baselineFiles: Object.fromEntries(await Promise.all(['data/calibration.json', 'lib/public-scoring.js', 'tools/calibration/PUBLIC_METHOD.md'].map(async file => [file, await bytesRecord(path.join(repo, file))]))),
    normalized: {games: dataset.length, uniqueGames: games.size, players: new Set(dataset.flatMap(g => g.players.map(p => p.id))).size,
      roles: countBy(dataset, g => g.split), categories: countBy(dataset, g => g.category), months: countBy(dataset, g => g.sourceMonth),
      playersCrossingRoles: roleOverlap},
    depth: {games: depth.games.length, roles: countBy(depth.games, g => g.split), positions: depth.positions.length, searches: depth.searches.length, configHash: depth.configHash},
    rating: engines,
    priorExposure: {localStudies: archived.map(a => ({study: a.study, testGames: a.consumedTestIds.length, unknownGames: a.unknownGames.length})),
      knownConsumedTestGames: allConsumed.size, consumedTestIds: sorted(allConsumed),
      remainingTestStatus: 'Unknown earlier exposure; metadata inspected. Not certified fresh.'},
    errors, passed: errors.length === 0,
  };
  return {output, archived};
}

async function main() {
  const {output, archived} = await audit();
  const out = fileURLToPath(new URL('../evidence/', import.meta.url));
  await mkdir(out, {recursive: true});
  await writeFile(path.join(out, 'audit.json'), JSON.stringify(output, null, 2) + '\n');
  for (const a of archived) await writeFile(path.join(out, a.study + '-archive.json'), JSON.stringify(a, null, 2) + '\n');
  console.log(JSON.stringify({passed: output.passed, roles: output.normalized.roles,
    rating: Object.fromEntries(Object.entries(output.rating).map(([engine, r]) => [engine, {games:r.games, sides:r.sides, components:r.componentCount, largest:r.largestComponentGames, foldPlayerOverlap:r.playersCrossingExistingGameFolds, invalid:r.invalidRecords}])),
    knownConsumedTestGames: output.priorExposure.knownConsumedTestGames, errors: output.errors}, null, 2));
  if (!output.passed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

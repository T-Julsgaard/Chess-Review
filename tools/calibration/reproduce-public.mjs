import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Chess} from '../../lib/chess.js';
import {hash} from './io.mjs';
import {assertDisjoint} from './core.mjs';
import {fitHumanOutcome,humanExpected,humanMoveQuality,humanGameAccuracy} from './human-policy.mjs';
import {fitGroupedHumanChoice} from './grouped-human-choice.mjs';
import {fitFullgameContext} from './fullgame-context.mjs';
import {fitHuber} from './fit-huber.mjs';
import {fitSf19Context} from './sf19-context.mjs';
import {ratingFeatures,publicMoveQuality,publicGameAccuracy,contextualRating,movesOnlyRating} from '../../lib/public-scoring.js';

const root = new URL('./public/', import.meta.url);
export async function publicInput(name, manifest) {
  if (!Object.hasOwn(manifest.files, name)) throw Error('Undeclared public input');
  const bytes = await readFile(new URL(name, root));
  if (hash(bytes) !== manifest.files[name].sha256) throw Error('Public input hash differs: ' + name);
  const decoded = name.endsWith('.gz') ? gunzipSync(bytes) : bytes;
  if (hash(decoded) !== manifest.files[name].uncompressedSha256) throw Error('Decoded public input differs');
  return JSON.parse(decoded);
}

export function replayPublic(evidence, manifest) {
  const games = evidence.games;
  assertDisjoint(games);
  if (games.length !== 125 || games.filter(g => g.split === 'train').length !== 100
      || games.some(g => !['train', 'validation'].includes(g.split))) throw Error('Public roles differ');
  const cache = new Map();
  for (const row of evidence.searches) {
    const key = hash(JSON.stringify([evidence.configHash, row.history, row.played]));
    if (key !== row.key || cache.has(key)) throw Error('Invalid public search identity');
    cache.set(key, row);
  }
  const get = (history, played = null) => {
    const row = cache.get(hash(JSON.stringify([evidence.configHash, history, played])));
    if (!row) throw Error('Missing public observation');
    return row;
  };
  const outcomes = [];
  for (const game of games.filter(g => g.split === 'train')) {
    const target = {'1-0': 1, '0-1': 0, '1/2-1/2': .5}[game.result], rows = [];
    if (target == null) throw Error('Invalid game points');
    for (const ply of manifest.recipe.outcomePlies) {
      if (ply > game.moves.length) continue;
      const score = get(game.moves.slice(0, ply - 1)).score;
      if (score.cp == null) continue;
      rows.push({gameId: game.id, split: 'train', cp: (ply % 2 ? 1 : -1) * score.cp, target, weight: 1});
    }
    outcomes.push(...rows.map(row => ({...row, weight: 1 / rows.length})));
  }
  const outcome = fitHumanOutcome(outcomes);
  const choices = evidence.positions.filter(p => p.split === 'train').map(position => {
    const game = games.find(g => g.id === position.gameId);
    if (!game || game.split !== 'train' || game.moves[position.ply - 1] !== position.played
        || JSON.stringify(game.moves.slice(0, position.ply - 1)) !== JSON.stringify(position.history)) throw Error('Choice binding differs');
    const chess = new Chess();
    for (const move of position.history) chess.move({from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4]});
    const legal = chess.moves({verbose: true}).map(m => m.from + m.to + (m.promotion || '')).sort();
    if (JSON.stringify(legal) !== JSON.stringify(position.legalMoves)) throw Error('Incomplete legal choices');
    return {gameId: position.gameId, positionId: String(position.ply), split: 'train',
      utilities: legal.map(move => {const row = get(position.history, move); if (row.bestmove !== move) throw Error('Restricted move differs'); return humanExpected(row.score, outcome);}),
      playedIndex: legal.indexOf(position.played)};
  });
  if (choices.length !== 320) throw Error('Incomplete choice sample');
  const choice = fitGroupedHumanChoice(choices), quality = {outcome, choice}, scores = [], runtimeScores = [];
  for (const game of games) {
    const chess = new Chess(), history = [], moves = [], runtimeMoves = [];
    for (const played of game.moves) {
      const best = get(history), top = best.bestmove === played, actual = top ? best : get(history, played);
      if (!top && actual.bestmove !== played) throw Error('Played search differs');
      const color = chess.turn(), flags = {top, forced: chess.moves().length === 1};
      moves.push({color, ...humanMoveQuality(best.score, actual.score, quality, flags)});
      runtimeMoves.push({color, ...publicMoveQuality(best.score, actual.score, quality, flags)});
      chess.move({from: played.slice(0, 2), to: played.slice(2, 4), promotion: played[4]}); history.push(played);
    }
    for (const player of game.players) {
      const side = moves.filter(m => m.color === player.color), runtimeSide = runtimeMoves.filter(m => m.color === player.color);
      scores.push({gameId: game.id, color: player.color, split: game.split, ratingTarget: player.rating,
        accuracy: humanGameAccuracy(side), decisions: side.filter(m => m.eligible).length});
      runtimeScores.push(publicGameAccuracy(runtimeSide));
    }
  }
  const contextRows = scores.filter(r => r.split === 'train').map(r => ({gameId: r.gameId, color: r.color,
    split: r.split, rating: r.ratingTarget, quality: r.accuracy, decisions: r.decisions}));
  return {outcome, choice, context: fitFullgameContext(contextRows), scores, runtimeScores};
}

async function main() {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root)));
  const evidence = await publicInput('sf18-evidence.json.gz', manifest);
  const dataset = await publicInput('dataset.json.gz', manifest);
  if (hash(dataset.map(game => JSON.stringify(game)).join('\n') + '\n') !== evidence.datasetSha256) throw Error('Normalized dataset identity differs');
  const publicGames = new Map(dataset.map(game => [game.id, game]));
  if (evidence.games.some(game => JSON.stringify(game) !== JSON.stringify(publicGames.get(game.id)))) throw Error('Public cohort differs from dataset');
  const replay = replayPublic(evidence, manifest);
  const reconstructedRatings = {};
  for (const engine of ['sf18', 'sf19']) {
    const inputs = await publicInput(engine + '-rating-evidence.json.gz', manifest);
    const recipe = {sf18: {lambda: 1, delta: 100}, sf19: {lambda: 10, delta: 250}}[engine];
    const names = ['logRmsLoss', 'topRate', 'earlyRmsLoss', 'contestedRmsLoss', 'contestedFraction',
      'earlyTopRate', 'middleTopRate', 'decisionsLog', 'legalChoicesLog'];
    const rows = inputs.rows.map(row => ({...row, ...ratingFeatures(row.contextMoves)}));
    if (rows.some(r => r.split !== 'train')) throw Error('Rating roles differ');
    reconstructedRatings[engine] = {model: fitHuber(rows, recipe.lambda, names, recipe.delta), inputs};
  }
  const sf19Context = fitSf19Context(reconstructedRatings.sf19.inputs);
  // Expected outputs are opened only after all training coefficients are reconstructed.
  const expected = JSON.parse(await readFile(new URL('../../data/calibration.json', import.meta.url)));
  const scores = await publicInput('expected-scores.json', manifest);
  const exact = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const checks = {
    outcome: exact(replay.outcome, expected.quality.outcome), choice: exact(replay.choice, expected.quality.choice),
    context: exact(replay.context, expected.context.model), scores: exact(replay.scores, scores),
    runtimeAccuracy: replay.scores.every((r, i) => r.accuracy === replay.runtimeScores[i]),
    sf19Context: exact(sf19Context, expected.context.sf19),
  };
  for (const engine of ['sf18', 'sf19']) {
    const {model, inputs} = reconstructedRatings[engine];
    checks[engine + 'Rating'] = exact(model, expected.movesOnly[engine].model);
    checks[engine + 'Protocol'] = exact(inputs.engineConfig, expected.movesOnly[engine].engineConfig);
    checks[engine + 'Predictions'] = inputs.rows.every(row => Number.isFinite(movesOnlyRating(row.contextMoves, model)));
  }
  checks.contextPredictions = replay.scores.every(row => Number.isFinite(contextualRating(row.ratingTarget,
    row.accuracy, row.decisions, replay.context)?.rating));
  console.log(JSON.stringify({schema: 'public-reproduction-v1', checks, publicSides: scores.length,
    sf19ContextValidation: sf19Context.developmentValidation,
    fittingSearches: 0, networkRequests: 0, subprocesses: 0, passed: Object.values(checks).every(Boolean)}, null, 2));
  if (!Object.values(checks).every(Boolean)) throw Error('Public reproduction differs');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();

import {hash} from './io.mjs';
import {fitFullgameContext} from './fullgame-context.mjs';
import {empiricalCrps} from './peer-quality.mjs';
import {ratingGameQuality} from '../../lib/public-scoring.js';

export function fitSf19Context(evidence) {
  const config = evidence.engineConfig;
  if (config?.majorVersion !== 19 || config.budget?.kind !== 'nodes' || config.budget.value !== 20000
      || config.options?.Hash !== 32 || config.options?.MultiPV !== 1 || config.options?.['Skill Level'] !== 20) {
    throw Error('SF19 contextual search protocol differs');
  }
  const rows = evidence.rows.map(row => ({gameId: row.gameId, color: row.color, split: row.split,
    rating: row.ratingTarget, decisions: row.contextMoves.filter(move => move.eligible).length,
    quality: ratingGameQuality(row.contextMoves)}));
  const model = fitFullgameContext(rows);
  // Compare against the same public peers without conditioning on rating.
  // Both colors stay in one fold, and each game contributes unit total weight.
  const foldOf = id => parseInt(hash('fullgame-context-fold-v1:' + id).slice(0, 8), 16) % 5;
  let loss = 0, weight = 0;
  const folds = [];
  for (let fold = 0; fold < 5; fold++) {
    const training = model.peers.filter(row => foldOf(row.gameId) !== fold);
    const heldout = model.peers.filter(row => foldOf(row.gameId) === fold);
    const total = training.reduce((sum, row) => sum + row.weight, 0);
    const weights = training.map(row => row.weight / total);
    let foldLoss = 0, foldWeight = 0;
    for (const row of heldout) {
      foldLoss += row.weight * empiricalCrps(training, weights, row.quality);
      foldWeight += row.weight;
    }
    folds.push({fold, crps: foldLoss / foldWeight, games: new Set(heldout.map(row => row.gameId)).size});
    loss += foldLoss; weight += foldWeight;
  }
  const crps = model.trainingCandidates[0].crps, baselineCrps = loss / weight;
  const qualityDefinition = 'Arithmetic mean of 100 * (1 - fixed-node WDL expected-point loss) over nonforced decisions; top moves have zero loss.';
  return {candidateVersion: hash(JSON.stringify({config, qualityDefinition, model})), model, engineConfig: config, qualityDefinition,
    developmentValidation: {games: model.games, sides: model.sides, folds: 5, crps, baselineCrps,
      improvementFraction: 1 - crps / baselineCrps, baselineFolds: folds,
      limitations: 'Game-disjoint training-fold assessment also selects bandwidth. Existing rating-training evidence is reused; no untouched final test or true-rating validation.'}};
}

import {fileURLToPath} from 'node:url';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {loadBoard} from './board.mjs';
import {validatePolicy} from './policy.mjs';
import {cohort} from './cohort.mjs';
import {prepare} from './prepare.mjs';
export const prefix='research/experiments/E012-offer-evidence/evidence/';
export async function loadCohort(access){
  const dataset=await access.readJson('tools/calibration/public/dataset.json.gz'),pack=await access.readJson('research/experiments/E005-category-review/evidence/cases.json'),key=await access.readJson('research/experiments/E005-category-review/evidence/selection-key.json'),policy=await access.readJson(prefix+'policy.json'),
    file=fileURLToPath(new URL('../../../../engine/stockfish-nnue.js',import.meta.url)),configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})},board=await loadBoard();
  validatePolicy(policy,configs,board.blockSha256);
  for(const c of key.cases)if(JSON.stringify(access.gameOrigin(c.gameId))!==JSON.stringify(c.origin))throw Error('Case source locator differs');
  return{dataset,pack,key,policy,board,selected:cohort(pack,key,dataset)};
}
export async function loadInputs(access){const inputs=await loadCohort(access),evidence=await access.readJson(prefix+'sf18-observations.json.gz');return{...inputs,evidence,prepared:prepare(evidence,inputs.pack,inputs.key,inputs.dataset,inputs.policy)};}

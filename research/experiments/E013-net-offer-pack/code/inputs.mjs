import {fileURLToPath} from 'node:url';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {loadBoard} from '../../E012-offer-evidence/code/board.mjs';
import {validatePolicy as validateParent} from '../../E012-offer-evidence/code/policy.mjs';
import {makePolicy,validatePolicy} from './policy.mjs';
import {verifyPack} from './selection.mjs';
import {validatePanel} from '../../../root-panel.mjs';
export const prefix='research/experiments/E013-net-offer-pack/';
export async function parents(access){
  const dataset=await access.readJson('tools/calibration/public/dataset.json.gz'),context=await access.readJson('tools/calibration/public/sf18-rating-evidence.json.gz'),original=await access.readJson('research/experiments/E005-category-review/evidence/selection-key.json'),parent=await access.readJson('research/experiments/E012-offer-evidence/evidence/policy.json'),board=await loadBoard(),
    file=fileURLToPath(new URL('../../../../engine/stockfish-nnue.js',import.meta.url)),configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})};
  validateParent(parent,configs,board.blockSha256);return{dataset,context,excluded:new Set(original.cases.map(c=>c.gameId)),board,parent,policy:makePolicy(parent)};
}
export async function loadCohort(access){const input=await parents(access),policy=await access.readJson(prefix+'evidence/policy.json'),pack=await access.readJson(prefix+'evidence/cases.json'),key=await access.readJson(prefix+'evidence/selection-key.json');validatePolicy(policy,input.parent);
  for(const c of key.cases)if(JSON.stringify(c.origin)!==JSON.stringify(access.gameOrigin(c.gameId)))throw Error('Source locator differs');const selected=verifyPack(pack,key,input.dataset,input.context,input.excluded,input.board);return{...input,policy,pack,key,selected};}
export async function loadInputs(access){const input=await loadCohort(access),raw=await access.readJson(prefix+'evidence/sf18-observations.json.gz'),prepared=validatePanel(raw,input.selected,input.selected.map(c=>input.dataset.find(g=>g.id===c.gameId)),input.policy,input.pack.packId);return{...input,raw,prepared};}

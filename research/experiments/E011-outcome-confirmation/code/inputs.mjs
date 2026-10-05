import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {validateFreeze} from './models.mjs';
import {prepare} from './prepare.mjs';
export async function loadInputs(access){
  const root=fileURLToPath(new URL('../../../../',import.meta.url)),file=path.join(root,'engine/stockfish-19-lite-single.js'),configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})},
    dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),evidence=await access.readJson('research/experiments/E011-outcome-confirmation/evidence/sf19-observations.json.gz'),
    freeze=await access.readJson('research/experiments/E011-outcome-confirmation/evidence/models.json'),source=await access.readJson('research/experiments/E010-candidate-stability/evidence/models.json');
  validateFreeze(freeze,source,configs['20k']);return{prepared:prepare(evidence,dataset,configs),freeze,evidence,dataset};
}

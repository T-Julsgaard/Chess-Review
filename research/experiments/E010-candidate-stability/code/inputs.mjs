import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {prepare} from '../../E008-human-quality-curves/code/prepare.mjs';
import {evaluate as validateBindings} from '../../E009-search-stability/code/evaluate.mjs';
import {validateFreeze} from './models.mjs';
export async function loadInputs(access){
  const root=fileURLToPath(new URL('../../../../',import.meta.url)),base='research/experiments/E008-human-quality-curves/evidence/',
    dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),low=await access.readJson(base+'sf19-observations.json.gz'),
    high=await access.readJson('research/experiments/E009-search-stability/evidence/sf19-observations.json.gz'),report=await access.readJson(base+'results.json'),
    freeze=await access.readJson('research/experiments/E010-candidate-stability/evidence/models.json'),file=path.join(root,'engine/stockfish-19-lite-single.js');
  const config=await engineConfig(file,{kind:'nodes',value:20000});validateFreeze(freeze,report,config);
  prepare(low,dataset,config);
  const bound=validateBindings(high,low,await engineConfig(file,{kind:'nodes',value:80000}));
  return{high,low,freeze,metadata:bound.records};
}

// Reconstruct input bindings and folds independently of saved prediction records.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {openResearchData} from '../../../data-policy.mjs';
import {hash} from '../../../../tools/calibration/io.mjs';
import {observations,mapsFor,metrics} from './evaluate.mjs';
import {predict} from './model.mjs';

const access=await openResearchData(['D001'],{purpose:'reuse'});
const base='research/experiments/E004-practical-outcomes/evidence/';
const report=await access.readJson(base+'results.json'),records=await access.readJson(base+'predictions.json.gz');
const run=JSON.parse(await readFile(new URL('../evidence/run.json',import.meta.url)));
for(const name of ['results.json','predictions.json.gz'])if(hash(await readFile(new URL('../evidence/'+name,import.meta.url)))!==run.outputs[name])throw Error('Output hash differs');
if(report.smoke)throw Error('Smoke is not full evidence');
const dataset=await access.readJson('tools/calibration/public/dataset.json.gz'),engines={};
for(const engine of ['sf18','sf19']){
  const evidence=await access.readJson('tools/calibration/public/'+engine+'-rating-evidence.json.gz');
  const {rows}=observations(evidence,dataset),ids=new Set(rows.map(r=>r.gameId)),maps=mapsFor(dataset.filter(g=>ids.has(g.id)));
  const trainingCounts=new Map(Array.from({length:5},(_,fold)=>[fold,new Set(rows.filter(r=>maps.outer.get(r.gameId)!==fold).map(r=>r.gameId)).size]));
  const key=r=>r.gameId+':'+r.color+':'+r.ply,byKey=new Map(rows.map(r=>[key(r),r])),seen=new Set();
  if(records[engine].length!==rows.length)throw Error('Coverage count differs');
  for(const saved of records[engine]){
    const source=byKey.get(key(saved));
    if(!source||seen.has(key(saved))||saved.fold!==maps.outer.get(saved.gameId))throw Error('Binding or fold differs');
    seen.add(key(saved));
    for(const name of Object.keys(source))if(saved[name]!==source[name])throw Error('Input binding differs: '+name);
    const fold=report.reports[engine].folds.find(f=>f.fold===saved.fold);
    for(const [family,model]of Object.entries(fold.models)){
      const trainingGames=trainingCounts.get(saved.fold);
      if(!model.converged||model.trainingGames!==trainingGames||model.coefficients.slice(0,model.positiveSlopeCoordinates).some(b=>b<0))throw Error('Invalid fit diagnostics');
      if(Math.abs(predict(model,source)-saved[family])>1e-12)throw Error('Prediction differs');
    }
    if(saved.raw!==source.p)throw Error('Raw comparator differs');
  }
  for(const family of ['raw','scalar','static','phaseSkill']){
    const measured=metrics(records[engine],records[engine].map(r=>r[family]));
    for(const name of Object.keys(measured))if(Math.abs(measured[name]-report.reports[engine].metrics[family][name])>1e-12)throw Error('Metric differs');
  }
  engines[engine]={games:ids.size,positions:seen.size,completeUniqueOOF:true,playerDisjoint:true,bindingsAndPredictions:true,metrics:true};
}
const result={schema:'E004-verification-v1',passed:true,engines,verifiedOutputHashes:run.outputs,dataEligibility:access.receipt,
  verifierSha256:hash(await readFile(fileURLToPath(import.meta.url)))};
await writeFile(new URL('../evidence/verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,engines}));

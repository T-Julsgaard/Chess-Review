// Independently check retained fold provenance, train-only scaling and prediction bindings.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {openResearchData} from '../../../data-policy.mjs';
import {hash} from '../../../../tools/calibration/io.mjs';
import {predict} from '../../../../tools/calibration/fit-rating.mjs';
import {featuresFor,foldMaps} from './evaluate.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--out' || !args[1]))throw Error('Usage: verify.mjs [--out research/runs/<run>/]');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));
const relative=path.relative(path.join(root,'research/runs'),out);
if(args.length && (relative.startsWith('..')||path.isAbsolute(relative)))throw Error('Verification output must stay under research/runs');
const data=await openResearchData(['D001'],{purpose:'reuse'});
const reportPath=new URL('../evidence/results.json',import.meta.url);
const report=await data.readJson('research/experiments/E002-nonlinear-rating/evidence/results.json');
const run=JSON.parse(await readFile(new URL('../evidence/run.json',import.meta.url)));
const predictionBytes=await readFile(new URL('../evidence/predictions.json.gz',import.meta.url));
if(hash(await readFile(reportPath))!==run.outputs['results.json']||hash(predictionBytes)!==run.outputs['predictions.json.gz'])throw Error('Output hashes differ');
if(report.smoke)throw Error('Smoke output cannot stand in for full evaluation');
const predictions=await data.readJson('research/experiments/E002-nonlinear-rating/evidence/predictions.json.gz');
const dataset=await data.readJson('tools/calibration/public/dataset.json.gz'),engines={};
for(const engine of ['sf18','sf19']){
  const evidence=await data.readJson('tools/calibration/public/'+engine+'-rating-evidence.json.gz'),ids=new Set(evidence.rows.map(r=>r.gameId));
  const games=dataset.filter(g=>ids.has(g.id)),folds=foldMaps(games),rows=evidence.rows.map(r=>({...r,...featuresFor(r)}));
  const byKey=new Map(rows.map(r=>[r.gameId+':'+r.color,r])),seen=new Set();
  if(predictions[engine].length!==rows.length)throw Error('Missing out-of-fold predictions');
  for(const fold of report.reports[engine].folds){
    const train=rows.filter(r=>folds.outer.get(r.gameId)!==fold.fold),test=rows.filter(r=>folds.outer.get(r.gameId)===fold.fold);
    const trainPlayers=new Set(train.map(r=>r.playerId));
    if(test.some(r=>trainPlayers.has(r.playerId)))throw Error('Player leakage in stored outer split');
    for(const model of Object.values(fold.models))for(let i=0;i<model.featureNames.length;i++){
      const name=model.featureNames[i],center=train.reduce((s,r)=>s+r[name],0)/train.length;
      const scale=Math.sqrt(train.reduce((s,r)=>s+(r[name]-center)**2,0)/train.length)||1;
      if(Math.abs(center-model.center[i])>1e-10||Math.abs(scale-model.scale[i])>1e-10)throw Error('Scaler is not fitted on outer training observations');
    }
  }
  for(const row of predictions[engine]){
    const key=row.gameId+':'+row.color,source=byKey.get(key);
    if(!source||seen.has(key)||source.ratingTarget!==row.ratingTarget||source.playerId!==row.playerId||folds.outer.get(row.gameId)!==row.fold)throw Error('Prediction binding/coverage differs');
    seen.add(key);
    const fold=report.reports[engine].folds[row.fold];
    for(const [name,model]of Object.entries(fold.models))if(Math.abs(predict(model,source)-row[name])>1e-10)throw Error('Stored prediction differs');
    if(row.median!==fold.median)throw Error('Median comparator differs');
  }
  engines[engine]={sides:seen.size,outerFolds:5,playerOverlap:0,trainOnlyScaling:true,predictionBindings:true};
}
const result={schema:'E002-fold-verification-v1',passed:true,engines,verifiedOutputHashes:run.outputs,
  dataEligibility:data.receipt,
  verifierSha256:hash(await readFile(fileURLToPath(import.meta.url)))};
await mkdir(out,{recursive:true});
await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:result.passed,engines,dataPolicy:data.receipt.policyVersion},null,2));

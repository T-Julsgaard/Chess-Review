// Independently check retained fold provenance, train-only scaling and prediction bindings.
import {readFile, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {publicInput} from '../../../../tools/calibration/reproduce-public.mjs';
import {hash} from '../../../../tools/calibration/io.mjs';
import {predict} from '../../../../tools/calibration/fit-rating.mjs';
import {featuresFor,foldMaps} from './evaluate.mjs';

const reportPath=new URL('../evidence/results.json',import.meta.url);
const report=JSON.parse(await readFile(reportPath));
const run=JSON.parse(await readFile(new URL('../evidence/run.json',import.meta.url)));
const predictionBytes=await readFile(new URL('../evidence/predictions.json.gz',import.meta.url));
if(hash(await readFile(reportPath))!==run.outputs['results.json']||hash(predictionBytes)!==run.outputs['predictions.json.gz'])throw Error('Output hashes differ');
if(report.smoke)throw Error('Smoke output cannot stand in for full evaluation');
const predictions=JSON.parse(gunzipSync(predictionBytes));
const manifest=JSON.parse(await readFile(new URL('../../../../tools/calibration/public/manifest.json',import.meta.url)));
const dataset=await publicInput('dataset.json.gz',manifest),engines={};
for(const engine of ['sf18','sf19']){
  const evidence=await publicInput(engine+'-rating-evidence.json.gz',manifest),ids=new Set(evidence.rows.map(r=>r.gameId));
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
  verifierSha256:hash(await readFile(fileURLToPath(import.meta.url)))};
await writeFile(new URL('../evidence/verification.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));

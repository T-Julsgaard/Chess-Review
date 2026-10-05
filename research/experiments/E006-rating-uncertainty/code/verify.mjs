import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fit as ridge,predict} from '../../../../tools/calibration/fit-rating.mjs';
import {rowsFor,foldMaps,partition,fitPoint,scaleNames,scaleAt,gameScores,quantile,summary} from './method.mjs';

const args=process.argv.slice(2),root=fileURLToPath(new URL('../../../../',import.meta.url));
if(args.length&&!(args.length===2&&args[0]==='--out'))throw Error('Only --out <research directory> is allowed');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));
if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output escapes research');
const access=await openResearchData(['D001'],{purpose:'reuse'}),base='research/experiments/E006-rating-uncertainty/evidence/';
const report=await access.readJson(base+'results.json'),records=await access.readJson(base+'predictions.json.gz'),run=await access.readJson(base+'run.json');
if(report.smoke)throw Error('Smoke is not full evidence');
for(const [name,h]of Object.entries(run.outputs))if(sha256(await readFile(new URL('../evidence/'+name,import.meta.url)))!==h)throw Error('Output hash differs');
const dataset=await access.readJson('tools/calibration/public/dataset.json.gz'),engines={};
const compare=(a,b,label)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(label+' differs');};
const compareModel=(a,b,label)=>{compare(a.featureNames,b.featureNames,label+' names');for(const key of ['center','scale','coefficients'])for(let i=0;i<a[key].length;i++)if(Math.abs(a[key][i]-b[key][i])>1e-10)throw Error(label+' parameters differ');};
for(const engine of ['sf18','sf19']){
  const evidence=await access.readJson('tools/calibration/public/'+engine+'-rating-evidence.json.gz'),rows=rowsFor(evidence),ids=new Set(rows.map(r=>r.gameId));
  const maps=foldMaps(dataset.filter(g=>ids.has(g.id))),byKey=new Map(rows.map(r=>[r.gameId+':'+r.color,r])),seen=new Set();
  for(const fold of report.reports[engine].folds){
    const parts=partition(rows,maps,fold.fold),fitIds=[...new Set(parts.fit.map(r=>r.gameId))].sort(),calIds=[...new Set(parts.calibration.map(r=>r.gameId))].sort(),testIds=[...new Set(parts.test.map(r=>r.gameId))].sort();
    compare(fitIds,fold.fitGames,'Fit IDs');compare(calIds,fold.calibrationGames,'Calibration IDs');compare(testIds,fold.testGames,'Test IDs');
    compareModel(fitPoint(parts.fit,engine),fold.point,'Refitted point');
    const scored=[];
    for(const inner of fold.scale.innerModels){
      const train=parts.fit.filter(r=>maps.inner.get(r.gameId)!==inner.fold),test=parts.fit.filter(r=>maps.inner.get(r.gameId)===inner.fold);
      compare([...new Set(train.map(r=>r.gameId))].sort(),inner.trainingGames,'Inner IDs');compareModel(fitPoint(train,engine),inner.point,'Inner point');
      for(const row of test){const prediction=predict(inner.point,row);scored.push({...row,prediction,ratingTarget:Math.log1p(Math.abs(prediction-row.ratingTarget))});}
    }
    if(new Set(scored.map(r=>r.gameId+':'+r.color)).size!==parts.fit.length)throw Error('Inner OOF coverage differs');
    compare(sha256(JSON.stringify(scored.map(r=>({gameId:r.gameId,color:r.color,prediction:r.prediction,target:r.ratingTarget})))),fold.scale.innerOOFHash,'Inner residual bindings');
    compareModel(ridge(scored,10,scaleNames),fold.scale.model,'Training-only scale');
    const raw=gameScores(parts.calibration,fold.point),normalized=gameScores(parts.calibration,fold.point,fold.scale.model);
    compare(sha256(JSON.stringify(raw)),fold.calibrationRawHash,'Calibration raw scores');compare(sha256(JSON.stringify(normalized)),fold.calibrationNormalizedHash,'Calibration normalized scores');
    compare(quantile(raw.map(([,s])=>s)),fold.constant,'Constant order statistic');compare(quantile(normalized.map(([,s])=>s)),fold.adaptive,'Adaptive order statistic');
    const saved=records[engine].filter(r=>r.fold===fold.fold);
    if(saved.length!==parts.test.length)throw Error('Outer fold coverage differs');
    for(const row of saved){
      const key=row.gameId+':'+row.color,source=byKey.get(key);if(!source||seen.has(key)||maps.outer.get(row.gameId)!==row.fold||source.playerId!==row.playerId||source.ratingTarget!==row.ratingTarget||source.decisions!==row.decisions)throw Error('Outer binding differs');seen.add(key);
      const p=predict(fold.point,source),s=scaleAt(fold.scale.model,source,p);
      if(p!==row.point||s!==row.scale)throw Error('Point or scale prediction differs');
      compare([p-fold.constant.q,p+fold.constant.q],row.constant,'Constant interval');compare([p-fold.adaptive.q*s,p+fold.adaptive.q*s],row.adaptive,'Adaptive interval');
    }
    for(const family of ['constant','adaptive'])compare(summary(saved,family),fold.metrics[family],'Fold metrics');
  }
  if(seen.size!==rows.length)throw Error('Full OOF coverage differs');
  for(const family of ['constant','adaptive'])compare(summary(records[engine],family),report.reports[engine][family],'Overall metrics');
  engines[engine]={games:ids.size,sides:seen.size,threeRolesDisjoint:true,innerScalesCrossFitted:true,refittedParameters:true,gameMaximumCalibration:true,uniqueCompleteOOF:true,intervalBindings:true};
}
const result={schema:'E006-verification-v1',passed:true,engines,verifiedOutputHashes:run.outputs,dataEligibility:access.receipt,
  verifierSha256:sha256(await readFile(fileURLToPath(import.meta.url)))};
await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:true,engines}));

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {predict} from '../../../../tools/calibration/fit-rating.mjs';
import {rowsFor,foldMaps,partition,fitPoint,fitScale,scaleAt,gameScores,quantile,summary,perGame,bootstrap,groupLabels} from './method.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
export function assess(records,seed,iterations){
  const constant=summary(records,'constant'),adaptive=summary(records,'adaptive'),first=perGame(records,'constant'),second=perGame(records,'adaptive');
  const width=bootstrap(first.map((r,i)=>r.width-second[i].width),seed,iterations),score=bootstrap(first.map((r,i)=>r.score-second[i].score),seed+1,iterations),coverage=bootstrap(second.map(r=>r.coverage),seed+2,iterations);
  const groups=[...new Set(records.flatMap(groupLabels))].sort().map(label=>{
    const subset=records.filter(r=>groupLabels(r).includes(label)),a=summary(subset,'constant'),b=summary(subset,'adaptive');
    return{label,constant:a,adaptive:b,sufficient:a.games>=30,passed:a.games<30?null:b.coverage>=.8&&b.coverage>=a.coverage-.03};
  });
  const narrow=records.filter(r=>r.adaptive[1]-r.adaptive[0]<=600),narrowSummary=summary(narrow,'adaptive'),narrowFraction=narrow.length/records.length;
  const gates={width:width.estimate>=.05*constant.meanWidth&&width.lower>0,score:score.estimate>=.05*constant.intervalScore&&score.lower>0,
    constantCoverage:constant.coverage>=.88,adaptiveCoverage:adaptive.coverage>=.88&&coverage.lower>=.85,
    subgroups:groups.every(g=>g.passed!==false),usefulness:narrowFraction>=.25&&narrowSummary?.games>=30&&narrowSummary.coverage>=.85};
  return{constant,adaptive,widthImprovement:width,scoreImprovement:score,coverageInterval:coverage,groups,narrow:{fraction:narrowFraction,summary:narrowSummary},gates,passed:Object.values(gates).every(Boolean)};
}
async function main(){
  const args=process.argv.slice(2),smoke=args.includes('--smoke'),outIndex=args.indexOf('--out');
  for(let i=0;i<args.length;i++){
    if(args[i]==='--smoke')continue;
    if(args[i]==='--out'&&args[i+1]&&!args[i+1].startsWith('--')){i++;continue;}
    throw Error('Unknown or incomplete argument');
  }
  let out=outIndex>=0?path.resolve(root,args[outIndex+1]):fileURLToPath(new URL(smoke?'../../../runs/E006/smoke/':'../evidence/',import.meta.url));
  if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay within research');
  const access=await openResearchData(['D001'],{purpose:'train'}),dataset=await access.readJson('tools/calibration/public/dataset.json.gz'),started=performance.now();
  const reports={},records={};
  for(const engine of ['sf18','sf19']){
    const evidence=await access.readJson('tools/calibration/public/'+engine+'-rating-evidence.json.gz');
    let rows=rowsFor(evidence);if(rows.some(r=>r.split!=='train'||r.decisions<10))throw Error('Ineligible evidence');
    const ids=new Set(rows.map(r=>r.gameId)),games=dataset.filter(g=>ids.has(g.id)),maps=foldMaps(games);
    if(smoke){const selected=new Set();for(let fold=0;fold<5;fold++)games.filter(g=>maps.outer.get(g.id)===fold).slice(0,10).forEach(g=>selected.add(g.id));if(selected.size!==50)throw Error('Smoke requires ten games per outer fold');rows=rows.filter(r=>selected.has(r.gameId));}
    const folds=[],scored=[];
    for(let fold=0;fold<5;fold++){
      const parts=partition(rows,maps,fold),point=fitPoint(parts.fit,engine),scale=fitScale(parts.fit,maps,engine);
      const rawScores=gameScores(parts.calibration,point),normalizedScores=gameScores(parts.calibration,point,scale.model),constant=quantile(rawScores.map(([,s])=>s)),adaptive=quantile(normalizedScores.map(([,s])=>s));
      if(!Number.isFinite(constant.q)||!Number.isFinite(adaptive.q))throw Error('Insufficient finite calibration');
      const predicted=parts.test.map(r=>{
        const p=predict(point,r),s=scaleAt(scale.model,r,p);
        return{gameId:r.gameId,playerId:r.playerId,color:r.color,ratingTarget:r.ratingTarget,decisions:r.decisions,fold,point:p,scale:s,
          constant:[p-constant.q,p+constant.q],adaptive:[p-adaptive.q*s,p+adaptive.q*s]};
      });
      scored.push(...predicted);
      folds.push({fold,fitGames:[...new Set(parts.fit.map(r=>r.gameId))].sort(),calibrationGames:rawScores.map(([id])=>id),testGames:[...new Set(parts.test.map(r=>r.gameId))].sort(),
        point,scale,constant,adaptive,calibrationRawHash:sha256(JSON.stringify(rawScores)),calibrationNormalizedHash:sha256(JSON.stringify(normalizedScores)),
        metrics:{constant:summary(predicted,'constant'),adaptive:summary(predicted,'adaptive')}});
      console.log(engine+' interval fold '+(fold+1)+'/5 complete');
    }
    records[engine]=scored;reports[engine]={engineConfig:evidence.engineConfig,folds,...assess(scored,engine==='sf18'?20261025:20261026,smoke?200:10000),evidence:'development only'};
  }
  await mkdir(out,{recursive:true});
  const result=JSON.stringify({schema:'E006-rating-intervals-v1',smoke,alpha:.1,reports},null,2)+'\n',predictions=gzipSync(JSON.stringify(records)+'\n');
  await writeFile(path.join(out,'results.json'),result);await writeFile(path.join(out,'predictions.json.gz'),predictions);
  const run={schema:'research-run-v1',id:'E006-'+(smoke?'smoke':'full'),date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
    command:'node research/experiments/E006-rating-uncertainty/code/evaluate.mjs'+(smoke?' --smoke':'')+(outIndex>=0?' --out '+args[outIndex+1]:''),
    dataEligibility:access.receipt,environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,elapsedMs:performance.now()-started,
    codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','method.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
    outputs:{'results.json':sha256(result),'predictions.json.gz':sha256(predictions)},evaluationRole:'D001 train-only rotated fit/calibration/test folds; development intervals, not fresh confirmation'};
  await writeFile(path.join(out,'run.json'),JSON.stringify(run,null,2)+'\n');
  console.log(JSON.stringify({smoke,reports:Object.fromEntries(Object.entries(reports).map(([e,r])=>[e,{constant:r.constant,adaptive:r.adaptive,widthImprovement:r.widthImprovement,scoreImprovement:r.scoreImprovement,narrow:r.narrow,gates:r.gates,passed:r.passed}]))},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

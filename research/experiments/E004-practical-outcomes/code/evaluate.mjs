import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {hash} from '../../../../tools/calibration/io.mjs';
import {openResearchData} from '../../../data-policy.mjs';
import {playerComponents,playerRoleOverlap} from '../../E001-evidence-audit/code/audit.mjs';
import {fit,predict,pointLoss} from './model.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url));
const families=['scalar','static','phaseSkill'],lambdas=[.1,1,10],plies=new Set([10,11,30,31,50,51,70,71]);
export function observations(evidence,dataset){
  const games=new Map(dataset.filter(g=>g.split==='train').map(g=>[g.id,g])),rows=[];
  let mates=0,selectedBeforeMate=0;
  for(const side of evidence.rows){
    const game=games.get(side.gameId),own=game?.players.find(p=>p.color===side.color),opponent=game?.players.find(p=>p.color!==side.color);
    if(!game||side.split!=='train'||side.playerId!==own?.id||side.ratingTarget!==own.rating)throw Error('Unbound training side');
    const whitePoints={'1-0':1,'1/2-1/2':.5,'0-1':0}[game.result];
    if(whitePoints==null)throw Error('Unknown outcome');
    for(const move of side.contextMoves)if(plies.has(move.ply)){
      selectedBeforeMate++;
      if(move.bestMate!==null){mates++;continue;}
      rows.push({gameId:game.id,playerId:own.id,color:side.color,split:'train',ply:move.ply,p:move.bestExpected,
        ownRating:own.rating,opponentRating:opponent.rating,y:side.color==='w'?whitePoints:1-whitePoints});
    }
  }
  const counts=new Map();for(const row of rows)counts.set(row.gameId,(counts.get(row.gameId)||0)+1);
  return{rows:rows.map(r=>({...r,weight:1/counts.get(r.gameId)})),counts:{games:counts.size,positions:rows.length,selectedBeforeMate,mateExcluded:mates}};
}
function mapsFor(games){
  const maps={outer:new Map(),inner:new Map()};
  for(const component of playerComponents(games))for(const id of component){
    maps.outer.set(id,parseInt(hash('E004-outer-v1:'+component[0]).slice(0,8),16)%5);
    maps.inner.set(id,parseInt(hash('E004-inner-v1:'+component[0]).slice(0,8),16)%3);
  }
  if(playerRoleOverlap(games,g=>maps.outer.get(g.id))||playerRoleOverlap(games,g=>maps.inner.get(g.id)))throw Error('Player fold leakage');
  return maps;
}
function split(rows,map,fold){
  const train=rows.filter(r=>map.get(r.gameId)!==fold),test=rows.filter(r=>map.get(r.gameId)===fold);
  const trainGames=new Set(train.map(r=>r.gameId));
  if(!train.length||!test.length||test.some(r=>trainGames.has(r.gameId)))throw Error('Invalid grouped split');
  return{train,test};
}
export function metrics(rows,values){
  if(!rows.length||values.length!==rows.length||values.some(p=>!Number.isFinite(p)||p<0||p>1))throw Error('Invalid predictions');
  const total=rows.reduce((s,r)=>s+r.weight,0);
  return{games:new Set(rows.map(r=>r.gameId)).size,positions:rows.length,
    logLoss:rows.reduce((s,r,i)=>s+r.weight*pointLoss(values[i],r.y),0)/total,
    brier:rows.reduce((s,r,i)=>s+r.weight*(values[i]-r.y)**2,0)/total,
    bias:rows.reduce((s,r,i)=>s+r.weight*(values[i]-r.y),0)/total};
}
function fitChecked(rows,family,lambda){const model=fit(rows,family,lambda);if(!model.converged)throw Error('Unconverged fit '+family+'/'+lambda);return model;}
function tune(rows,inner,family){
  const candidates=[];
  for(const lambda of lambdas){
    const scored=[],values=[];
    for(let fold=0;fold<3;fold++){const{train,test}=split(rows,inner,fold),model=fitChecked(train,family,lambda);scored.push(...test);values.push(...test.map(r=>predict(model,r)));}
    candidates.push({lambda,logLoss:metrics(scored,values).logLoss});
  }
  return{lambda:candidates.reduce((a,b)=>b.logLoss<a.logLoss?b:a).lambda,candidates};
}
function interval(rows,first,second,seed,iterations){
  const groups=new Map();
  rows.forEach((r,i)=>{if(!groups.has(r.gameId))groups.set(r.gameId,{sum:0,weight:0});const g=groups.get(r.gameId);g.sum+=r.weight*(pointLoss(first[i],r.y)-pointLoss(second[i],r.y));g.weight+=r.weight;});
  const differences=[...groups.values()].map(g=>g.sum/g.weight),samples=[];let state=seed>>>0;
  for(let k=0;k<iterations;k++){let sum=0;for(let j=0;j<differences.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=differences[Math.floor(state/4294967296*differences.length)];}samples.push(sum/differences.length);}
  samples.sort((a,b)=>a-b);
  return{estimate:differences.reduce((a,b)=>a+b,0)/differences.length,lower:samples[Math.floor(.0125*(iterations-1))],upper:samples[Math.floor(.9875*(iterations-1))],
    level:.975,iterations,seed,unit:'game; all selected positions and colors together',interpretation:'Development percentile interval; positive favors phase/strength candidate'};
}
function labels(row){const mean=(row.ownRating+row.opponentRating)/2;return['ply:'+Math.floor(row.ply/10)*10,'mean-rating:'+(mean<1200?'<1200':mean<2000?'1200-1999':'>=2000'),'wdl:'+(row.p<.1?'<0.1':row.p>.9?'>0.9':'0.1-0.9'),'color:'+row.color];}
function subgroups(rows,values){return[...new Set(rows.flatMap(labels))].sort().map(label=>{
  const idx=rows.map((r,i)=>labels(r).includes(label)?i:null).filter(i=>i!==null),subset=idx.map(i=>rows[i]);
  const scalar=metrics(subset,idx.map(i=>values.scalar[i])),candidate=metrics(subset,idx.map(i=>values.phaseSkill[i]));
  return{label,scalar,candidate,sufficient:scalar.games>=30,passed:scalar.games<30?null:candidate.logLoss<=scalar.logLoss+.03&&candidate.brier<=scalar.brier+.01};
});}
function calibration(rows,values){return Array.from({length:10},(_,bin)=>{
  const indices=rows.map((r,i)=>Math.min(9,Math.floor(values[i]*10))===bin?i:null).filter(i=>i!==null);
  const weight=indices.reduce((s,i)=>s+rows[i].weight,0);
  return{bin,positions:indices.length,weight,predicted:weight?indices.reduce((s,i)=>s+rows[i].weight*values[i],0)/weight:null,observed:weight?indices.reduce((s,i)=>s+rows[i].weight*rows[i].y,0)/weight:null};
});}
async function main(){
  const smoke=process.argv.includes('--smoke');if(process.argv.slice(2).some(a=>a!=='--smoke'))throw Error('Unknown argument');
  const dataAccess=await openResearchData(['D001'],{purpose:'train'});
  const manifest=await dataAccess.readJson('tools/calibration/public/manifest.json'),dataset=await dataAccess.readJson('tools/calibration/public/dataset.json.gz');
  const reports={},records={},started=performance.now();
  for(const engine of ['sf18','sf19']){
    const evidence=await dataAccess.readJson('tools/calibration/public/'+engine+'-rating-evidence.json.gz'),data=observations(evidence,dataset);
    let rows=data.rows;if(smoke){const ids=new Set([...new Set(rows.map(r=>r.gameId))].slice(0,50));rows=rows.filter(r=>ids.has(r.gameId));}
    const ids=new Set(rows.map(r=>r.gameId)),games=dataset.filter(g=>ids.has(g.id)),maps=mapsFor(games),folds=[],scored=[],values={raw:[],scalar:[],static:[],phaseSkill:[]};
    for(let fold=0;fold<5;fold++){
      const{train,test}=split(rows,maps.outer,fold),models={},tuning={},predictions={raw:test.map(r=>r.p)};
      for(const family of families){tuning[family]=tune(train,maps.inner,family);models[family]=fitChecked(train,family,tuning[family].lambda);predictions[family]=test.map(r=>predict(models[family],r));}
      scored.push(...test);for(const name of Object.keys(values))values[name].push(...predictions[name]);
      folds.push({fold,trainingGames:new Set(train.map(r=>r.gameId)).size,testGames:new Set(test.map(r=>r.gameId)).size,models,tuning,
        metrics:Object.fromEntries(Object.entries(predictions).map(([name,p])=>[name,metrics(test,p)]))});
      console.log(engine+' completed outer fold '+(fold+1)+'/5');
    }
    const overall=Object.fromEntries(Object.entries(values).map(([name,p])=>[name,metrics(scored,p)])),groups=subgroups(scored,values),seed=engine==='sf18'?20261015:20261016;
    const comparisons=Object.fromEntries(['scalar','static','raw'].map((name,i)=>[name,interval(scored,values[name],values.phaseSkill,seed+i,smoke?200:10000)]));
    const gates={practical:comparisons.scalar.estimate>=.01,uncertainty:comparisons.scalar.lower>0,brier:overall.phaseSkill.brier<=overall.scalar.brier,
      identicalCoverage:scored.length===rows.length,subgroups:groups.every(g=>g.passed!==false),monotone:folds.every(f=>f.models.phaseSkill.coefficients.slice(0,4).every(b=>b>=0))};
    reports[engine]={engineConfig:evidence.engineConfig,counts:smoke?{games:games.length,positions:rows.length}:data.counts,folds,metrics:overall,comparisons,subgroups:groups,
      calibration:Object.fromEntries(Object.entries(values).map(([name,p])=>[name,calibration(scored,p)])),gates,passed:Object.values(gates).every(Boolean),evidence:'development only'};
    records[engine]=scored.map((r,i)=>({...r,...Object.fromEntries(Object.entries(values).map(([name,p])=>[name,p[i]])),fold:maps.outer.get(r.gameId)}));
  }
  const out=smoke?path.join(root,'research/runs/E004/smoke'):fileURLToPath(new URL('../evidence/',import.meta.url));await mkdir(out,{recursive:true});
  const report=JSON.stringify({schema:'E004-outcome-development-v1',smoke,plies:[...plies],lambdas,reports},null,2)+'\n',predictions=gzipSync(JSON.stringify(records)+'\n');
  await writeFile(path.join(out,'results.json'),report);await writeFile(path.join(out,'predictions.json.gz'),predictions);
  const sourceRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E004-'+(smoke?'smoke':'full'),date:'2026-10-05',sourceRevision,
    dataEligibility:dataAccess.receipt,
    command:'node research/experiments/E004-practical-outcomes/code/evaluate.mjs'+(smoke?' --smoke':''),environment:{node:process.version,platform:process.platform,arch:process.arch},
    codeSha256:{'evaluate.mjs':hash(await readFile(fileURLToPath(import.meta.url))),'model.mjs':hash(await readFile(new URL('model.mjs',import.meta.url)))},
    inputs:Object.fromEntries(['dataset.json.gz','sf18-rating-evidence.json.gz','sf19-rating-evidence.json.gz'].map(name=>[name,manifest.files[name]])),
    outputs:{'results.json':hash(report),'predictions.json.gz':hash(predictions)},elapsedMs:performance.now()-started,engineSearches:0,
    evaluationRole:'nested development outcome CV; recorded ratings are contextual predictors; no validation/test scoring'},null,2)+'\n');
  console.log(JSON.stringify({smoke,engines:Object.fromEntries(Object.entries(reports).map(([engine,r])=>[engine,{metrics:r.metrics,comparisons:r.comparisons,gates:r.gates,passed:r.passed}]))},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

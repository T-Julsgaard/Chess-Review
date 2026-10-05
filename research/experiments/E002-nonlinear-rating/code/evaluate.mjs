import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {hash} from '../../../../tools/calibration/io.mjs';
import {publicInput} from '../../../../tools/calibration/reproduce-public.mjs';
import {fitHuber} from '../../../../tools/calibration/fit-huber.mjs';
import {predict} from '../../../../tools/calibration/fit-rating.mjs';
import {ratingFeatures} from '../../../../lib/public-scoring.js';
import {playerComponents, playerRoleOverlap} from '../../E001-evidence-audit/code/audit.mjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
export const baseNames = ['logRmsLoss','topRate','earlyRmsLoss','contestedRmsLoss','contestedFraction',
  'earlyTopRate','middleTopRate','decisionsLog','legalChoicesLog'];
export const nonlinearNames = [...baseNames,'lossSquared','topSquared','complexitySquared','lossTop','topComplexity'];
const grid = [1,10,100].flatMap(lambda => [100,250].map(delta => ({lambda,delta})));

export function featuresFor(row) {
  const f = ratingFeatures(row.contextMoves);
  return {...f,lossSquared:f.logRmsLoss ** 2,topSquared:f.topRate ** 2,
    complexitySquared:f.legalChoicesLog ** 2,lossTop:f.logRmsLoss*f.topRate,topComplexity:f.topRate*f.legalChoicesLog};
}

export function foldMaps(games) {
  const maps = {outer:new Map(),inner:new Map()};
  for (const component of playerComponents(games)) for (const id of component) {
    maps.outer.set(id, parseInt(hash('E002-outer-v1:' + component[0]).slice(0,8),16) % 5);
    maps.inner.set(id, parseInt(hash('E002-inner-v1:' + component[0]).slice(0,8),16) % 3);
  }
  return maps;
}

export function splitRows(rows, map, fold) {
  if (rows.some(r => !map.has(r.gameId))) throw Error('Unassigned game');
  const train = rows.filter(r => map.get(r.gameId) !== fold), test = rows.filter(r => map.get(r.gameId) === fold);
  const games = new Set(train.map(r => r.gameId)), players = new Set(train.map(r => r.playerId));
  if (!train.length || !test.length || test.some(r => games.has(r.gameId) || players.has(r.playerId))) throw Error('Empty or leaking evaluation split');
  return {train,test};
}

function weights(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.gameId,(counts.get(row.gameId)||0)+1);
  return rows.map(r => 1 / counts.get(r.gameId));
}
export function metrics(rows, estimates) {
  if (!rows.length || estimates.length !== rows.length || estimates.some(p => !Number.isFinite(p))) throw Error('Invalid metric observations');
  const w = weights(rows), total = w.reduce((a,b)=>a+b,0), errors = rows.map((r,i)=>estimates[i]-r.ratingTarget);
  const average = fn => errors.reduce((s,e,i)=>s+w[i]*fn(e),0)/total;
  const ordered = errors.map((e,i)=>({error:Math.abs(e),weight:w[i]})).sort((a,b)=>a.error-b.error);
  let mass=0, q90=ordered.at(-1).error;
  for(const r of ordered){mass+=r.weight;if(mass>=.9*total){q90=r.error;break;}}
  return {games:new Set(rows.map(r=>r.gameId)).size,sides:rows.length,mae:average(Math.abs),rmse:Math.sqrt(average(e=>e*e)),bias:average(e=>e),absoluteError90:q90};
}

export function pairedInterval(rows, first, second, seed, iterations=10000) {
  const byGame = new Map();
  for(let i=0;i<rows.length;i++){
    const id=rows[i].gameId;
    if(!byGame.has(id))byGame.set(id,[]);
    byGame.get(id).push(Math.abs(first[i]-rows[i].ratingTarget)-Math.abs(second[i]-rows[i].ratingTarget));
  }
  const differences=[...byGame.values()].map(values=>values.reduce((a,b)=>a+b,0)/values.length);
  if(differences.length<2)throw Error('Too few game clusters');
  let state=seed>>>0; const samples=[];
  for(let i=0;i<iterations;i++){
    let sum=0;
    for(let j=0;j<differences.length;j++){
      state=(Math.imul(state,1664525)+1013904223)>>>0;
      sum+=differences[Math.floor(state/4294967296*differences.length)];
    }
    samples.push(sum/differences.length);
  }
  samples.sort((a,b)=>a-b);
  return {estimate:differences.reduce((a,b)=>a+b,0)/differences.length,
    lower:samples[Math.floor(.0125*(iterations-1))],upper:samples[Math.floor(.9875*(iterations-1))],
    level:.975,iterations,seed,unit:'game; both retained sides together',
    interpretation:'Development percentile bootstrap; data previously consumed; positive favors candidate'};
}

function fit(rows, settings, names) {
  const model=fitHuber(rows,settings.lambda,names,settings.delta);
  if(!model.converged)throw Error('Huber fit did not converge: '+JSON.stringify(settings));
  return model;
}
function tune(rows, inner, names) {
  let selected=null;
  const candidates=[];
  for(const setting of grid){
    const scored=[],predictions=[];
    for(let fold=0;fold<3;fold++){
      const {train,test}=splitRows(rows,inner,fold),model=fit(train,setting,names);
      scored.push(...test);predictions.push(...test.map(r=>predict(model,r)));
    }
    const mae=metrics(scored,predictions).mae;
    candidates.push({...setting,mae});
    if(!selected || mae<selected.mae)selected={...setting,mae};
  }
  return {settings:{lambda:selected.lambda,delta:selected.delta},innerCandidates:candidates};
}

function groupsFor(row){
  const rating=row.ratingTarget, decisions=row.contextMoves.filter(m=>m.eligible).length;
  return [rating<1000?'rating:<1000':rating<1500?'rating:1000-1499':rating<2000?'rating:1500-1999':rating<2500?'rating:2000-2499':'rating:>=2500',
    decisions<20?'decisions:10-19':decisions<40?'decisions:20-39':'decisions:40+'];
}
function subgroups(rows,predictions){
  const labels=[...new Set(rows.flatMap(groupsFor))].sort();
  return labels.map(label=>{
    const indices=rows.map((r,i)=>groupsFor(r).includes(label)?i:null).filter(i=>i!==null), subset=indices.map(i=>rows[i]);
    const baseline=metrics(subset,indices.map(i=>predictions.fixed[i])),candidate=metrics(subset,indices.map(i=>predictions.nonlinear[i]));
    return {label,baseline,candidate,sufficient:baseline.games>=30,
      passed:baseline.games<30?null:candidate.mae<=baseline.mae+50&&Math.abs(candidate.bias)<=Math.abs(baseline.bias)+25};
  });
}

async function evaluateEngine(engine, evidence, dataset, smoke) {
  const selectedIds=new Set(evidence.rows.map(r=>r.gameId));
  let games=dataset.filter(g=>selectedIds.has(g.id));
  if(games.some(g=>g.split!=='train'))throw Error('Non-training game selected');
  if(smoke)games=games.slice(0,50);
  const ids=new Set(games.map(g=>g.id)),maps=foldMaps(games);
  if(playerRoleOverlap(games,g=>maps.outer.get(g.id))||playerRoleOverlap(games,g=>maps.inner.get(g.id)))throw Error('Player fold leakage');
  const rows=evidence.rows.filter(r=>ids.has(r.gameId)).map(r=>({...r,...featuresFor(r)}));
  if(rows.some(r=>r.split!=='train'||r.contextMoves.filter(m=>m.eligible).length<10||nonlinearNames.some(f=>!Number.isFinite(r[f]))))throw Error('Invalid eligible features');
  const folds=[],records=[],predictionMap={fixed:[],median:[],retuned:[],nonlinear:[]},scored=[];
  const fixedSetting=engine==='sf18'?{lambda:1,delta:100}:{lambda:10,delta:250};
  for(let fold=0;fold<5;fold++){
    const {train,test}=splitRows(rows,maps.outer,fold);
    const fixed=fit(train,fixedSetting,baseNames),retunedChoice=tune(train,maps.inner,baseNames),nonlinearChoice=tune(train,maps.inner,nonlinearNames);
    const retuned=fit(train,retunedChoice.settings,baseNames),nonlinear=fit(train,nonlinearChoice.settings,nonlinearNames);
    const ratings=train.map(r=>r.ratingTarget).sort((a,b)=>a-b),mid=Math.floor(ratings.length/2);
    const median=ratings.length%2?ratings[mid]:(ratings[mid-1]+ratings[mid])/2;
    const models={fixed,retuned,nonlinear};
    const predictions={median:test.map(()=>median)};
    for(const [name,model]of Object.entries(models))predictions[name]=test.map(r=>predict(model,r));
    for(let i=0;i<test.length;i++){
      const r=test[i],p=Object.fromEntries(Object.entries(predictions).map(([name,values])=>[name,values[i]]));
      records.push({gameId:r.gameId,playerId:r.playerId,color:r.color,ratingTarget:r.ratingTarget,fold,decisions:r.contextMoves.filter(m=>m.eligible).length,...p});
    }
    scored.push(...test);
    for(const name of Object.keys(predictionMap))predictionMap[name].push(...predictions[name]);
    folds.push({fold,trainGames:new Set(train.map(r=>r.gameId)).size,testGames:new Set(test.map(r=>r.gameId)).size,
      trainSides:train.length,testSides:test.length,models,median,retunedChoice,nonlinearChoice,
      metrics:Object.fromEntries(Object.entries(predictions).map(([name,values])=>[name,metrics(test,values)]))});
    console.log(engine+' completed outer fold '+(fold+1)+'/5');
  }
  const overall=Object.fromEntries(Object.entries(predictionMap).map(([name,values])=>[name,metrics(scored,values)]));
  const seed=engine==='sf18'?20261005:20261006;
  const comparisons=Object.fromEntries(['fixed','retuned','median'].map((name,i)=>[name,pairedInterval(scored,predictionMap[name],predictionMap.nonlinear,seed+i,smoke?200:10000)]));
  const groupResults=subgroups(scored,predictionMap),minimumEffect=Math.max(25,.05*overall.fixed.mae);
  const gates={practical:comparisons.fixed.estimate>=minimumEffect,uncertainty:comparisons.fixed.lower>0,
    equalCoverage:records.length===rows.length,tail:overall.nonlinear.absoluteError90<=overall.fixed.absoluteError90+25,
    subgroups:groupResults.every(g=>g.passed!==false)};
  const benchmarkModel=folds[0].models.nonlinear;
  let checksum=0;
  for(let i=0;i<1000;i++)checksum+=predict(benchmarkModel,featuresFor(rows[i%rows.length]));
  const started=performance.now();
  for(let i=0;i<10000;i++)checksum+=predict(benchmarkModel,featuresFor(rows[i%rows.length]));
  const averageMs=(performance.now()-started)/10000;
  if(!Number.isFinite(checksum))throw Error('Invalid benchmark result');
  return {report:{engine,engineConfig:evidence.engineConfig,folds,metrics:overall,comparisons,subgroups:groupResults,
    minimumEffect,gates,numericalGatePassed:Object.values(gates).every(Boolean),coverage:{eligible:rows.length,predicted:records.length},
    status:'development only; no fresh confirmation',attribution:'Compare nonlinear with retuned to distinguish feature gains from tuning'},
    records,benchmark:{averageMs,iterations:10000,warmup:1000,passed:averageMs<.5,addedEngineSearches:0}};
}

async function main(){
  const smoke=process.argv.includes('--smoke');
  if(process.argv.slice(2).some(arg=>arg!=='--smoke'))throw Error('Unknown argument');
  const manifest=JSON.parse(await readFile(path.join(root,'tools/calibration/public/manifest.json'),'utf8'));
  const dataset=await publicInput('dataset.json.gz',manifest),reports={},predictions={},benchmarks={};
  const started=performance.now();
  for(const engine of ['sf18','sf19']){
    const evidence=await publicInput(engine+'-rating-evidence.json.gz',manifest);
    const result=await evaluateEngine(engine,evidence,dataset,smoke);
    reports[engine]=result.report;predictions[engine]=result.records;benchmarks[engine]=result.benchmark;
  }
  const out=smoke?path.join(root,'research/runs/E002/smoke'):fileURLToPath(new URL('../evidence/',import.meta.url));
  await mkdir(out,{recursive:true});
  const reportBytes=JSON.stringify({schema:'E002-rating-development-v1',smoke,grid,features:{baseline:baseNames,nonlinear:nonlinearNames},reports},null,2)+'\n';
  const predictionBytes=gzipSync(JSON.stringify(predictions)+'\n');
  await writeFile(path.join(out,'results.json'),reportBytes);
  await writeFile(path.join(out,'predictions.json.gz'),predictionBytes);
  const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const codeSha256=hash(await readFile(fileURLToPath(import.meta.url)));
  await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E002-'+(smoke?'smoke':'full'),date:'2026-10-05',sourceRevision:revision,codeSha256,
    command:'node research/experiments/E002-nonlinear-rating/code/evaluate.mjs'+(smoke?' --smoke':''),
    environment:{node:process.version,platform:process.platform,arch:process.arch},evaluationRole:'nested development CV on retained training rows',
    inputHashes:Object.fromEntries(['dataset.json.gz','sf18-rating-evidence.json.gz','sf19-rating-evidence.json.gz'].map(name=>[name,manifest.files[name]])),
    outputs:{'results.json':hash(reportBytes),'predictions.json.gz':hash(predictionBytes)},elapsedMs:performance.now()-started,benchmarks,
    guardrailPass:Object.fromEntries(Object.entries(reports).map(([engine,r])=>[engine,r.numericalGatePassed&&benchmarks[engine].passed]))},null,2)+'\n');
  console.log(JSON.stringify({smoke,engines:Object.fromEntries(Object.entries(reports).map(([engine,r])=>[engine,{metrics:r.metrics,primary:r.comparisons.fixed,gates:r.gates,numericalGatePassed:r.numericalGatePassed}]))},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

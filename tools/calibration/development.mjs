import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, writeFile } from 'node:fs/promises';
import { args, json, save, hash, codeIdentity, snapshotCode } from './io.mjs';
import { fit, predict, metrics, featureNames } from './fit-rating.mjs';
import { mean, correlation, gameBootstrap, assertCompatible } from './core.mjs';
import { ratingBand } from './recent-dataset.mjs';

export function developmentRows(features) {
  return features.rows.filter(r => r.split !== 'test' && r.decisions >= 10 && featureNames.every(f => Number.isFinite(r[f])));
}
export function loadExperimentalModel(candidate, engineConfig) {
  assertCompatible(candidate, engineConfig);
  if(!candidate.selected || !candidate.selected.featureNames.every(f=>featureNames.includes(f))) throw Error('Invalid experimental model features');
  if(!['experimental','frozen-development'].includes(candidate.status)) throw Error('Unsupported research artifact status');
  return candidate.selected;
}
const quantile = (values, p) => { const a = values.slice().sort((a,b)=>a-b); return a.length ? a[Math.floor(p*(a.length-1))] : null; };
export function diagnostic(rows, predictions) {
  const indexed = rows.map((r,i)=>({...r, prediction:predictions[i]}));
  const groups = (name, predicate, count) => Array.from({length:count}, (_,i)=> {
    const g = indexed.filter(r=>predicate(r)===i);
    return { [name]:i, games:new Set(g.map(r=>r.gameId)).size, ...metrics(g,g.map(r=>r.prediction)), sparse:g.length<30 };
  });
  return { ...metrics(rows,predictions), games:new Set(rows.map(r=>r.gameId)).size,
    predictedQuantiles:[0,.1,.5,.9,1].map(p=>quantile(predictions,p)), targetQuantiles:[0,.1,.5,.9,1].map(p=>quantile(rows.map(r=>r.ratingTarget),p)),
    byPlayerRatingBand:groups('band',r=>ratingBand(r.ratingTarget),5),
    byGameLength:groups('lengthBand',r=>r.plies<60?0:r.plies<100?1:2,3), lengthBands:['<60 plies','60–99 plies','100+ plies'],
    maeInterval:gameBootstrap(indexed,r=>mean(r.map(x=>Math.abs(x.prediction-x.ratingTarget))),500),
    biasInterval:gameBootstrap(indexed,r=>mean(r.map(x=>x.prediction-x.ratingTarget)),500),
    validationAbsoluteResidual95:quantile(indexed.map(r=>Math.abs(r.prediction-r.ratingTarget)),.95),
    uncertainty:'Exploratory validation residuals and game-cluster intervals; globally unique players mean games contain all player dependence. No independently tested predictive coverage.' };
}
export function balancedPrefix(rows, count, seed = null) {
  const ids = [...new Set(rows.map(r=>r.gameId))];
  const queues = Array.from({length:5},(_,b)=>ids.filter(id=>rows.find(r=>r.gameId===id).band===b));
  if (seed != null) for (const q of queues) q.sort((a,b)=>hash(`${seed}:${a}`).localeCompare(hash(`${seed}:${b}`)));
  const selected = [];
  for (let i=0; selected.length<count && queues.some(q=>i<q.length); i++) for (const q of queues) if (q[i] && selected.length<count) selected.push(q[i]);
  const set = new Set(selected); return rows.filter(r=>set.has(r.gameId));
}
export function selectModel(train, validation) {
  const candidates = [];
  for (const names of [featureNames,['meanLoss'],['rmsLoss']]) for (const lambda of [1,10,100,1000]) {
    const model = fit(train,lambda,names);
    candidates.push({ model, validation:metrics(validation,validation.map(r=>predict(model,r))) });
  }
  candidates.sort((a,b)=>a.validation.mae-b.validation.mae); return candidates;
}
export function buildDevelopment(features, { fixedValidationIds } = {}) {
  const rows = developmentRows(features), train = rows.filter(r=>r.split==='train'), validation = rows.filter(r=>r.split==='validation');
  const validationIds = [...new Set(validation.map(r=>r.gameId))];
  const completedValidationIds = [...new Set(features.rows.filter(r=>r.split==='validation').map(r=>r.gameId))];
  if (fixedValidationIds && (completedValidationIds.length !== fixedValidationIds.length || fixedValidationIds.some(id=>!completedValidationIds.includes(id)))) return {status:'inconclusive',reason:'Fixed validation evaluations incomplete', trainingGames:new Set(train.map(r=>r.gameId)).size, validationGames:validationIds.length, expectedValidationGames:fixedValidationIds.length, finalTestEvaluated:false};
  if (train.length<20 || validation.length<20) return {status:'inconclusive',reason:'Too few completed training/validation sides',finalTestEvaluated:false};
  const trainCount = new Set(train.map(r=>r.gameId)).size;
  const sizes = [...new Set([25,50,100,250,500,1000,2000,5000,10000,trainCount].filter(n=>n<=trainCount))].sort((a,b)=>a-b);
  const curves = []; let previous;
  for (const n of sizes) {
    const prefix = balancedPrefix(train,n), candidates = selectModel(prefix,validation), selected = candidates[0], baseline = mean(prefix.map(r=>r.ratingTarget));
    const predictions = validation.map(r=>predict(selected.model,r));
    const paired = validation.map((r,i)=>({...r,delta:previous ? Math.abs(predictions[i]-r.ratingTarget)-Math.abs(previous[i]-r.ratingTarget):0}));
    curves.push({trainingGames:n,trainingSides:prefix.length,validationGames:validationIds.length,validationSides:validation.length,
      focalBandGames:Array.from({length:5},(_,b)=>new Set(prefix.filter(r=>r.band===b).map(r=>r.gameId)).size),
      candidates,selected:selected.model,diagnostics:diagnostic(validation,predictions),baseline:metrics(validation,validation.map(()=>baseline)),
      pairedMaeChange:previous ? gameBootstrap(paired,r=>mean(r.map(x=>x.delta)),500):null,
      repeatedSeededSubsets:[11,29,47].map(seed=> {const c=selectModel(balancedPrefix(train,n,seed),validation)[0]; return {seed,mae:c.validation.mae};}) });
    previous = predictions;
  }
  const selected = curves.at(-1).selected;
  return {schemaVersion:1,status:'experimental',finalTestEvaluated:false,trainingGames:trainCount,trainingSides:train.length,
    validationGameIds:validationIds,completedValidationGames:completedValidationIds.length,excludedSideSamples:features.rows.filter(r=>r.split!=='test').length-rows.length,engineConfig:features.binding.engineConfig,selected,learningCurves:curves,
    featureDefinition:'v1: meanLoss, rmsLoss, loss>=0.2 frequency, engine top move frequency; targets excluded from predictors',
    accuracyDefinition:'v1: E=(W+D/2)/1000; loss=max(0,Ebest-Eplayed); move=100*(1-loss); arithmetic=100*(1-mean loss); RMS=100*(1-root mean squared loss); exclude single legal moves only',
    accuracy:{candidates:['arithmetic','RMS'],selection:'Both retained as transparent percentage design choices; ratings do not alter individual game accuracy.',
      sides:rows.length,decisions:rows.reduce((s,r)=>s+r.decisions,0),negativeResiduals:rows.reduce((s,r)=>s+r.negativeResiduals,0),
      arithmeticRange:[Math.min(...rows.map(r=>r.accuracyMean)),Math.max(...rows.map(r=>r.accuracyMean))],
      rmsRange:[Math.min(...rows.map(r=>r.accuracyRms)),Math.max(...rows.map(r=>r.accuracyRms))],
      accuracyLengthCorrelation:correlation(rows.map(r=>r.accuracyRms),rows.map(r=>r.plies)),
      saturatedDecisions:rows.reduce((s,r)=>s+r.moves.filter(m=>m.eligible && m.loss===0).length,0),
      caveat:'WDL reflects engine self-play semantics; zero loss also includes top moves and search noise, so zero-loss frequency is not a direct saturation estimate.'},
    outputMeaning:'Lichess blitz rating level these moves resemble; not true single-game performance, FIDE Elo or an official rating',
    compatibility:'Exact engine/NNUE hashes, budget and UCI options required; SF18 parameters never silently reused for SF19',
    promotionCriteria:['New independent holdout after selecting formulas','Material improvement over baseline with clustered intervals','Acceptable bias across adequately sampled player bands and game lengths','Budget stability and compatible build/network','Predictive uncertainty coverage on independent games'],
    limitations:['Equal focal rating quotas and bounded archive windows are not population representative','Fixed validation reused for selection; reported errors are development estimates','Single-game rating is intrinsically noisy; shrinkage and sparse bands reported','No production scoring changes; final test reserved']};
}
export function compareFeatures(a,b) {
  const base = new Map(developmentRows(a).map(r=>[`${r.gameId}:${r.color}`,r]));
  const pairs = developmentRows(b).map(r=>[base.get(`${r.gameId}:${r.color}`),r]).filter(([r])=>r);
  const rows = pairs.map(([x,y])=>({gameId:x.gameId, change:Math.abs(x.accuracyRms-y.accuracyRms),meanChange:Math.abs(x.accuracyMean-y.accuracyMean)}));
  return {games:new Set(rows.map(r=>r.gameId)).size,sides:rows.length,baseEngine:a.binding.engineConfig,comparisonEngine:b.binding.engineConfig,
    rmsMeanAbsoluteChange:mean(rows.map(r=>r.change)),rmsMaxAbsoluteChange:rows.length?Math.max(...rows.map(r=>r.change)):null,
    arithmeticMeanAbsoluteChange:mean(rows.map(r=>r.meanChange)),rmsCorrelation:correlation(pairs.map(([r])=>r.accuracyRms),pairs.map(([,r])=>r.accuracyRms)),
    rmsChangeInterval:gameBootstrap(rows,r=>mean(r.map(x=>x.change)),500),
    negativeResiduals:pairs.reduce((s,[,r])=>s+r.negativeResiduals,0),
    caveat:'Paired development games only; search/WDL differences and finite-budget inconsistency retained'};
}
async function main() {
  const o=args({run:'calibration-runs/overnight-2026-09-30/sf18-20k', 'validation-ids':null});
  const features=await json(path.join(o.run,'features.json')), fixedValidationIds=o['validation-ids']?await json(o['validation-ids']):undefined;
  const report=buildDevelopment(features,{fixedValidationIds});
  report.generatedAt=new Date().toISOString(); report.featuresSha256=hash(JSON.stringify(features)); report.fittingCode=await codeIdentity();
  const version=hash(JSON.stringify(report)), folder=path.join(o.run,'candidates',version);
  await snapshotCode(folder,report.fittingCode); await save(path.join(folder,'features.json'),features); await save(path.join(folder,'development.json'),report);
  await save(path.join(o.run,'development.json'),{...report,candidateVersion:version,candidatePath:folder});
  console.log(JSON.stringify({status:report.status,trainingGames:report.trainingGames,validationGames:report.validationGameIds?.length,selected:report.learningCurves?.at(-1)?.diagnostics.mae,version}));
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) await main();

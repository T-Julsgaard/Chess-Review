import test from 'node:test';
import assert from 'node:assert/strict';
import {fit,predict} from '../tools/calibration/fit-rating.mjs';
import {distributionFeatures,fitHuber,groupedFolds,crossValidate,prepareResearch,loadRobustModel,baselineNames} from '../tools/calibration/robust-research.mjs';
const moves=(loss=.1)=>Array.from({length:20},(_,i)=>({eligible:true,loss:i%4?loss:0,bestExpected:.5,ply:i*2+1,top:i%4===0}));
function sample(split='train',count=25){
  return Array.from({length:count*2},(_,i)=>{const n=Math.floor(i/2),loss=.03+.004*(n%5);
    return {gameId:split+n,playerId:split+'p'+i,color:i%2?'b':'w',split,band:n%5,ratingTarget:2400-5000*loss,
      decisions:20,plies:40,meanLoss:loss,rmsLoss:loss,majorLossRate:.1,topRate:.8-loss,
      logRmsLoss:Math.log1p(100*loss),earlyRmsLoss:loss,middleRmsLoss:loss,lateRmsLoss:0,lateFraction:0,
      contestedRmsLoss:loss,contestedMeanLoss:loss,contestedFraction:.5,contestedTopRate:.7,
      legalChoicesLog:3,contextMoves:moves(loss)};
  });
}
test('robust fitting resists large residual outliers and retains finite deterministic coefficients',()=>{
  const clean=Array.from({length:40},(_,i)=>({meanLoss:i/40,ratingTarget:1200+400*i/40}));
  const noisy=clean.map((r,i)=>({...r,ratingTarget:r.ratingTarget+(i%5===0?3000:0)}));
  const old=fit(noisy,1,['meanLoss']),robust=fitHuber(noisy,1,['meanLoss'],100);
  const error=m=>clean.reduce((s,r)=>s+Math.abs(predict(m,r)-r.ratingTarget),0)/clean.length;
  assert.ok(error(robust)<error(old)/3);assert.ok(robust.converged);assert.deepEqual(robust,fitHuber(noisy,1,['meanLoss'],100));
  assert.throws(()=>fitHuber(noisy,1,['ratingTarget'],100));assert.throws(()=>fitHuber(noisy,-1,['meanLoss']));
});
test('error-distribution features ignore metadata and exclude forced moves',()=>{
  const row=sample()[0],a=distributionFeatures(row),b=distributionFeatures({...row,ratingTarget:9999,result:'1-0',playerId:'other',band:4});
  for(const name of ['smallLossRate','catastrophicRate','lossP90','contestedSmallLossRate','earlyTopRate','middleTopRate','decisionsLog','logRmsSquared','lossTopInteraction'])assert.equal(a[name],b[name]);
  const forced=distributionFeatures({...row,contextMoves:[...row.contextMoves,{eligible:false,loss:1}]});
  assert.equal(a.catastrophicRate,forced.catastrophicRate);assert.equal(a.decisionsLog,forced.decisionsLog);
});
test('both sides of games share folds; validation and repeated-player leakage fail closed',()=>{
  const rows=sample(),folds=groupedFolds(rows);assert.equal(folds.size,25);
  const seen=new Set(folds.values());assert.equal(seen.size,5);
  assert.throws(()=>groupedFolds([...rows,...sample('validation',1)]));
  assert.throws(()=>groupedFolds(rows.map((r,i)=>i===2?{...r,playerId:rows[0].playerId}:r)));
  const spec={id:'baseline',names:baselineNames,objective:'squared',lambda:10};
  const cv=crossValidate(rows.map(distributionFeatures),[spec]);assert.equal(cv.selected.predictions.length,50);
});
test('validation targets cannot select models and final-test content is excluded before extraction',()=>{
  const rows=[...sample(),...sample('validation',10),{split:'test',gameId:'reserved',ratingTarget:99999,contextMoves:null}];
  const features={binding:{engineConfig:{version:'fixture'}},rows},ids=[...new Set(rows.filter(r=>r.split==='validation').map(r=>r.gameId))];
  const a=prepareResearch(features,ids,[25]),b=prepareResearch({...features,rows:rows.map(r=>r.split==='validation'?{...r,ratingTarget:r.ratingTarget+10000}:r)},ids,[25]);
  assert.deepEqual(a.selected,b.selected);assert.deepEqual(a.nested,b.nested);assert.deepEqual(a.learningCurves[0].cv,b.learningCurves[0].cv);
  assert.notEqual(a.learningCurves[0].validation.mae,b.learningCurves[0].validation.mae);assert.equal(a.finalTestEvaluated,false);
  const model=loadRobustModel(a,{version:'fixture'});assert.equal(predict(model,distributionFeatures(rows[0])),predict(model,distributionFeatures({...rows[0],ratingTarget:-10000})));
  assert.throws(()=>loadRobustModel(a,{version:'different'}));
  assert.throws(()=>loadRobustModel({...a,selected:{...a.selected,featureNames:['ratingTarget']}},{version:'fixture'}));
});

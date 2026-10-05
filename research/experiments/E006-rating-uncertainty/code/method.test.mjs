import test from 'node:test';
import assert from 'node:assert/strict';
import {quantile,gameScores,partition,fitPoint,intervalScore,summary,scaleAt} from './method.mjs';

test('finite-sample calibration rank and game maxima preserve both sides',()=>{
  assert.deepEqual(quantile([9,1,5,8,4,2,7,3,6,10]),{q:10,rank:10,n:10,alpha:.1});assert.equal(quantile([1,2,3]).q,Infinity);
  const model={featureNames:[],center:[],scale:[],coefficients:[1000]},rows=[{gameId:'synthetic-a',ratingTarget:900},{gameId:'synthetic-a',ratingTarget:1300},{gameId:'synthetic-b',ratingTarget:1200}];
  assert.deepEqual(gameScores(rows,model),[['synthetic-a',300],['synthetic-b',200]]);
});
test('fit/calibration/test roles are disjoint and held-out roles cannot fit',()=>{
  const rows=Array.from({length:5},(_,i)=>({gameId:'synthetic-'+i,split:'train'})),maps={outer:new Map(rows.map((r,i)=>[r.gameId,i]))},parts=partition(rows,maps,2);
  assert.deepEqual(parts.test.map(r=>r.gameId),['synthetic-2']);assert.deepEqual(parts.calibration.map(r=>r.gameId),['synthetic-3']);assert.equal(parts.fit.length,3);
  assert.throws(()=>fitPoint(parts.test,'sf18'),/Only fit roles/);assert.throws(()=>fitPoint(parts.calibration,'sf18'),/Only fit roles/);
});
test('interval score, simultaneous coverage and bounded scale do not use target at prediction',()=>{
  assert.equal(intervalScore(1000,900,1100),200);assert.equal(intervalScore(1200,900,1100),2200);
  const records=[{gameId:'synthetic-a',ratingTarget:1000,point:1000,constant:[900,1100]},{gameId:'synthetic-a',ratingTarget:1300,point:1000,constant:[900,1100]}];
  assert.equal(summary(records,'constant').coverage,0);assert.equal(summary(records,'constant').sideCoverage,.5);
  const model={featureNames:['prediction'],center:[0],scale:[1],coefficients:[6,.0001]};
  assert.equal(scaleAt(model,{ratingTarget:500},1000),scaleAt(model,{ratingTarget:2500},1000));assert.equal(scaleAt({...model,coefficients:[30,0]},{},1000),1000);
});

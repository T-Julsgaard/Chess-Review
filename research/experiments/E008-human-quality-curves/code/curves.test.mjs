import test from 'node:test';
import assert from 'node:assert/strict';
import {coordinate,utility,fixedCurve,fitCurve,fitChoice,loss,predictions,metrics,paired,bootstrap,assess} from './curves.mjs';

// Authored probability/choice mechanics; no real-game or human evidence.
const score=(cp,p)=>({cp,wdl:[Math.round(p*1000),0,1000-Math.round(p*1000)]});
const rows=[-200,-100,100,200].map((cp,i)=>({gameId:'synthetic-'+i,split:'train',score:score(cp,cp<0?.25:.75),target:1/(1+Math.exp(-.7*cp/100)),weight:1}));
test('CP and WDL fit recover coefficients and refuse validation labels',()=>{
  const cp=fitCurve(rows,'cp');assert.ok(Math.abs(cp.coefficient-.7)<1e-12);assert.equal(cp.boundary,null);
  const b=.3,wdlRows=rows.map(r=>({...r,target:1/(1+Math.exp(-b*coordinate(r.score,'wdl')))}));
  assert.ok(Math.abs(fitCurve(wdlRows,'wdl').coefficient-b)<1e-12);
  assert.throws(()=>fitCurve([{...rows[0],split:'validation'}],'cp'),/training/);
  assert.equal(fitCurve(rows.map(r=>({...r,target:.5})),'cp').boundary,'lower');
});
test('curves preserve sign symmetry, draw points and explicit mate/extreme handling',()=>{
  const wdl={schema:'E008-curve-v1',kind:'wdl',coefficient:1};
  assert.equal(utility({cp:0,wdl:[200,600,200]},wdl),.5);
  assert.ok(Math.abs(utility(score(100,.75),wdl)+utility(score(-100,.25),wdl)-1)<1e-15);
  assert.ok(Math.abs(utility(score(1,0),wdl)-.0005)<1e-15);assert.ok(Math.abs(utility(score(1,1),wdl)-.9995)<1e-15);
  for(const model of [fixedCurve,wdl]){assert.equal(utility({mate:1},model),1);assert.equal(utility({mate:-1},model),0);assert.throws(()=>utility({mate:0},model),/mate/);}
  assert.throws(()=>utility({cp:1},wdl),/WDL/);assert.ok(Number.isFinite(loss(0,1)));assert.ok(Number.isFinite(loss(1,0)));
});
test('choice fit rejects role leakage and reports complete uniform choices',()=>{
  const choices=[0,1].map(i=>({gameId:'synthetic-'+i,split:'train',scores:[score(0,.5),score(0,.5)],playedIndex:i}));
  const fit=fitChoice(choices,fixedCurve);assert.equal(fit.boundary,'lower');
  assert.throws(()=>fitChoice([{...choices[0],split:'validation'}],fixedCurve),/training/);
  assert.throws(()=>fitChoice([choices[0],choices[0]],fixedCurve),/one observation/);
  const p=predictions([],choices.map(r=>({...r,ply:20,rating:1500,rootScore:score(0,.5)})),fixedCurve,fit);
  assert.equal(p.choices[0].probability,.5);assert.equal(p.choices[0].logLoss,Math.log(2));
});
test('game weighting, paired coverage and deterministic uncertainty use game units',()=>{
  const first=[{gameId:'a',logLoss:0},{gameId:'a',logLoss:2},{gameId:'b',logLoss:4}];
  assert.equal(metrics(first,['logLoss']).logLoss,2.5);
  assert.deepEqual(paired(first,first,'logLoss'),[0,0]);assert.throws(()=>paired(first,[{gameId:'c',logLoss:1}],'logLoss'),/coverage/);
  assert.deepEqual(bootstrap([1,2,3],7,100),bootstrap([1,2,3],7,100));assert.equal(bootstrap([1,1],7,100).lower,1);
});
test('joint gate rejects practical failures, fit boundaries and subgroup harm',()=>{
  const outcomes=Array.from({length:40},(_,i)=>({gameId:'synthetic-'+i,ply:30,rating:1500,fixedPoints:.5,logLoss:1,brier:.2}));
  const choices=outcomes.map(r=>({...r,uniformLogLoss:3})),a={outcomes,choices},model={curve:{boundary:null},choice:{boundary:null}};
  const better={outcomes:outcomes.map(r=>({...r,logLoss:.98,brier:.19})),choices:choices.map(r=>({...r,logLoss:.96}))};
  assert.equal(assess(a,better,model,17).passed,true);
  assert.equal(assess(a,a,model,17).passed,false);assert.equal(assess(a,better,{...model,choice:{boundary:'upper'}},17).gates.interior,false);
  const harmful={...better,outcomes:better.outcomes.map(r=>({...r,brier:.22}))};assert.equal(assess(a,harmful,model,17).gates.subgroups,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from './evaluate.mjs';
import {audit} from './audit.mjs';
// Fabricated probability targets and equal legal moves, not human observations.
const outcomes=Array.from({length:600},(_,i)=>{const cp=i%2?100:-100;return{gameId:'synthetic-'+i,split:i<450?'train':'validation',ply:30,rating:1500,
  score:{cp,wdl:cp>0?[750,0,250]:[250,0,750]},target:1/(1+Math.exp(-cp/100)),weight:1};});
const choices=outcomes.map(r=>({...r,rootScore:r.score,scores:[r.score,r.score],playedIndex:0}));
test('independent equations accept an exact fit and detect altered predictions',()=>{
  const prepared={outcomes,choices,diagnostics:{synthetic:true},exclusions:[]},{result,records}=evaluate(prepared);
  const check=audit(prepared,result,records);assert.equal(check.passed,true);assert.equal(check.outcomeChecks,1800);
  const altered=structuredClone(records);altered.cp.outcomes[0].probability+=.01;assert.throws(()=>audit(prepared,result,altered),/probability/);
  const wrong=structuredClone(result);wrong.cp=undefined;wrong.models.cp.curve.coefficient+=.1;assert.throws(()=>audit(prepared,wrong,records),/stationarity/);
});

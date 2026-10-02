import test from 'node:test';
import assert from 'node:assert/strict';
import {fit,predict} from '../tools/calibration/fit-rating.mjs';
import {fitHuber} from '../tools/calibration/fit-huber.mjs';

test('robust fitting resists large residual outliers and retains finite deterministic coefficients',()=>{
  const clean=Array.from({length:40},(_,i)=>({split:'train',meanLoss:i/40,ratingTarget:1200+400*i/40}));
  const noisy=clean.map((r,i)=>({...r,ratingTarget:r.ratingTarget+(i%5===0?3000:0)}));
  const old=fit(noisy,1,['meanLoss']),robust=fitHuber(noisy,1,['meanLoss'],100);
  const error=m=>clean.reduce((s,r)=>s+Math.abs(predict(m,r)-r.ratingTarget),0)/clean.length;
  assert.ok(error(robust)<error(old)/3);assert.ok(robust.converged);assert.deepEqual(robust,fitHuber(noisy,1,['meanLoss'],100));
  assert.throws(()=>fitHuber(noisy.map(r=>({...r,split:'validation'})),1,['meanLoss'],100));assert.throws(()=>fitHuber(noisy,-1,['meanLoss']));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {features,fit,predict} from './model.mjs';

const row={p:.7,ply:31,ownRating:1600,opponentRating:1400,color:'w'};
test('constrained context model is monotone and color-complement symmetric',()=>{
  const model={family:'phaseSkill',coefficients:[.1,.2,.4,.8,.3,.05]};
  const predictions=[0,.1,.3,.5,.7,.9,1].map(p=>predict(model,{...row,p}));
  assert.ok(predictions.every((p,i)=>i===0||p>=predictions[i-1]));
  const reversed={...row,p:1-row.p,ownRating:row.opponentRating,opponentRating:row.ownRating,color:'b'};
  assert.ok(Math.abs(predict(model,row)+predict(model,reversed)-1)<1e-12);
  assert.deepEqual(features({...row,y:0,gameId:'first'},'phaseSkill'),features({...row,y:1,gameId:'other'},'phaseSkill'));
});
test('fractional outcomes and nonnegative optimization converge and reject holdout fitting',()=>{
  const rows=Array.from({length:100},(_,i)=>({...row,gameId:String(i),split:'train',weight:1,p:i<50?.2:.8,y:i<50?.25:.75}));
  const model=fit(rows,'scalar',.1);
  assert.equal(model.converged,true);assert.ok(model.coefficients[0]>=0);
  assert.ok(Math.abs(predict(model,{...row,p:.2})-.25)<.005);
  assert.throws(()=>fit([{...rows[0],split:'test'}],'scalar',.1),/Invalid training/);
});

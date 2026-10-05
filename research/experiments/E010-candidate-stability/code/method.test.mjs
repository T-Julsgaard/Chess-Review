import test from 'node:test';
import assert from 'node:assert/strict';
import {vector,totalVariation,compare,bootstrap95,evaluate} from './method.mjs';
import {makeFreeze,validateFreeze} from './models.mjs';
import {audit} from './audit.mjs';
// Entirely authored probability mechanics, not human or real-game evidence.
const model={curve:{schema:'E008-curve-v1',kind:'cp',coefficient:.368208,boundary:null},choice:{schema:'human-choice-v1',temperature:15.464491662877624,boundary:null}},
  candidate={curve:{...model.curve,coefficient:.22349935786891822},choice:{...model.choice,temperature:20.939735269175777}},
  report={schema:'E008-human-curves-v1',developmentShortlist:'cp',roles:{validation:{comparisons:{cp:{passed:true}}}},models:{fixed:model,cp:candidate}},config={synthetic:true};
test('frozen models bind exact constants and reject substitutions',()=>{
  const freeze=makeFreeze(report,config);assert.equal(validateFreeze(freeze,report,config),true);
  const wrong=structuredClone(freeze);wrong.models.cp.curve.coefficient=.3;assert.throws(()=>validateFreeze(wrong,report,config),/differs/);
  assert.throws(()=>makeFreeze({...report,developmentShortlist:null},config),/shortlist/);
});
test('full vectors handle equal utilities, mate signs and paired mass shifts',()=>{
  assert.deepEqual(vector([{cp:0},{cp:0}],model),[.5,.5]);assert.equal(totalVariation([.2,.8],[.7,.3]),.5);
  assert.throws(()=>totalVariation([.5,.5],[1]),/Unmatched/);assert.throws(()=>totalVariation([.2,.2],[.5,.5]),/invalid/);
  const mates=vector([{mate:1},{mate:-1}],model);assert.ok(mates[0]>.999);assert.throws(()=>vector([{mate:0},{cp:0}],model),/mate/);
  const a=compare([{cp:0},{cp:100}],[{cp:0},{cp:100}],{cp:0},{cp:0},1,model);assert.equal(a.tv,0);assert.equal(a.playedLossDrift,0);
});
test('95% paired bootstrap is deterministic and uses the declared level',()=>{
  assert.deepEqual(bootstrap95([1,2,3],7,100),bootstrap95([1,2,3],7,100));assert.equal(bootstrap95([1,1],7,100).lower,1);assert.equal(bootstrap95([1,2],7,100).level,.95);
});
test('fixed cohort assessment rejects reserved roles and reports no false stability gain',()=>{
  const freeze=makeFreeze(report,config),games=Array.from({length:45},(_,i)=>({id:'synthetic-'+i,split:i<30?'train':'validation'})),searches=[{key:'root',score:{cp:0}},{key:'a',score:{cp:0}},{key:'b',score:{cp:100}}],
    positions=games.map(g=>({gameId:g.id,split:g.split,ply:20,baselineRootKey:'root',rootKey:'root',played:'a',legalMoves:['a','b'],alternatives:[{move:'a',baselineKey:'a',key:'a'},{move:'b',baselineKey:'b',key:'b'}]})),high={games,positions,searches},low={searches},metadata=positions.map(p=>({...p,rating:1500,fixedPoints:.5}));
  const result=evaluate(high,low,freeze,metadata);assert.equal(result.passed,false);assert.equal(result.summary.cp.tv.mean,0);assert.equal(result.gates.interval,false);
  assert.equal(audit(high,low,freeze,result).vectors,180);const altered=structuredClone(result);altered.records[0].cp.low[0]+=.01;assert.throws(()=>audit(high,low,freeze,altered),/vector/);
  assert.throws(()=>evaluate({...high,games:games.map((g,i)=>i?g:{...g,split:'test'})},low,freeze,metadata),/roles/);
});

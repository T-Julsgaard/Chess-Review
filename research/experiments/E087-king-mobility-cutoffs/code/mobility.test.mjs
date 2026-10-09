import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './mobility.mjs';
import {explainMove as parent} from '../../E086-history-routes-transpositions/code/history.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,scanReplies:false,mobilityTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,mobilityTags:false});assert.deepEqual(r.events.slice(0,p.events.length),p.events);
 const extra=r.events.slice(p.events.length);for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);
 for(const id of f.notExpected||[])assert.ok(!extra.some(e=>e.id===id),id);
 if(!f.expected.length&&!f.notExpected)assert.equal(extra.length,0);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,mobilityTags:false}),p);assert.deepEqual(explainMove({...i,mobilityTags:undefined}),p);
});
test('strict controls',()=>{
 const root=input(bothColors[0]);for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,mobilityTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxMobilityNodes:limit}),/integer/);
});
test('atomic budgets',()=>{
 const root=input(bothColors[0]),full=explainMove(root),p=parent({...root,mobilityTags:false});
 for(const limit of [0,1,2,5,full.mobilityAnalysis.nodes-1]){const r=explainMove({...root,maxMobilityNodes:limit});assert.equal(r.mobilityAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);assert.equal(r.mobilityAnalysis.witness,null);}
});
import {checkWitness} from './check-witness.mjs';
test('independent causal king/castle move-set checks and tampering',()=>{
 for(const f of bothColors){const w=explainMove(input(f)).mobilityAnalysis.witness;if(!w)continue;assert.equal(checkWitness(w),true);
  for(const mutate of [w=>w.actual.moves.pop(),w=>w.denied.push('a8'),w=>w.cutoffs.push('h1')]){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad));}
  if(w.preventedCastles.length){const bad=structuredClone(w);bad.preventedCastles[0].attacked=[];assert.throws(()=>checkWitness(bad));}
 }
});
test('terminal result suppresses mobility claims',()=>{
 const r=explainMove({fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6g7',mobilityTags:true,scanReplies:false});assert.equal(r.mobilityAnalysis.status,'not-live');assert.equal(r.mobilityAnalysis.witness,null);
});

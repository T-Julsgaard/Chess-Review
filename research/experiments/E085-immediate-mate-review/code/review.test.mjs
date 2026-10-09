import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './review.mjs';
import {explainMove as parent} from '../../E084-legal-line-clearance/code/lines.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,scanReplies:false,reviewTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,reviewTags:false});
 assert.deepEqual(r.events.slice(0,p.events.length),p.events);const extra=r.events.slice(p.events.length);
 for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);
 for(const id of f.notExpected||[])assert.ok(!extra.some(e=>e.id===id),id);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,reviewTags:false}),p);assert.deepEqual(explainMove({...i,reviewTags:undefined}),p);
});
test('strict controls',()=>{
 const root=input(bothColors[0]);
 for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,reviewTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxReviewNodes:limit}),/integer/);
});
test('atomic representative budgets',()=>{
 const root=input(bothColors.find(f=>f.id==='retained-threat')),full=explainMove(root),p=parent({...root,reviewTags:false});
 for(const limit of [0,1,2,10,full.reviewAnalysis.nodes-1]){
  const r=explainMove({...root,maxReviewNodes:limit});assert.equal(r.reviewAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);
  assert.equal(r.reviewAnalysis.witness,null);assert.equal(r.comment,p.comment);
 }
});
test('reuse exact E029 missed-mate proof',()=>{
 const i={...input(bothColors[0]),mateDepth:2},r=explainMove(i);
 assert.ok(r.events.some(e=>e.id==='missed-mate'));assert.ok(!r.events.some(e=>e.id==='missed-immediate-mate-review'));
 assert.deepEqual(r.reviewAnalysis.witness.missedProof.proof,r.events.find(e=>e.id==='missed-mate').evidence.proof);
});
import {checkWitness} from './check-witness.mjs';
test('independent complete immediate-move witness replay and tampering',()=>{
 for(const f of bothColors){const w=explainMove(input(f)).reviewAnalysis.witness;if(!w)continue;
  assert.equal(checkWitness(w),true);
  for(const mutate of [w=>w.root.moves.pop(),w=>w.actual.mates.push('a1a8'),w=>w.after=w.before]){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad));}
  if(w.alternatives.length){const bad=structuredClone(w);bad.alternatives.pop();assert.throws(()=>checkWitness(bad));}
 }
});
test('refuted threats remain negative',()=>{
 for(const f of bothColors.filter(f=>f.id.startsWith('old-'))){const r=explainMove(input(f));assert.ok(!r.events.some(e=>['retained-mate-threat','prevented-immediate-mate'].includes(e.id)));}
});

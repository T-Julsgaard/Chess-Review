import test from 'node:test';import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './pressure.mjs';import {explainMove as parent} from '../../E087-king-mobility-cutoffs/code/mobility.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,history:f.history,scanReplies:false,queenPressureTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,queenPressureTags:false});assert.deepEqual(r.events.slice(0,p.events.length),p.events);
 const extra=r.events.slice(p.events.length);for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);
 if(!f.expected.length)assert.equal(extra.length,0);for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,queenPressureTags:false}),p);assert.deepEqual(explainMove({...i,queenPressureTags:undefined}),p);
});
test('strict controls',()=>{const root=input(bothColors[0]);for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,queenPressureTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxQueenPressureNodes:limit}),/integer/);});
test('atomic budgets',()=>{const root=input(bothColors.find(f=>f.id==='knight-queen-pressure')),full=explainMove(root),p=parent({...root,queenPressureTags:false});
 for(const limit of [0,1,2,10,full.queenPressureAnalysis.nodes-1]){const r=explainMove({...root,maxQueenPressureNodes:limit});assert.equal(r.queenPressureAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);assert.equal(r.queenPressureAnalysis.witness,null);}});
import {checkWitness} from './check-witness.mjs';
test('independent complete pressure/material replay and tampering',()=>{
 for(const f of bothColors){const r=explainMove(input(f)),w=r.queenPressureAnalysis.witness;if(!w)continue;assert.equal(checkWitness(w,r),true);
  if(w.current){for(const mutate of [w=>w.current.branches.pop(),w=>w.current.losses++,w=>w.current.queen='a8']){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad,r));}}
 }
});
test('original hanging certificate reused with no new label',()=>{
 for(const f of bothColors.filter(f=>f.id.startsWith('hanging-reuse'))){const r=explainMove(input(f));assert.ok(r.queenPressureAnalysis.witness.reusedHanging.length);
  assert.equal(r.events.filter(e=>e.id==='hanging-piece').length,1);assert.equal(checkWitness(r.queenPressureAnalysis.witness,r),true);}
});
test('clock/draw and mate refutations',()=>{
 const f=bothColors.find(f=>f.id==='knight-queen-pressure'),r=explainMove({...input(f),fen:f.fen.replace(' 0 1',' 98 1')});
 assert.ok(!r.events.some(e=>e.id==='forced-queen-response'));assert.ok(r.queenPressureAnalysis.witness.current.refutations>0);
});

test('nondefensive check refutes queen tempo',()=>{
 for(const f of bothColors.filter(f=>f.id.startsWith('nondefensive-check'))){const r=explainMove(input(f));assert.ok(!r.events.some(e=>e.id==='forced-queen-response'));
  assert.ok(r.queenPressureAnalysis.witness.current.branches.some(b=>b.kind==='refutation-nondefensive-check-or-pin'));}
});

test('material counterplay refutes locally profitable queen capture',()=>{
 for(const f of bothColors.filter(f=>f.id.startsWith('material-counterplay'))){const r=explainMove(input(f));assert.ok(!r.events.some(e=>e.id==='forced-queen-response'));
  const branch=r.queenPressureAnalysis.witness.current.branches.find(b=>b.kind==='refutation-net-gain');assert.ok(branch);assert.ok(branch.proof.minimumGain>0);assert.ok(branch.minimumGainFromThreat<=0);assert.equal(checkWitness(r.queenPressureAnalysis.witness,r),true);}
});

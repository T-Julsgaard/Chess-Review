import test from 'node:test';import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './breakthrough.mjs';import {explainMove as parent} from '../../E088-forced-queen-responses/code/pressure.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,scanReplies:false,breakthroughTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,breakthroughTags:false});assert.deepEqual(r.events.slice(0,p.events.length),p.events);
 const extra=r.events.slice(p.events.length);for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);if(!f.expected.length)assert.equal(extra.length,0);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,breakthroughTags:false}),p);assert.deepEqual(explainMove({...i,breakthroughTags:undefined}),p);
});
test('strict controls',()=>{const root=input(bothColors[0]);for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,breakthroughTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxBreakthroughNodes:limit}),/integer/);
 for(const pushes of [null,0,7,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,breakthroughPushes:pushes}),/integer/);});
test('atomic budgets and depth horizon',()=>{const root=input(bothColors[0]),full=explainMove(root),p=parent({...root,breakthroughTags:false});
 for(const limit of [0,1,2,10,full.breakthroughAnalysis.nodes-1]){const r=explainMove({...root,maxBreakthroughNodes:limit});assert.equal(r.breakthroughAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);assert.equal(r.breakthroughAnalysis.witness,null);}
 assert.equal(explainMove({...root,breakthroughPushes:1}).breakthroughAnalysis.status,'proven');});
test('matching parent route proof reused',()=>{const r=explainMove({...input(bothColors[0]),promotionDepth:2});const w=r.breakthroughAnalysis.witness;
 assert.ok(w.reusedRouteEvent!==null);assert.deepEqual(w.afterProof,r.events[w.reusedRouteEvent].evidence.proof);assert.equal(r.events.filter(e=>e.id==='promotion-route').length,1);});
import {checkWitness} from './check-witness.mjs';
test('independent promotion tree and failed-before route checks',()=>{
 for(const f of bothColors){const r=explainMove(input(f)),w=r.breakthroughAnalysis.witness;if(!w)continue;assert.equal(checkWitness(w,r),true);
  for(const mutate of [w=>w.afterProof.initialBalance++,w=>w.pawnCounts.own++,w=>w.after=w.before]){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad,r));}
 }
});
test('full legal history retained in route proof and terminal guard',()=>{
 const f=bothColors[0],history={fen:f.fen,moves:[]},r=explainMove({...input(f),history});assert.equal(checkWitness(r.breakthroughAnalysis.witness,r),true);
 const mate=explainMove({fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6g7',breakthroughTags:true,scanReplies:false});assert.equal(mate.breakthroughAnalysis.status,'not-live');
});

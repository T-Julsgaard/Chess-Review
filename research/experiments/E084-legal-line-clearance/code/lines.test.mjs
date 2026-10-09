import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './lines.mjs';
import {explainMove as parent} from '../../E083-contact-exchange-changes/code/changes.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,scanReplies:false,lineTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,lineTags:false});
 assert.deepEqual(r.events.slice(0,p.events.length),p.events);const extra=r.events.slice(p.events.length);
 for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);
 if(!f.expected.length)assert.equal(extra.length,0);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,lineTags:false}),p);assert.deepEqual(explainMove({...i,lineTags:undefined}),p);
});
const root=input(bothColors[0]);
test('strict controls',()=>{
 for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,lineTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxLineNodes:limit}),/integer/);
});
test('atomic budgets',()=>{
 const full=explainMove(root),p=parent({...root,lineTags:false});
 for(let limit=0;limit<full.lineAnalysis.nodes;limit++){
  const r=explainMove({...root,maxLineNodes:limit});assert.equal(r.lineAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);
  assert.deepEqual(r.lineAnalysis.witnesses,[]);assert.equal(r.comment,p.comment);
 }
});
test('terminal move',()=>{
 const r=explainMove({fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6g7',lineTags:true,scanReplies:false});
 assert.equal(r.lineAnalysis.status,'not-live');assert.deepEqual(r.lineAnalysis.witnesses,[]);
});
import {checkWitness} from './check-witness.mjs';
test('independent ray and evasion witness checks',()=>{
 for(const f of bothColors){const r=explainMove(input(f));for(const w of r.lineAnalysis.witnesses){
  assert.equal(checkWitness(w),true);
  for(const mutate of [w=>w.cells.pop(),w=>w.blocker='a8',w=>w.after=w.before]){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad));}
  if(w.checking){const bad=structuredClone(w);bad.replies.pop();assert.throws(()=>checkWitness(bad));}
  else{const bad=structuredClone(w);bad.captures.push('a1a8');assert.throws(()=>checkWitness(bad));}
 }}
});

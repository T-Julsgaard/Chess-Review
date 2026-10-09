import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './changes.mjs';
import {explainMove as parent} from '../../E082-rook-ending-facts/code/endings.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,history:f.history,scanReplies:false,changeTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f);if(f.inputError){assert.throws(()=>explainMove(i),new RegExp(f.inputError));return;}const r=explainMove(i),p=parent({...i,changeTags:false});
 assert.deepEqual(r.events.slice(0,p.events.length),p.events);
 const extra=r.events.slice(p.events.length);
 for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);
 if(!f.expected.length)assert.equal(extra.length,0);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,changeTags:false}),p);
 assert.deepEqual(explainMove({...i,changeTags:undefined}),p);
});
const root=input(bothColors.find(f=>f.id==='regional-double'));
test('strict controls',()=>{
 for(const flag of [null,0,'true',{},[]])assert.throws(()=>explainMove({...root,changeTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,1.5,NaN,'2'])assert.throws(()=>explainMove({...root,maxChangeNodes:limit}),/integer/);
});
test('atomic rollback every budget boundary',()=>{
 const full=explainMove(root),p=parent({...root,changeTags:false});
 for(let limit=0;limit<full.changeAnalysis.nodes;limit++){
  const r=explainMove({...root,maxChangeNodes:limit});assert.equal(r.changeAnalysis.status,'exhausted');
  assert.deepEqual(r.events,p.events);assert.equal(r.comment,p.comment);assert.equal(r.changeAnalysis.witness,null);
 }
});
test('terminal result suppressed',()=>{
 const r=explainMove({fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6g7',changeTags:true,scanReplies:false});
 assert.equal(r.changeAnalysis.status,'not-live');assert.ok(!r.events.some(e=>e.evidence?.experiment==='E083'));
});
test('malformed history and illegal move refused',()=>{
 assert.throws(()=>explainMove({...root,history:{fen:root.fen,moves:['a1a8']}}),/history/);
 assert.throws(()=>explainMove({...root,move:'e1f2'}),/Illegal|illegal/);
});
test('EP retains removed pawn and promotion replaces pawn',()=>{
 for(const id of ['ep','promotion']){
  const r=explainMove(input(bothColors.find(f=>f.id===id))),w=r.changeAnalysis.witness;
  assert.equal(w.afterPawns.length,w.beforePawns.length-1);
 }
});
import {checkWitness} from './check-witness.mjs';
test('focused independent witness checks and tampering',()=>{
 for(const f of bothColors.filter(f=>!f.inputError)){
  const w=explainMove(input(f)).changeAnalysis.witness;if(!w)continue;
  assert.equal(checkWitness(w),true);
  const bad=structuredClone(w);bad.afterPawns.push({square:'a2',type:'p',color:'w'});assert.throws(()=>checkWitness(bad));
  if(w.contacts.length){const bad=structuredClone(w);bad.contacts[0].capture='a1a8';assert.throws(()=>checkWitness(bad));}
 }
});

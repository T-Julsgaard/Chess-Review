import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './tactics.mjs';
import {replay} from './replay.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect,newIds}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test('move tactics '+f.id,()=>{
 const result=explainMove(f),ids=result.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}; got ${ids}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 assert.deepEqual(ids.filter(id=>newIds.has(id)).sort(),[...f.expectedNew].sort());
 assert.ok(!result.comment||result.comment.split(/\s+/).length<=24);
 for(const e of result.events.filter(e=>['absolute-skewer','profitable-capture','winning-exchange'].includes(e.id)))assert.ok(replay(f,e).passed);
 if(f.maxTacticNodes===1)assert.equal(result.diagnostics.moveTactics.status,'exhausted');
});
test('independent replay rejects missing reply, altered gain and target',()=>{
 const f=fixtures.find(f=>f.id==='absolute-rook-skewer'),e=explainMove(f).events.find(e=>e.id==='absolute-skewer');assert.ok(e);
 for(const tamper of [e=>e.evidence.proof.witnesses.pop(),e=>e.evidence.proof.minimumGain++,e=>e.evidence.target.square='a8']){const copy=structuredClone(e);tamper(copy);assert.throws(()=>replay(f,copy));}
});
test('invalid inputs and budgets refused',()=>{assert.throws(()=>explainMove({...fixtures[0],move:'a1h8'}),/Illegal/);assert.throws(()=>explainMove({...fixtures[0],maxTacticNodes:0}),/positive/);});

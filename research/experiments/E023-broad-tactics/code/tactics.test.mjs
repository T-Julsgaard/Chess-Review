import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './tactics.mjs';
import {replay} from './replay.mjs';
import {Chess} from '../../../../lib/chess.js';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test('broad tactics '+f.id,()=>{
 const result=explainMove(f),ids=result.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}; got ${ids}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 assert.ok(!result.comment||result.comment.split(/\s+/).length<=24);
 for(const e of result.events.filter(e=>e.evidence.proof&&['broad-fork','triple-attack','discovered-double-attack','hanging-piece'].includes(e.id)))assert.ok(replay(f,e).passed);
 for(const e of result.events.filter(e=>e.id==='allows-mate')){const c=new Chess(result.after);c.move(e.evidence.move);assert.ok(c.isCheckmate());assert.equal(c.fen(),e.evidence.after);}
 if(f.maxBroadNodes===1)assert.equal(result.diagnostics.broadTactics.status,'exhausted');
});
test('en-passant warning names removed pawn rather than landing square',()=>{
 for(const f of [fixtures.find(f=>f.id==='en-passant-hanging-warning'),reflect(fixtures.find(f=>f.id==='en-passant-hanging-warning'))]){
  const r=explainMove(f),warning=r.events.find(e=>e.id==='allows-capture');assert.ok(warning.evidence.enPassant);assert.equal(warning.evidence.target,f.move.slice(2,4));assert.ok(warning.text.includes(f.move.slice(2,4)));
 }
});
test('tampered broad certificate fails independent replay',()=>{
 const f=fixtures.find(f=>f.id==='queen-checking-fork'),e=explainMove(f).events.find(e=>e.id==='broad-fork');assert.ok(e);
 for(const mutate of [e=>e.evidence.proof.witnesses.pop(),e=>e.evidence.proof.minimumGain++,e=>e.evidence.targets.pop()]){const copy=structuredClone(e);mutate(copy);assert.throws(()=>replay(f,copy));}
});
test('x-ray stops at second occupied square, never jumps two blockers',()=>{
 const f=fixtures.find(f=>f.id==='xray-two-blockers'),r=explainMove(f),x=r.events.find(e=>e.id==='x-ray-attack');assert.equal(x.evidence.target.square,'d6');assert.ok(!r.events.some(e=>e.id==='x-ray-attack'&&e.evidence.target.square==='d8'));
});
test('interference evidence checks previously attacked target and newly occupied line',()=>{
 const f=fixtures.find(f=>f.id==='interference-line'),r=explainMove(f),e=r.events.find(e=>e.id==='interference'),before=new Chess(f.fen),after=new Chess(r.after);
 assert.ok(before.attackers(e.evidence.target,'b').includes(e.evidence.attacker));assert.ok(!after.attackers(e.evidence.target,'b').includes(e.evidence.attacker));assert.equal(after.get(e.evidence.blocker).color,'w');assert.ok(e.evidence.line.includes(e.evidence.blocker));
});
test('new non-knight royal fork attacks king and queen with finite certificate',()=>{
 const f=fixtures.find(f=>f.id==='bishop-royal-fork'),e=explainMove(f).events.find(e=>e.id==='broad-fork');assert.ok(e.evidence.royal);assert.deepEqual(e.evidence.targets.map(t=>t.type).sort(),['k','q']);assert.ok(replay(f,e).passed);
});
test('old immediate countermate and terminal draw fork negatives remain rejected',async()=>{
 const {fixtures:old}=await import('../../E020-coach-concepts/code/fixtures.mjs');
 for(const f of old.filter(f=>['fork-countermate','fork-draw'].includes(f.id)).flatMap(f=>[f,reflect(f)]))assert.ok(!explainMove(f).events.some(e=>e.id==='broad-fork'));
});

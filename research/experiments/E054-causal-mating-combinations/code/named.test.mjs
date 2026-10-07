import test from 'node:test';import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,namedIds} from './named.mjs';import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E053-cross-checks/code/cross.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 for(const e of r.events.filter(e=>namedIds.has(e.id))){replay(f,e,r);assert.ok(e.text.includes(': if '));assert.ok(e.text.split(/\s+/).length<=24);}
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
});
const fixture=name=>fixtures.find(f=>f.id===name),named=r=>r.events.filter(e=>namedIds.has(e.id));
test('king attraction and self-blocking label distinct proven roles',()=>{
 const a=explainMove(fixture('attraction-bishop-offer'));assert.deepEqual(named(a).map(e=>e.id),['attraction-combination','decoy-combination']);
 assert.equal(a.events.find(e=>e.id==='attraction-combination').evidence.roleKeys.length,2);assert.ok(a.comment.startsWith('Attraction combination:'));
 const b=explainMove(fixture('self-blocking-without-old-duty'));assert.deepEqual(named(b).map(e=>e.id),['decoy-combination','blocking-combination']);assert.ok(b.comment.startsWith('Blocking combination:'));
 const d=explainMove(fixture('pure-deflection-no-flight-role'));assert.deepEqual(d.events.find(e=>e.id==='mating-decoy').evidence.roles.map(r=>r.kind),['deflection']);assert.equal(named(d).length,0);
 for(const name of ['exchange-capture-self-block','bishop-capture-attraction']){const r=explainMove(fixture(name));assert.ok(named(r).length);assert.ok(named(r).every(e=>e.evidence.nominalCost===2));}
});
test('every acceptance must permit mate; a second defender can refute an otherwise matching line',()=>{
 const good=explainMove(fixture('two-acceptors-both-self-block')),p=good.events.find(e=>e.id==='mating-decoy').evidence;
 assert.equal(p.sacrifice.proof.tree.branches.length,2);assert.equal(good.events.find(e=>e.id==='blocking-combination').evidence.roleKeys.length,2);
 const f=fixture('second-acceptor-refutes-mate'),c=new Chess(f.fen);for(const m of ['d5g8','e7g8','h6f7','f8f7'])c.move(m);assert.ok(!c.isCheckmate());assert.equal(c.get('f7').color,'b');assert.equal(named(explainMove(f)).length,0);
});
test('ordinary all-defense mating offer has legal declining defenses but no named causal role',()=>{
 const f=fixture('ordinary-quiet-mating-offer'),r=explainMove(f),s=r.events.find(e=>e.id==='mating-sacrifice').evidence;
 assert.ok(s.proof.tree.branches.some(b=>!s.acceptances.some(a=>a.move===b.move)));assert.equal(named(r).length,0);
 const c=new Chess(f.fen);for(const m of ['f2f4','h8g8','e7g7'])c.move(m);assert.ok(c.isCheckmate());
 const bad=fixture('countercheck-declines-offer'),reply=new Chess(bad.fen);reply.move('f2f4');reply.move('h4h6');
 assert.ok(reply.isCheck());assert.ok(!reply.moves({verbose:true}).some(m=>m.san.includes('#')));
 assert.ok(!explainMove(bad).events.some(e=>e.id==='forced-mate'));assert.equal(named(explainMove(bad)).length,0);
});
test('missing foreign or ambiguous same-row parent proof and tampered role references fail',()=>{
 const f=fixture('attraction-bishop-offer'),r=explainMove(f),e=r.events.find(e=>e.id==='attraction-combination');
 assert.throws(()=>replay(f,e));assert.throws(()=>replay(f,e,{...r,events:r.events.filter(x=>x.id!=='mating-decoy')}));
 assert.throws(()=>replay(f,e,{...r,events:[...r.events,r.events.find(x=>x.id==='mating-decoy')]}));
 assert.throws(()=>replay(f,e,explainMove(fixture('self-blocking-without-old-duty'))));
 for(const mutate of [x=>x.parentEvent='mating-sacrifice',x=>x.beforeFen=x.afterFen,x=>x.played='f6e5',x=>x.nominalCost++,x=>x.defenses.pop(),x=>x.roleKeys.pop(),x=>x.selectedRole=x.roleKeys[1],x=>x.color='b']){
  const altered=structuredClone(e);mutate(altered.evidence);assert.throws(()=>replay(f,altered,r));
 }
 assert.throws(()=>replay(f,{...e,text:e.text.replace('if','forced')},r));
});
test('omitted mate branches and falsified causal counterfactuals are rejected by independent parent replay',()=>{
 const f=fixture('two-acceptors-both-self-block'),r=explainMove(f),e=r.events.find(e=>e.id==='blocking-combination');
 for(const mutate of [p=>p.sacrifice.proof.tree.branches.pop(),p=>p.roles.pop(),p=>p.roles[0].blocker.square='h8',p=>p.roles[0].escape='h8h7',p=>p.roles[0].withoutCapturerFen=p.roles[0].mateFen]){
  const changed=structuredClone(r);mutate(changed.events.find(x=>x.id==='mating-decoy').evidence);assert.throws(()=>replay(f,e,changed));
 }
});
test('disabled and exhausted classification preserve parent facts; limits and prerequisites are guarded',()=>{
 for(const name of ['attraction-bishop-offer','self-blocking-without-old-duty','two-acceptors-both-self-block']){
  const f=fixture(name),full=explainMove(f);assert.deepEqual(explainMove({...f,namedDecoyTags:false}),parent(f));
  for(const limit of [0,full.namedDecoyAnalysis.nodes-1]){const r=explainMove({...f,maxNamedDecoyNodes:limit});assert.equal(r.namedDecoyAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);}
 }
 for(const limit of [-1,50001,0.1])assert.throws(()=>explainMove({...fixtures[0],maxNamedDecoyNodes:limit}),/maxNamedDecoyNodes/);
 assert.throws(()=>explainMove({...fixtures[0],namedDecoyTags:'yes'}),/namedDecoyTags/);
});
test('full history counters and terminal continuation remain strict',()=>{
 const f=fixture('history-self-blocking'),r=explainMove(f);for(const e of named(r))replay(f,e,r);
 const e=named(r)[0];assert.throws(()=>replay({...f,fen:f.fen.replace(' 1 2',' 2 2')},e,r));
 assert.throws(()=>replay({...f,history:{fen:fixture('self-blocking-without-old-duty').fen,moves:['d5g8','d8g8','h6f7','h8h7']}},e,r));
});

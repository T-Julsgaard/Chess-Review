import test from 'node:test';import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './timed.mjs';import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E054-causal-mating-combinations/code/named.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 for(const e of r.events.filter(e=>e.id==='intermediate-sacrifice'))replay(f,e,r);
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
});
const fixture=name=>fixtures.find(f=>f.id===name),event=r=>r.events.find(e=>e.id==='intermediate-sacrifice');
test('complete recaptures, off-destination EP victim and promoted capturer identity',()=>{
 const multi=event(explainMove(fixture('two-legal-recapturers')));assert.deepEqual(multi.evidence.recaptures.map(m=>m.move).sort(),['d7f8','e6f8']);
 const ep=event(explainMove(fixture('last-capture-en-passant')));assert.equal(ep.evidence.victim.square,'d4');assert.equal(ep.evidence.capturer.square,'d3');
 for(const [name,type]of [['queen','q'],['knight','n']]){const e=event(explainMove(fixture('last-capturer-promoted-'+name)));assert.equal(e.evidence.lastCapture.piece,'p');assert.equal(e.evidence.lastCapture.promotion,type);assert.equal(e.evidence.capturer.type,type);assert.ok(e.evidence.recaptures.some(m=>m.captured===type));}
});
test('stronger immediate mate and illegal pinned recapture suppress timing label despite a mating offer',()=>{
 for(const [name,reason]of [['snapshot-history-missing','history-required'],['last-move-quiet','no-capture'],['old-capture-final-quiet','no-capture'],['no-legal-recapture','no-recapture'],['pinned-recapture-illegal','no-recapture'],['immediate-mate-available','mate-one-available']]){const r=explainMove(fixture(name));assert.ok(r.events.some(e=>e.id==='mating-sacrifice'));assert.equal(r.intermediateSacrificeAnalysis.reason,reason);assert.ok(!event(r));}
 const pinned=new Chess(fixture('pinned-recapture-illegal').fen);assert.throws(()=>pinned.move('e6f8'));
 const immediate=new Chess(fixture('immediate-mate-available').fen);immediate.move('e7h7');assert.ok(immediate.isCheckmate());
});
test('disabled and exhausted profiles preserve all frozen parent facts',()=>{
 const f=fixture('rook-offer-after-capture'),full=explainMove(f);assert.deepEqual(explainMove({...f,intermediateSacrificeTags:false}),parent(f));
 for(const limit of [0,full.intermediateSacrificeAnalysis.nodes-1]){const r=explainMove({...f,maxIntermediateSacrificeNodes:limit});assert.equal(r.intermediateSacrificeAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);assert.equal(r.comment,parent(f).comment);}
 for(const limit of [-1,50001,0.1])assert.throws(()=>explainMove({...f,maxIntermediateSacrificeNodes:limit}),/maxIntermediateSacrificeNodes/);
 assert.throws(()=>explainMove({...f,intermediateSacrificeTags:'yes'}),/intermediateSacrificeTags/);
});
test('same-row full sacrifice proof required and all legal branches independently replayed',()=>{
 const f=fixture('rook-offer-after-capture'),r=explainMove(f),e=event(r),p=r.events.find(e=>e.id==='mating-sacrifice');
 assert.throws(()=>replay(f,e));assert.throws(()=>replay(f,e,{...r,events:r.events.filter(x=>x!==p)}));assert.throws(()=>replay(f,e,{...r,events:[...r.events,p]}));
 assert.throws(()=>replay(f,e,explainMove(fixture('exchange-offer-after-capture'))));
 const changed=structuredClone(r);changed.events.find(e=>e.id==='mating-sacrifice').evidence.proof.tree.branches.pop();assert.throws(()=>replay(f,e,changed));
});
test('history, move sets, costs and teaching text cannot be tampered',()=>{
 const f=fixture('two-legal-recapturers'),r=explainMove(f),e=event(r);
 for(const mutate of [x=>x.originalMoves.pop(),x=>x.recaptures.pop(),x=>x.recaptures[0].after=x.beforeFen,x=>x.lastCapture.captured='q',x=>x.victim.square='f7',x=>x.capturer.type='q',x=>x.played.move='e6f8',x=>x.historyPlies++,x=>x.mateIn=3,x=>x.nominalCost++,x=>x.color='b',x=>x.beforeFen=x.afterFen,x=>x.parentEvent='forced-mate']){const altered=structuredClone(e);mutate(altered.evidence);assert.throws(()=>replay(f,altered,r));}
 assert.throws(()=>replay(f,{...e,text:e.text.replace('available','mandatory')},r));assert.throws(()=>replay({...f,history:undefined},e,r));
 const fields=f.fen.split(' ');fields[4]='1';assert.throws(()=>replay({...f,fen:fields.join(' ')},e,r));assert.throws(()=>explainMove({...f,fen:fields.join(' ')}));
 const dead={fen:f.history.fen,moves:[...f.history.moves,'g1g8','f8g8','h6f7','h8h7']};assert.throws(()=>replay({...f,history:dead},e,r));
});

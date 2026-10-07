import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';import {explainMove} from './corner.mjs';import {replay} from './replay.mjs';import {explainMove as parent} from '../../E057-rook-checking-distance/code/checking.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');const ids=new Set(['wrong-colored-bishop','wrong-rook-pawn-corner']);
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{if(f.invalid){assert.throws(()=>explainMove(f),/Illegal move/);return;}const r=explainMove(f);for(const id of f.expected)assert.ok(r.events.some(e=>e.id===id),`${f.id}: missing ${id}`);for(const id of f.absent)assert.ok(!r.events.some(e=>e.id===id),`${f.id}: unexpected ${id}`);for(const e of r.events.filter(e=>ids.has(e.id)))replay(f,e);assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);});
const fixture=name=>fixtures.find(f=>f.id===name),event=(r,id='wrong-rook-pawn-corner')=>r.events.find(e=>e.id===id);
test('corner access is an actual legal choice; occupying it is a different fact',()=>{
 const f=fixture('bishop-move-corner-access'),r=explainMove(f),e=event(r);assert.equal(e.evidence.occupied,false);assert.deepEqual(e.evidence.cornerMoves.map(m=>m.move),['b8a8']);const c=new Chess(r.after);c.move('b8a8');assert.equal(c.get('a8').type,'k');assert.ok(e.text.includes('...Ka8 is legal now'));
 for(const name of ['defending-king-enters-corner','corner-already-occupied']){const e=event(explainMove(fixture(name)));assert.equal(e.evidence.occupied,true);assert.equal(e.evidence.defendingKing.square,'a8');assert.ok(e.text.includes('occupied by the defending king'));}
 const denied=explainMove(fixture('corner-denied-by-attacking-king'));assert.ok(!event(denied));assert.throws(()=>new Chess(denied.after).move('c8b7'));assert.throws(()=>new Chess(denied.after).move('c8a8'));
});
test('bishop limitation selected with exact pure material; pawn advance and promotion keep stronger facts',()=>{
 const r=explainMove(fixture('bishop-move-corner-access'));assert.ok(r.comment.startsWith('Wrong rook pawn:'));assert.ok(!r.comment.toLowerCase().includes('draw'));
 const d=explainMove(fixture('distant-defender'));assert.ok(d.comment.startsWith('Wrong-colored bishop:'));
 const promo=explainMove(fixture('promotion-removes-context'));assert.ok(!promo.events.some(e=>ids.has(e.id)));assert.ok(promo.events.some(e=>e.id==='promotion'));
 for(const name of ['capture-enters-pure-ending','capture-history-enters-pure-ending']){const e=event(explainMove(fixture(name)));assert.ok(e.evidence.played.captured);assert.equal(e.evidence.material.length,4);}
});
test('defender captures retained and no color mismatch implies a permanent fortress',()=>{
 for(const [name,move,type,field]of [['defender-can-capture-pawn','b6a6','p','pawnCaptures'],['defender-can-capture-bishop','a4b4','b','bishopCaptures']]){const r=explainMove(fixture(name)),e=event(r,'wrong-colored-bishop');assert.ok(e.evidence[field].includes(move));const c=new Chess(r.after);assert.equal(c.move(move).captured,type);}
});
test('disabled/exhausted profiles preserve frozen facts and strict budgets',()=>{
 const f=fixture('bishop-move-corner-access'),full=explainMove(f);assert.deepEqual(explainMove({...f,wrongBishopTags:false}),parent(f));for(const limit of [0,full.wrongBishopAnalysis.nodes-1]){const r=explainMove({...f,maxWrongBishopNodes:limit});assert.equal(r.wrongBishopAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);assert.equal(r.comment,parent(f).comment);}for(const limit of [-1,50001,0.1])assert.throws(()=>explainMove({...f,maxWrongBishopNodes:limit}),/maxWrongBishopNodes/);assert.throws(()=>explainMove({...f,wrongBishopTags:'yes'}),/wrongBishopTags/);
});
test('independent replay refuses omitted replies, invented corner access and false promotion colors',()=>{
 const f=fixture('bishop-move-corner-access'),e=event(explainMove(f));for(const mutate of [x=>x.replies.pop(),x=>x.replies[0].after=x.beforeFen,x=>x.cornerMoves.pop(),x=>x.occupied=true,x=>x.bishopColor=x.cornerColor,x=>x.cornerColor++,x=>x.promotionSquare='h8',x=>x.pawn.square='b6',x=>x.bishop.square='c4',x=>x.material.pop(),x=>x.defendingKing.square='a8',x=>x.played.move='c3d4',x=>x.pawnCaptures.push('b8a6')]){const changed=structuredClone(e);mutate(changed.evidence);assert.throws(()=>replay(f,changed));}assert.throws(()=>replay(f,{...e,text:e.text+' Draw guaranteed.'}));
});
test('canonical full history counters and terminal continuations remain strict',()=>{
 const f=fixture('capture-history-enters-pure-ending'),r=explainMove(f),e=event(r);replay(f,e);const fields=f.fen.split(' ');fields[4]='1';assert.throws(()=>replay({...f,fen:fields.join(' ')},e));assert.throws(()=>explainMove({...f,fen:fields.join(' ')}));assert.throws(()=>replay({...f,history:{fen:'7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',moves:['h8h7']}},e));assert.ok(!event(explainMove(fixture('quiet-clock-draw'))));
});

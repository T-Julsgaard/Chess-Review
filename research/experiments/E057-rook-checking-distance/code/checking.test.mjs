import test from 'node:test';import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './checking.mjs';import {replay} from './replay.mjs';import {explainMove as parent} from '../../E056-pawn-blockades/code/blockade.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');
const ids=new Set(['rear-rook-check','side-rook-check','rook-checking-distance']);
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{if(f.invalid){assert.throws(()=>explainMove(f),/Illegal move/);return;}const r=explainMove(f);for(const id of f.expected)assert.ok(r.events.some(e=>e.id===id),`${f.id}: missing ${id}`);for(const id of f.absent)assert.ok(!r.events.some(e=>e.id===id),`${f.id}: unexpected ${id}`);for(const e of r.events.filter(e=>ids.has(e.id)))replay(f,e);assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);});
const fixture=name=>fixtures.find(f=>f.id===name),event=(r,id='rook-checking-distance')=>r.events.find(e=>e.id===id);
test('distance boundary counts empty intervening squares rather than coordinate separation',()=>{
 for(const name of ['rear-three-clear-squares','side-three-clear-squares','side-from-right']){const e=event(explainMove(fixture(name)));assert.equal(e.evidence.clearSquares,3);assert.equal(e.evidence.ray.length,3);assert.equal(e.evidence.checkerCaptures.length,0);}
 for(const name of ['rear-short-distance','side-short-distance']){const r=explainMove(fixture(name));assert.ok(!event(r));const e=r.events.find(e=>ids.has(e.id));assert.equal(e.evidence.clearSquares,name.startsWith('rear')?2:1);}
 const e=event(explainMove(fixture('multiple-advanced-passers')),'rear-rook-check');assert.deepEqual(e.evidence.pawns.map(p=>p.square),['e3','e4']);
});
test('legal pawn or rook capture preserves direction but defeats noncapture distance label',()=>{
 for(const [name,move]of [['side-pawn-captures-checker','b4a3'],['side-rook-captures-checker','a8a3']]){const f=fixture(name),r=explainMove(f),e=event(r,'side-rook-check');assert.ok(e.evidence.checkerCaptures.includes(move));assert.ok(!event(r));const c=new Chess(r.after);const capture=c.move(move);assert.equal(capture.captured,'r');assert.ok(!c.isCheck()||c.turn()!==capture.color);}
 const f=fixture('side-rook-can-interpose'),r=explainMove(f),e=event(r);assert.ok(e.evidence.replies.some(m=>m.move==='b8b3'));const c=new Chess(r.after);c.move('b8b3');assert.equal(c.get('b3').color,'b');
});
test('promotion blocking a check outside the registered passer context remains legal and unlabeled',()=>{
 const f=fixture('promotion-interposes-outside-passer-context'),r=explainMove(f);assert.ok(!r.events.some(e=>ids.has(e.id)));const c=new Chess(r.after),p=c.move('b2b1q');assert.equal(p.promotion,'q');assert.equal(p.captured,undefined);assert.equal(c.get('b1').type,'q');
});
test('disabled and exhausted profiles retain exact parent facts; shared exhaustion drops both new labels',()=>{
 const f=fixture('rear-three-clear-squares'),full=explainMove(f);assert.deepEqual(explainMove({...f,rookCheckTags:false}),parent(f));
 for(const limit of [0,full.rookCheckAnalysis.nodes-1]){const r=explainMove({...f,maxRookCheckNodes:limit});assert.equal(r.rookCheckAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);assert.equal(r.comment,parent(f).comment);}
 for(const limit of [-1,50001,0.1])assert.throws(()=>explainMove({...f,maxRookCheckNodes:limit}),/maxRookCheckNodes/);assert.throws(()=>explainMove({...f,rookCheckTags:'yes'}),/rookCheckTags/);
});
test('independent replay rejects omitted evasions, altered checking lines and invented pawn context',()=>{
 const f=fixture('rear-three-clear-squares'),r=explainMove(f),e=event(r);
 for(const mutate of [x=>x.replies.pop(),x=>x.replies[0].after=x.beforeFen,x=>x.ray.pop(),x=>x.ray[0]='d6',x=>x.clearSquares++,x=>x.pawns.pop(),x=>x.pawns[0].color='w',x=>x.selectedPawn='d2',x=>x.checkerCaptures.push('e3e7'),x=>x.checker.square='e6',x=>x.king.square='e4',x=>x.direction='side',x=>x.played.move='a7a3']){const changed=structuredClone(e);mutate(changed.evidence);assert.throws(()=>replay(f,changed));}
 assert.throws(()=>replay(f,{...e,text:e.text.replace('immediate','future')}));
 const unsafe=fixture('side-pawn-captures-checker'),line=event(explainMove(unsafe),'side-rook-check');assert.throws(()=>replay(unsafe,{...line,id:'rook-checking-distance'}));
});
test('full canonical history counters and terminal continuation are checked independently',()=>{
 const f=fixture('history-rear-check'),r=explainMove(f),e=event(r);replay(f,e);const fields=f.fen.split(' ');fields[4]='1';assert.throws(()=>replay({...f,fen:fields.join(' ')},e));assert.throws(()=>explainMove({...f,fen:fields.join(' ')}));
 const terminal='7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';assert.throws(()=>replay({...f,history:{fen:terminal,moves:['h8h7']}},e));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,captureBoard} from './formations.mjs';
import {selectComment} from './selection.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test('formations '+f.id,()=>{
 const r=explainMove(f),ids=r.events.map(e=>e.id),color=new Chess(f.fen).turn();
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}; got ${ids}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
 for(const e of r.events.filter(e=>['pawn-lever','central-break','undermining-center','removal-defender'].includes(e.id))){const c=captureBoard(new Chess(r.after),color);assert.ok(c.moves({verbose:true}).some(m=>m.from+m.to+(m.promotion||'')===e.evidence.capture));assert.ok(c.move(e.evidence.capture).captured);}
 for(const e of r.events.filter(e=>e.id==='bishop-pawn-color')){const c=new Chess(r.after),sameColor=s=>(s.charCodeAt(0)+ +s[1])%2=== (e.evidence.bishop.charCodeAt(0)+ +e.evidence.bishop[1])%2,pawns=c.board().flat().filter(p=>p&&p.type==='p'&&p.color===color&&sameColor(p.square)).map(p=>p.square).sort();assert.deepEqual(e.evidence.pawns,pawns);assert.equal(e.evidence.colorComplex,(e.evidence.bishop.charCodeAt(0)-97+ +e.evidence.bishop[1])%2?'dark':'light');}
});
test('pawn symmetry is exact same-file rank reflection, not whole-position equality',()=>{
 const f=fixtures.find(f=>f.id==='symmetric-pawns-restored'),r=explainMove(f),c=new Chess(r.after),p=c.board().flat().filter(p=>p&&p.type==='p'),white=p.filter(p=>p.color==='w').map(p=>p.square).sort(),black=p.filter(p=>p.color==='b').map(p=>p.square[0]+(9- +p.square[1])).sort();assert.deepEqual(white,black);assert.ok(r.events.some(e=>e.id==='symmetric-pawns'));
});
test('other defenders are retained, never implied removed',()=>{
 const f=fixtures.find(f=>f.id==='another-defender-remains'),r=explainMove(f),e=r.events.find(e=>e.id==='removal-defender');assert.ok(e.evidence.remainingDefenders.includes('e6'));assert.ok(e.text.includes('Other defenders may remain'));
});
test('locked chains replay every direct ram independently',()=>{
 const f=fixtures.find(f=>f.id==='locked-central-chains'),r=explainMove(f),c=new Chess(r.after),e=r.events.find(e=>e.id==='locked-pawn-chains');for(const pair of e.evidence.pairs){assert.equal(pair.own[0],pair.enemy[0]);assert.equal(+pair.enemy[1]-+pair.own[1],1);assert.equal(c.get(pair.own).color,'w');assert.equal(c.get(pair.enemy).color,'b');}assert.equal(e.evidence.pairs.length,e.evidence.own.members.length);assert.equal(e.evidence.pairs.length,e.evidence.enemy.members.length);
});
test('cover squares independently stay on three king files within two forward ranks',()=>{
 for(const f of fixtures.filter(f=>f.id==='pawn-cover-change').flatMap(f=>[f,reflect(f)])){const r=explainMove(f),e=r.events.find(e=>e.id==='pawn-cover'),c=new Chess(r.after),color=new Chess(f.fen).turn(),dir=color==='w'?1:-1;for(const s of e.evidence.pawns){assert.equal(c.get(s).color,color);assert.equal(c.get(s).type,'p');assert.ok(Math.abs(s.charCodeAt(0)-e.evidence.king.charCodeAt(0))<=1);assert.ok([1,2].includes((+s[1]-+e.evidence.king[1])*dir));}}
});
test('warnings beat structures and named mate beats generic checkmate',()=>{
 const e=(id,text)=>({id,text,evidence:{}});assert.equal(selectComment([e('hanging-pawns','formation'),e('allows-mate','mate warning')]),'mate warning');assert.equal(selectComment([e('checkmate','mate'),e('smothered-mate','smothered')]),'smothered');assert.equal(selectComment([e('centralized-knight','center'),e('protected-knight-outpost','outpost')]),'outpost');
});
test('inherited real selected comments keep specific mate/triple/royal/outpost labels',async()=>{
 const {fixtures:move}=await import('../../E022-move-tactics/code/fixtures.mjs'),{fixtures:broad}=await import('../../E023-broad-tactics/code/fixtures.mjs'),{fixtures:transition}=await import('../../E024-transitions/code/fixtures.mjs');
 for(const [list,id,fragment] of [[move,'smothered-mate','Smothered mate'],[move,'back-rank-mate','Back-rank mate'],[broad,'triple-knight-pawn-targets','Triple attack'],[broad,'bishop-royal-fork','Royal bishop fork'],[transition,'knight-outpost','Knight outpost']])assert.ok(explainMove(list.find(f=>f.id===id)).comment.includes(fragment));
});

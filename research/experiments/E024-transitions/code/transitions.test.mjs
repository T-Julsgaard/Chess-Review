import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,endingClasses,validateHistory} from './transitions.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test('transitions '+f.id,()=>{
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}; got ${ids}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
 if(f.history){const c=new Chess(f.history.fen);for(const m of f.history.moves)c.move(m);assert.equal(c.fen(),f.fen);assert.ok(r.diagnostics.history.verified);}
 for(const e of r.events.filter(e=>e.id.startsWith('ending-'))){const c=new Chess(r.after),sig=color=>c.board().flat().filter(p=>p&&p.color===color&&p.type!=='k').map(p=>p.type).sort().join('');assert.equal(e.evidence.white,sig('w'));assert.equal(e.evidence.black,sig('b'));}
 for(const e of r.events.filter(e=>['king-rook-mate','king-queen-mate','king-bishops-mate','bishop-knight-mate','queen-rook-mate'].includes(e.id))){const c=new Chess(r.after),color=new Chess(f.fen).turn(),army=c.board().flat().filter(p=>p&&p.color===color&&p.type!=='k').map(p=>p.type).sort().join('');assert.ok(c.isCheckmate());assert.equal(army,{'king-rook-mate':'r','king-queen-mate':'q','king-bishops-mate':'bb','bishop-knight-mate':'bn','queen-rook-mate':'qr'}[e.id]);assert.equal(c.board().flat().filter(p=>p&&p.color!==color&&p.type!=='k').length,0);}
});
test('history recapture arithmetic independently matches two-ply material change',()=>{
 const values={p:1,n:3,b:3,r:5,q:9,k:0},balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===color?1:-1),0);
 for(const f of fixtures.filter(f=>f.history&&!f.absent.includes('exchange')).flatMap(f=>[f,reflect(f)])){const r=explainMove(f),c=new Chess(f.history.fen),color=new Chess(f.fen).turn(),initial=balance(c,color);const first=c.move(f.history.moves[0]),last=c.move(f.move),exchange=r.events.find(e=>e.id==='exchange');assert.ok(exchange);assert.equal(last.to,first.to);assert.equal(exchange.evidence.nominalDelta,values[last.captured]-values[first.captured]);assert.equal(exchange.evidence.balanceAfter-exchange.evidence.balanceBefore,balance(c,color)-initial);assert.equal(balance(c,color)-initial,exchange.evidence.nominalDelta);}
});
test('missing history never invents a trade',()=>{const f=fixtures.find(f=>f.id==='queen-trade');assert.ok(!explainMove({...f,history:undefined}).events.some(e=>e.id==='queen-trade'));});
test('mismatched, illegal, excessive and terminal histories are refused',()=>{
 const f=fixtures.find(f=>f.id==='queen-trade');for(const h of [{...f.history,moves:[]},{...f.history,moves:['a1h8']},{...f.history,moves:Array(1001).fill('a1a2')},{fen:'7k/8/8/8/8/8/8/K7 w - - 0 1',moves:['a1a2']}])assert.throws(()=>explainMove({...f,history:h}),/history/);
});
test('non-recapture history does not imply an exchange',()=>{
 const f=fixtures.find(f=>f.id==='minor-equal-trade'),r=explainMove({...f,move:'h2h3'});assert.ok(!r.events.some(e=>e.id==='exchange'));
});
test('exact king-pawn class excludes extra pawns on either side',()=>{
 for(const f of fixtures.filter(f=>['king-pawn-king','king-pawn-extra-pawn'].includes(f.id))){const list=endingClasses(new Chess(f.fen));assert.equal(list.some(e=>e.id==='king-pawn-king'),f.id==='king-pawn-king');}
});

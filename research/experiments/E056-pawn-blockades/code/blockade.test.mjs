import test from 'node:test';import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './blockade.mjs';import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E055-intermediate-sacrifices/code/timed.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 if(f.invalid){assert.throws(()=>explainMove(f),/Illegal move/);return;}
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 for(const e of r.events.filter(e=>e.id==='pawn-blockade'))replay(f,e);
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
});
const fixture=name=>fixtures.find(f=>f.id===name),event=r=>r.events.find(e=>e.id==='pawn-blockade');
test('all piece identities and blockade squares are exact; pawn captures remain legal',()=>{
 for(const [name,type]of [['knight-stops-nonpassed-pawn','n'],['king-blockade','k'],['rook-blockade','r'],['bishop-blockade','b'],['queen-blockade','q']]){const f=fixture(name),e=event(explainMove(f));assert.equal(e.evidence.blocker.type,type);assert.equal(e.evidence.blocker.square,'e5');assert.equal(e.evidence.pawn.square,'e6');}
 const e=event(explainMove(fixture('pawn-can-capture-both-diagonals')));assert.deepEqual(e.evidence.pawnCaptures,['e6d5','e6f5']);assert.ok(e.evidence.replies.every(m=>m.from!=='e6'||m.to[0]!=='e'));
 const c=new Chess(fixture('pawn-can-capture-en-passant').fen);c.move('d2d4');const ep=c.move('e4d3');assert.ok(ep.isEnPassant());
});
test('starting double pushes and promotion pushes cannot cross or enter the occupied square',()=>{
 for(const name of ['starting-pawn-double-push-blocked','promotion-step-blocked']){const f=fixture(name),r=explainMove(f),e=event(r);assert.ok(e);const c=new Chess(r.after);const straight=c.moves({verbose:true}).filter(m=>m.from===e.evidence.pawn.square&&m.to[0]===m.from[0]);assert.equal(straight.length,0);}
 const f=fixture('capture-creates-blockade'),e=event(explainMove(f));assert.equal(e.evidence.played.captured,'b');
});
test('blocker can be captured and warning or check retains priority',()=>{
 const f=fixture('hanging-blocker-warning'),r=explainMove(f),e=event(r);assert.ok(e.evidence.blockerCaptures.includes('d6e5'));assert.ok(r.comment.startsWith('Watch out:'));
 const c=new Chess(r.after);c.move('d6e5');assert.equal(c.get('e5').color,'b');
 const qf=fixture('queen-blockade'),q=explainMove(qf);assert.ok(event(q));assert.ok(q.events.some(e=>e.id==='check'));assert.equal(q.comment,parent(qf).comment);assert.ok(!q.comment.startsWith('Queen blockade:'));
});
test('direct recapture that itself offers positive-cost mate is not an intermediate sacrifice',()=>{
 const r=explainMove(fixture('direct-recapture-itself-mating-offer'));assert.ok(r.events.some(e=>e.id==='mating-sacrifice'));assert.equal(r.intermediateSacrificeAnalysis.reason,'direct-recapture');assert.ok(!r.events.some(e=>e.id==='intermediate-sacrifice'));
});
test('disabled and exhausted profiles preserve all parent facts and limits are strict',()=>{
 const f=fixture('knight-stops-nonpassed-pawn'),full=explainMove(f);assert.deepEqual(explainMove({...f,blockadeTags:false}),parent(f));
 for(const limit of [0,full.blockadeAnalysis.nodes-1]){const r=explainMove({...f,maxBlockadeNodes:limit});assert.equal(r.blockadeAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);assert.equal(r.comment,parent(f).comment);}
 for(const limit of [-1,50001,0.1])assert.throws(()=>explainMove({...f,maxBlockadeNodes:limit}),/maxBlockadeNodes/);assert.throws(()=>explainMove({...f,blockadeTags:'yes'}),/blockadeTags/);
});
test('independent replay rejects changed geometry, omitted legal replies and invented captures',()=>{
 const f=fixture('pawn-can-capture-both-diagonals'),r=explainMove(f),e=event(r);
 for(const mutate of [x=>x.replies.pop(),x=>x.replies[0].after=x.beforeFen,x=>x.pawnCaptures.pop(),x=>x.blockerCaptures.push('e6e5'),x=>x.blocker.type='k',x=>x.blocker.square='e4',x=>x.pawn.square='e7',x=>x.pawn.color='w',x=>x.played.move='c4d6',x=>x.beforeFen=x.afterFen]){const altered=structuredClone(e);mutate(altered.evidence);assert.throws(()=>replay(f,altered));}
 assert.throws(()=>replay(f,{...e,text:e.text.replace('straight advance','every move')}));
});
test('canonical history, exact counters and terminal guards remain strict',()=>{
 const f=fixture('history-new-blockade'),r=explainMove(f),e=event(r);replay(f,e);
 const fields=f.fen.split(' ');fields[4]='1';assert.throws(()=>replay({...f,fen:fields.join(' ')},e));assert.throws(()=>explainMove({...f,fen:fields.join(' ')}));
 const draw=explainMove(fixture('quiet-clock-draw'));assert.ok(!event(draw));
 const terminal=new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');assert.ok(terminal.isStalemate());assert.throws(()=>replay({...f,history:{fen:terminal.fen(),moves:['h8h7']}},e));
});

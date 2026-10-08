import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
const {explainMove}=await import('./lines.mjs');
const {replay,replayResult}=await import('./replay.mjs');
const {explainMove:parent}=await import('../../E076-pawn-army-inventories/code/inventories.mjs');
const ownIds=['connected-passer-proof','open-pawn-file-proof','open-rank-proof'];
const fixture=id=>{const f=fixtures.find(f=>f.id===id);assert.ok(f,id);return f;};
const event=(id,kind)=>{const e=explainMove(fixture(id)).events.find(e=>e.id===kind);assert.ok(e,id+' '+kind);return e;};
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 if(f.inputError){assert.throws(()=>explainMove(f),f.expectedError?new RegExp(f.expectedError):undefined);return;}
 const result=explainMove(f);if(f.openLineTags===false){assert.deepEqual(result,parent(f));return;}
 replayResult(f,result);if(f.expectedStatus)assert.equal(result.openLineAnalysis.status,f.expectedStatus);
 for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id),id);for(const id of f.absent)assert.ok(!result.events.some(e=>e.id===id),id);
 for(const e of result.events.filter(e=>ownIds.includes(e.id))){replay(f,e);assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.ok(result.events.filter(e=>e.id==='open-pawn-file-proof').length<=1,'A single legal move opens at most one pawn file');
});
test('connected geometry never promises reciprocal support or legal recapture',()=>{
 const same=event('connected-new-same-rank','connected-passer-proof'),diagonal=event('connected-new-diagonal','connected-passer-proof'),advance=event('connected-advance','connected-passer-proof');
 assert.deepEqual(same.evidence.claim.support,[]);assert.deepEqual(diagonal.evidence.claim.support,[{from:'d3',to:'c4'}]);assert.equal(advance.evidence.claim.eligibility,'advanced');
 const three=explainMove(fixture('connected-chain-three')).events.filter(e=>e.id==='connected-passer-proof');assert.equal(three.length,2);for(const e of [same,diagonal,advance,...three])assert.ok(e.evidence.claim.support.length<=1);
});
test('complete pawn-free file evidence preserves nonpawn blockers and off-target EP',()=>{
 const blocker=event('open-file-remaining-rook','open-pawn-file-proof');assert.ok(blocker.evidence.claim.remainingPieces.some(p=>p.type==='r'&&p.square==='c1'));
 const ep=event('ep-capture','open-pawn-file-proof');assert.deepEqual(ep.evidence.before.ep.map(m=>m.uci),['e5d6']);assert.equal(ep.evidence.before.ep[0].victim,'d5');assert.equal(ep.evidence.claim.file,'e');
});
test('open rank certifies all seven actual root legal moves in every rank/color',()=>{
 for(const f of fixtures.filter(f=>/^rank-[rq]-\d$/.test(f.id)).flatMap(f=>[f,reflect(f)])){const r=explainMove(f),e=r.events.find(e=>e.id==='open-rank-proof');assert.equal(e.evidence.claim.alternatives.length,7);assert.equal(e.evidence.claim.cells.length,8);for(const m of e.evidence.claim.alternatives){assert.ok(e.evidence.legalMoves.includes(m.uci));assert.equal(m.from[1],m.to[1]);}replay(f,e);}
});
test('exact/one-less/zero budget is atomic and disabled path ignores unused limits',()=>{
 for(const id of ['connected-chain-three','ep-capture','rank-rook-four']){const f=fixture(id),r=explainMove(f),nodes=r.openLineAnalysis.nodes;assert.equal(explainMove({...f,maxOpenLineNodes:nodes}).openLineAnalysis.status,'proven');for(const limit of [0,nodes-1]){const limited=explainMove({...f,maxOpenLineNodes:limit});assert.equal(limited.openLineAnalysis.status,'exhausted');assert.deepEqual(limited.events,parent(f).events);assert.equal(limited.comment,parent(f).comment);replayResult({...f,maxOpenLineNodes:limit},limited);}assert.deepEqual(explainMove({...f,openLineTags:false,maxOpenLineNodes:-1}),parent(f));}
});
test('warnings and terminal explanations retain parent precedence',()=>{
 for(const id of ['actual-check','actual-mate','actual-stalemate','dead-promotion','rank-restricted-check-evasion'])for(const f of [fixture(id),reflect(fixture(id))])assert.equal(explainMove(f).comment,parent(f).comment);
});
test('forged complete maps, classification, EP, actor, move, text and event sets fail',()=>{
 for(const [id,kind]of [['connected-new-diagonal','connected-passer-proof'],['ep-capture','open-pawn-file-proof'],['rank-rook-four','open-rank-proof']]){const f=fixture(id),e=event(id,kind);for(const mutation of [x=>x.after.pieces.pop(),x=>x.after.map.own.pop(),x=>x.after.files[0].file='z',x=>x.after.classification.own[0].passed=!x.after.classification.own[0].passed,x=>x.actor='b',x=>x.played.to='a8']){const forged=structuredClone(e);mutation(forged.evidence);assert.throws(()=>replay(f,forged));}assert.throws(()=>replay(f,{...e,text:e.text+' Winning.'}));assert.throws(()=>replay(f,{...e,qualityClaim:true}));const missing=structuredClone(explainMove(f));missing.events=missing.events.filter(e=>e.id!==kind);assert.throws(()=>replayResult(f,missing));}
 const rank=event('rank-rook-four','open-rank-proof');rank.evidence.claim.alternatives[0].after=rank.evidence.before.fen;assert.throws(()=>replay(fixture('rank-rook-four'),rank));const ep=event('ep-capture','open-pawn-file-proof');ep.evidence.before.ep[0].victim='e5';assert.throws(()=>replay(fixture('ep-capture'),ep));
 const pair=event('connected-new-diagonal','connected-passer-proof');pair.evidence.claim.support.push({from:'c4',to:'d3'});assert.throws(()=>replay(fixture('connected-new-diagonal'),pair));
});

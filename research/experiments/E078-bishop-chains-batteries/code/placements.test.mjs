import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs'),{explainMove}=await import('./placements.mjs'),{replay,replayResult}=await import('./replay.mjs');
const {explainMove:parent}=await import('../../E077-connected-passers-open-lines/code/lines.mjs');
const ownIds=['outside-chain-proof','behind-chain-proof','slider-battery-proof'];
const fixture=id=>{const f=fixtures.find(f=>f.id===id);assert.ok(f,id);return f;};
const events=(id,kind)=>explainMove(fixture(id)).events.filter(e=>e.id===kind);
const event=(id,kind)=>{const list=events(id,kind);assert.ok(list.length,id);return list[0];};
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 if(f.inputError){assert.throws(()=>explainMove(f),f.expectedError?new RegExp(f.expectedError):undefined);return;}
 const result=explainMove(f);if(f.placementTags===false){assert.deepEqual(result,parent(f));return;}replayResult(f,result);
 if(f.expectedStatus)assert.equal(result.placementAnalysis.status,f.expectedStatus);for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id),id);for(const id of f.absent)assert.ok(!result.events.some(e=>e.id===id),id);
 for(const e of result.events.filter(e=>ownIds.includes(e.id))){replay(f,e);assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.ok(!result.comment||result.comment.split(/\s+/).length<=24);
});
test('complete branching pawn graph and actual escape preserve every ray and blocker',()=>{
 const e=event('outside-branched-chain','outside-chain-proof'),g=e.evidence.claim.component;assert.deepEqual(g.members,['c3','c5','d4','e5']);assert.deepEqual(g.edges,[{base:'c3',head:'d4'},{base:'d4',head:'c5'},{base:'d4',head:'e5'}]);assert.deepEqual(g.bases,['c3']);assert.deepEqual(g.heads,['c5','e5']);assert.deepEqual(g.terminals,['c5','e5']);assert.deepEqual(e.evidence.claim.restrictionBefore,[{direction:'NW',blocker:'c3'}]);assert.deepEqual(e.evidence.claim.restrictionAfter,[]);
 const before=e.evidence.before.bishopRays.find(b=>b.square==='d2'),after=e.evidence.after.bishopRays.find(b=>b.square==='h6');assert.equal(before.rays.length,4);assert.equal(after.rays.length,4);assert.ok(!after.rays.some(r=>r.cells.some(c=>g.members.includes(c.square))));
 const behind=event('behind-branched-chain','behind-chain-proof');assert.deepEqual(behind.evidence.claim.restrictionBefore,[]);assert.deepEqual(behind.evidence.claim.restrictionAfter,[{direction:'NW',blocker:'c3'}]);
});
test('maximal batteries retain compatible middle sliders and exact merge/split groups',()=>{
 const middle=event('triple-queen-middle','slider-battery-proof').evidence.claim.group;assert.deepEqual(middle.members.map(p=>p.square),['d1','d4','d7']);assert.deepEqual(middle.families,['qr','qr']);assert.ok(!middle.gaps.includes('d4'));
 const merged=events('merge-maximal-groups','slider-battery-proof');assert.equal(merged.length,1);assert.equal(merged[0].evidence.claim.group.members.length,4);const split=events('split-triple-to-pair','slider-battery-proof');assert.equal(split.length,1);assert.deepEqual(split[0].evidence.claim.group.members.map(p=>p.type),['r','r']);assert.equal(split[0].evidence.claim.group.hasQueen,false);
 const multi=events('two-new-batteries','slider-battery-proof');assert.equal(multi.length,2);assert.deepEqual(multi.map(e=>e.evidence.claim.group.orientation),['file','rank']);
 const four=event('four-bishops','slider-battery-proof');assert.equal(four.evidence.claim.group.members.length,4);assert.deepEqual(four.evidence.claim.group.gaps,[]);assert.equal(new Set(four.evidence.claim.group.members.map(p=>(p.square.charCodeAt(0)+Number(p.square[1]))%2)).size,1);
});
test('every compatible family, both diagonal orientations and promoted extra sliders are certified',()=>{
 const families=new Set();for(const id of ['qr-file','qr-rank','qb-rising','qb-falling','qq-file','qq-rank','qq-rising','qq-falling','rr-file','rr-rank','bb-rising','bb-falling'])for(const f of [fixture(id),reflect(fixture(id))]){const e=explainMove(f).events.find(e=>e.id==='slider-battery-proof');for(const family of e.evidence.claim.group.families)families.add(family);assert.equal(e.evidence.claim.group.hasQueen,e.text.startsWith('Queen battery:'));replay(f,e);}assert.deepEqual([...families].sort(),['bb','bq','qq','qr','rr']);
 for(const type of ['q','r','b'])for(const prefix of ['promotion-','capture-promotion-']){const e=event(prefix+type,'slider-battery-proof');assert.equal(e.evidence.played.promotion,type);}
 const ep=event('ep-removes-two-blockers','slider-battery-proof');assert.equal(ep.evidence.played.flags,'e');assert.deepEqual(ep.evidence.claim.group.members.map(p=>p.square),['a5','f5']);assert.ok(ep.evidence.claim.group.gaps.includes('d5'));assert.ok(ep.evidence.claim.group.gaps.includes('e5'));
});
test('exact/one-less/zero budgets are atomic and disabled limits ignored',()=>{
 for(const id of ['outside-branched-chain','four-sliders','promotion-b','two-new-batteries']){const f=fixture(id),r=explainMove(f),nodes=r.placementAnalysis.nodes;assert.equal(explainMove({...f,maxPlacementNodes:nodes}).placementAnalysis.status,'proven');for(const limit of [0,nodes-1]){const limited=explainMove({...f,maxPlacementNodes:limit});assert.equal(limited.placementAnalysis.status,'exhausted');assert.deepEqual(limited.events,parent(f).events);assert.equal(limited.comment,parent(f).comment);replayResult({...f,maxPlacementNodes:limit},limited);}assert.deepEqual(explainMove({...f,placementTags:false,maxPlacementNodes:-1}),parent(f));}
});
test('all inherited events and check/terminal/combined-profile comments keep precedence',()=>{
 for(const id of ['qq-file','actual-mate','actual-stalemate','dead-promotion','actual-dead-capture','combined-profiles'])for(const f of [fixture(id),reflect(fixture(id))]){const result=explainMove(f),prior=parent(f);assert.equal(result.comment,prior.comment);assert.deepEqual(result.events.filter(e=>!ownIds.includes(e.id)),prior.events);}
});
test('forged full components, rays, groups, bounds, actor, movement, text and complete sets fail',()=>{
 for(const [id,kind]of [['outside-branched-chain','outside-chain-proof'],['triple-queen-middle','slider-battery-proof']]){const f=fixture(id),e=event(id,kind);for(const mutate of [x=>x.after.pieces.pop(),x=>x.actor='b',x=>x.played.to='a8',x=>x.after.chains.push({members:[]})]){const forged=structuredClone(e);mutate(forged.evidence);assert.throws(()=>replay(f,forged));}assert.throws(()=>replay(f,{...e,text:e.text+' Winning.'}));assert.throws(()=>replay(f,{...e,qualityClaim:true}));const missing=structuredClone(explainMove(f));missing.events=missing.events.filter(e=>e.id!==kind);assert.throws(()=>replayResult(f,missing));}
 const chain=event('outside-branched-chain','outside-chain-proof');chain.evidence.claim.component.edges.pop();assert.throws(()=>replay(fixture('outside-branched-chain'),chain));const rays=event('outside-branched-chain','outside-chain-proof');rays.evidence.after.bishopRays[0].rays.pop();assert.throws(()=>replay(fixture('outside-branched-chain'),rays));
 for(const mutate of [x=>x.claim.group.members.splice(1,1),x=>x.claim.group.gaps.push('d4'),x=>x.claim.group.hasQueen=false,x=>x.claim.identityMappedKey='wrong']){const group=event('triple-queen-middle','slider-battery-proof');mutate(group.evidence);assert.throws(()=>replay(fixture('triple-queen-middle'),group));}
 const bound=event('battery-queen-with-enemy-bound','slider-battery-proof');assert.ok(bound.evidence.claim.group.bounds.after);bound.evidence.claim.group.bounds.after=null;assert.throws(()=>replay(fixture('battery-queen-with-enemy-bound'),bound));
});

import test from 'node:test';import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './inventories.mjs';import {replay,replayResult} from './replay.mjs';
import {explainMove as parent} from '../../E075-board-material/code/foundations.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
  if(f.inputError){assert.throws(()=>explainMove(f),error=>!f.expectedError||error.message.includes(f.expectedError));return;}
  const result=explainMove(f);
  if(f.inventoryTags===false){assert.deepEqual(result,parent(f));return;}
  if(f.expectedStatus)assert.equal(result.inventoryAnalysis.status,f.expectedStatus);
  for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id),f.id+': missing '+id);
  for(const id of f.absent)assert.ok(!result.events.some(e=>e.id===id),f.id+': unexpected '+id);
  replayResult(f,result);
});
const fixture=id=>fixtures.find(f=>f.id===id),event=id=>explainMove(fixture(id)).events.find(e=>e.id==='pawn-skeleton');
test('passer blockers, blockade/pin geometry and legal EP exclusion are explicit',()=>{
  for(const id of['blocked-passer-geometry','pinned-passer-geometry','adjacent-pawn-same-rank','adjacent-pawn-behind','same-file-pawn-behind'])assert.ok(event(id).evidence.after.passers.own.includes('c4'));
  assert.ok(!event('adjacent-pawn-ahead').evidence.after.passers.own.includes('c4'));
  assert.ok(!event('same-file-pawn-ahead').evidence.after.passers.own.includes('c4'));
  const legal=event('ep-vulnerable-double').evidence.after;
  assert.deepEqual(legal.ep.map(m=>m.uci),['d4c3']);assert.ok(!legal.passers.own.includes('c4'));
  const pinned=event('ep-illegal-pinned-double').evidence.after;
  assert.deepEqual(pinned.ep,[]);assert.ok(pinned.passers.own.includes('c4'));
});
test('all four flank files, central contributors and independent result completeness',()=>{
  const f=fixture('d-e-boundary-transfer'),r=explainMove(f),events=r.events.filter(e=>e.id==='flank-count-imbalance');
  assert.equal(events.length,2);assert.deepEqual(events.map(e=>e.evidence.claim.files),['abcd','efgh']);
  assert.ok(events[1].evidence.claim.own.includes('e5'));
  const forged=structuredClone(r);forged.events=forged.events.filter(e=>e.id!=='flank-count-imbalance');assert.throws(()=>replayResult(f,forged));
});
test('budget exact/one-less/zero is atomic and disabled profile preserves parent',()=>{
  const f=fixture('d-e-boundary-transfer'),r=explainMove(f),limit=r.inventoryAnalysis.nodes;
  assert.equal(explainMove({...f,maxInventoryNodes:limit}).inventoryAnalysis.status,'proven');
  for(const n of[0,limit-1]){const limited=explainMove({...f,maxInventoryNodes:n});assert.equal(limited.inventoryAnalysis.status,'exhausted');assert.deepEqual(limited.events,parent(f).events);assert.equal(limited.comment,parent(f).comment);replayResult({...f,maxInventoryNodes:n},limited);}
  assert.deepEqual(explainMove({...f,inventoryTags:false}),parent(f));
});
test('new descriptors retain parent priority on warnings and terminal facts',()=>{
  for(const id of['rook-vs-nn','actual-pawn-check','actual-mate','actual-stalemate','dead-promotion'])assert.equal(explainMove(fixture(id)).comment,parent(fixture(id)).comment);
});
test('tampered inventory, pawn classification, armies, wings, EP and move fields fail',()=>{
  for(const id of['pawn-capture-creates-passer','ep-vulnerable-double','promotion-pair']){
    const f=fixture(id),e=event(id);
    for(const mutate of[x=>x.after.map.own.pop(),x=>x.after.pieces.pop(),x=>x.after.armies.own.signature='q',x=>x.after.wings[0].files='abc',x=>x.after.classification.own[0].passed=!x.after.classification.own[0].passed,x=>x.played.to='a8',x=>x.actor='b']){
      const forged=structuredClone(e);mutate(forged.evidence);assert.throws(()=>replay(f,forged));
    }
    assert.throws(()=>replay(f,{...e,text:e.text+' Winning.'}));assert.throws(()=>replay(f,{...e,qualityClaim:true}));
  }
  const f=fixture('ep-vulnerable-double'),e=event(f.id),forged=structuredClone(e);forged.evidence.after.ep=[];assert.throws(()=>replay(f,forged));
});
test('EP expiry changes passed counts without changing pawn arrangement',()=>{
  const f=fixture('quiet-ep-expiry'),r=explainMove(f),e=r.events.find(e=>e.id==='passed-count-imbalance');
  assert.deepEqual(e.evidence.before.map,e.evidence.after.map);
  assert.ok(!e.evidence.before.passers.enemy.includes('d5'));
  assert.ok(e.evidence.after.passers.enemy.includes('d5'));
  assert.deepEqual(e.evidence.before.ep.map(m=>m.uci),['c5d6']);
  assert.deepEqual(e.evidence.after.ep,[]);replay(f,e);
});

import test from 'node:test';import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,crossIds} from './cross.mjs';import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E052-desperado-captures/code/desperado.mjs';
await openResearchData(['D001'],{purpose:'test'});const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 if(f.invalid){assert.throws(()=>explainMove(f),/Illegal move/);return;}
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 for(const e of r.events.filter(e=>crossIds.has(e.id))){replay(f,e);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
});
const fixture=name=>fixtures.find(f=>f.id===name),event=f=>explainMove(f).events.find(e=>crossIds.has(e.id));
test('direct, discovered, double, mating, captured checker and king discovery have distinct certificates',()=>{
 for(const name of ['knight-block','bishop-block','queen-block','rook-bishop-ray','rook-queen-ray','pawn-block'])assert.equal(event(fixture(name)).evidence.mechanism.kind,'block');
 assert.equal(event(fixture('discovered-block')).evidence.direct.length,0);
 assert.equal(event(fixture('double-block')).evidence.afterCheckers.length,2);
 const mate=event(fixture('mating-double-block'));assert.equal(mate.evidence.terminal,'mate');assert.equal(mate.evidence.evasions.length,0);
 assert.equal(event(fixture('mating-block-at-clock-boundary')).evidence.terminal,'mate');
 assert.equal(event(fixture('capture-checking-rook')).evidence.mechanism.kind,'capture');
 assert.equal(event(fixture('king-discovered-escape')).evidence.mechanism.kind,'king-discovery');
});
test('promotion identities and off-destination EP checker removal are replayed',()=>{
 for(const [name,type]of [['queen','q'],['rook','r'],['bishop','b'],['knight','n']])assert.equal(event(fixture(`${name}-promotion-block`)).evidence.afterCheckers[0].type,type);
 const ep=event(fixture('ep-checker-capture')).evidence;assert.equal(ep.mechanism.capturedSquare,'d5');assert.equal(ep.played.to,'d6');assert.deepEqual(ep.discovered,['e1']);
});
test('neutral label does not claim safety or gain; legal checker capture can lose the checking unit',()=>{
 const f=fixture('knight-block'),c=new Chess(f.fen);c.move(f.move);c.move('e8e4');assert.equal(c.get('e4').color,'b');
 const e=event(f);assert.equal(e.qualityClaim,false);assert.ok(e.evidence.evasions.some(r=>r.move==='e8e4'&&r.gain===-3));assert.ok(!/wins|best|good|only move/i.test(e.text));
});
test('tampered checkers, kings, rays, mechanisms, exact evasions, material, text and terminal states fail',()=>{
 const f=fixture('knight-block'),original=event(f);
 for(const mutate of [e=>e.beforeCheckers.pop(),e=>e.afterCheckers.pop(),e=>e.ownBefore.square='d1',e=>e.ownAfter.square='d1',e=>e.enemyKing.square='g6',e=>e.rays[0].between.pop(),e=>e.mechanism.checkers.pop(),e=>e.direct.pop(),e=>e.discovered.push('c3'),e=>e.initialBalance++,e=>e.terminal='mate',e=>e.evasions.pop(),e=>e.evasions[0].gain++,e=>e.evasions[0].terminal='draw',e=>e.evasions[0].after=e.before]){
  const changed=structuredClone(original);mutate(changed.evidence);assert.throws(()=>replay(f,changed));
 }
 assert.throws(()=>replay(f,{...original,text:'Nice, this wins material.'}));
 const ep=fixture('ep-checker-capture'),changed=structuredClone(event(ep));changed.evidence.mechanism.capturedSquare='d6';assert.throws(()=>replay(ep,changed));
});
test('disabled/exhausted profiles preserve parent events and malformed inputs fail',()=>{
 for(const name of ['knight-block','discovered-block','double-block','mating-double-block','ep-checker-capture']){
  const f=fixture(name),full=explainMove(f);assert.deepEqual(explainMove({...f,crossCheckTags:false}),parent(f));
  for(const limit of [0,full.crossCheckAnalysis.nodes-1]){const r=explainMove({...f,maxCrossCheckNodes:limit});assert.equal(r.crossCheckAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);}
 }
 for(const max of [-1,50001,0.5])assert.throws(()=>explainMove({...fixtures[0],maxCrossCheckNodes:max}),/maxCrossCheckNodes/);
 assert.throws(()=>explainMove({...fixtures[0],crossCheckTags:1}),/crossCheckTags/);
});
test('live full history replays; mismatched counters, terminal roots and illegal evasions are refused',()=>{
 const f=fixture('history-checking-rook'),e=event(f);replay(f,e);
 assert.throws(()=>replay({...f,fen:f.fen.replace(' 1 2',' 2 2')},e));
 const dead=fixture('no-before-check'),c=new Chess(dead.fen);c.remove('a7');assert.throws(()=>explainMove({...dead,fen:c.fen()}),/terminal/);
 assert.throws(()=>explainMove(fixture('illegal-double-check-block')),/Illegal move/);
});

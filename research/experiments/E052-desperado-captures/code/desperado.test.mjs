import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove,desperadoIds} from './desperado.mjs';
import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E051-interference-combinations/code/interference.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const f of fixtures.flatMap(f=>[f,reflect(f)]))test(f.id,()=>{
 const r=explainMove(f),ids=r.events.map(e=>e.id);
 for(const id of f.expected)assert.ok(ids.includes(id),`${f.id}: missing ${id}`);
 for(const id of f.absent)assert.ok(!ids.includes(id),`${f.id}: unexpected ${id}`);
 for(const e of r.events.filter(e=>desperadoIds.has(e.id))){replay(f,e);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.ok(!r.comment||r.comment.split(/\s+/).length<=24);
});
const fixture=name=>fixtures.find(f=>f.id===name),event=f=>explainMove(f).events.find(e=>desperadoIds.has(e.id));
test('all unit types, maximal capture, equal exchanges and quiet mate losses are certified',()=>{
 for(const [name,cost,value]of [['knight-pawn-salvage',3,1],['queen-maximal-capture',9,5],['rook-equal-capture',5,5],['bishop-equal-capture',3,3]]) {
  const e=event(fixture(name)).evidence;
  assert.equal(e.cost,cost);assert.equal(e.capturedValue,value);assert.equal(e.maximumCaptureValue,value);assert.equal(e.minimumGain,value-cost);
  assert.ok(e.quietBranches.length);assert.ok(e.acceptances.length);
  assert.ok(e.quietBranches.every(b=>b.greatestGain<=-cost));
  if(name!=='knight-pawn-salvage')assert.ok(e.quietBranches.every(b=>b.terminal==='mate'&&!b.responses.length));
 }
});
test('retreat, material recovery, absent recapture, absent quiet moves and terminal capture are legal negatives',()=>{
 let c=new Chess(fixture('safe-knight-retreat').fen);c.move('a6b4');assert.ok(!c.moves({verbose:true}).some(m=>m.to==='b4'&&m.captured==='n'));
 c=new Chess(fixture('quiet-response-recovers').fen);for(const m of ['a6b4','b6b4','b1b4'])c.move(m);assert.equal(c.get('b4').type,'r');
 c=new Chess(fixture('actual-recapture-missing').fen);c.move('a6c7');assert.ok(!c.moves({verbose:true}).some(m=>m.to==='c7'&&m.captured==='n'));
 c=new Chess(fixture('no-quiet-alternatives').fen);assert.equal(c.moves({verbose:true}).filter(m=>!m.captured).length,0);
 c=new Chess(fixture('actual-dead-position').fen);c.move('a6c7');assert.ok(c.isInsufficientMaterial());
 c=new Chess(fixture('actual-response-draw').fen);for(const m of ['a8b8','c8b8','a7b8'])c.move(m);assert.ok(c.isInsufficientMaterial());
});
test('legal castle relocates the threatened rook to a safe square',()=>{
 const f=fixture('castle-saves-rook'),c=new Chess(f.fen);assert.ok(c.attackers('h1','b').length);
 c.move('e1g1');assert.equal(c.get('h1'),undefined);assert.deepEqual(c.get('f1'),{type:'r',color:'w'});
 assert.ok(!c.moves({verbose:true}).some(m=>m.to==='f1'&&m.captured==='r'));assert.ok(!event(f));
});
test('tampered exact alternative and recapture sets, identities, terminal flags, response values and baselines fail replay',()=>{
 const f=fixture('knight-pawn-salvage'),original=event(f);
 for(const mutate of [e=>e.unit.square='a5',e=>e.initialAttackers.pop(),e=>e.cost++,e=>e.capturedValue++,e=>e.maximumCaptureValue++,e=>e.unitCaptures.pop(),e=>e.horizonPlies=4,e=>e.initialBalance++,e=>e.quietBranches.pop(),e=>e.quietBranches[0].unit.square='a5',e=>e.quietBranches[0].capture.move='b6b5',e=>e.quietBranches[0].terminal='mate',e=>e.quietBranches[0].responses.pop(),e=>e.quietBranches[0].responses[0].gain++,e=>e.quietBranches[0].greatestGain++,e=>e.acceptances.pop(),e=>e.acceptances[0].responses.pop(),e=>e.acceptances[0].acceptedGain++,e=>e.acceptances[0].minimumGain++,e=>e.minimumGain++]){
  const altered=structuredClone(original);mutate(altered.evidence);assert.throws(()=>replay(f,altered));
 }
 const corner=fixture('queen-maximal-capture'),changed=structuredClone(event(corner));changed.evidence.quietBranches[0].terminal='live';assert.throws(()=>replay(corner,changed));
 assert.throws(()=>replay(f,{...original,text:original.text.replace('captures 1','captures 9')}));
});
test('disabled and exhausted profiles retain parent facts; malformed limits are rejected',()=>{
 for(const f of fixtures.slice(0,8)){
  const full=explainMove(f);assert.deepEqual(explainMove({...f,desperadoTags:false}),parent(f));
  for(const n of [0,full.desperadoAnalysis.nodes-1]){
   const r=explainMove({...f,maxDesperadoNodes:n});assert.equal(r.desperadoAnalysis.status,'exhausted');assert.deepEqual(r.events,parent(f).events);
  }
 }
 for(const n of [-1,50001,1.5])assert.throws(()=>explainMove({...fixtures[0],maxDesperadoNodes:n}),/maxDesperadoNodes/);
 assert.throws(()=>explainMove({...fixtures[0],desperadoTags:'yes'}),/desperadoTags/);
});
test('history canonical counters and illegal terminal continuation are refused',()=>{
 const f=fixture('knight-pawn-salvage'),e=event(f);
 assert.throws(()=>replay({...f,history:{fen:f.fen,moves:[]},fen:f.fen.replace(' 0 1',' 1 1')},e));
 const terminal=fixture('actual-dead-position');assert.throws(()=>replay({...f,history:{fen:terminal.fen,moves:['a6c7','h8g8']}},e));
});

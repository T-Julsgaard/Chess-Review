import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './foundations.mjs';
import {replayResult,replay} from './replay.mjs';
import {explainMove as parent} from '../../E074-french-scheveningen/code/centers.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect}=await import('./fixtures.mjs');
for(const input of fixtures.flatMap(f=>[f,reflect(f)]))test(input.id,()=>{
  if(input.inputError){assert.throws(()=>explainMove(input));return;}
  const result=explainMove(input);
  if(input.foundationTags===false){assert.deepEqual(result,parent(input));return;}
  assert.equal(result.foundationAnalysis.status,input.expectedStatus);
  for(const id of input.expected)assert.ok(result.events.some(e=>e.id===id));
  for(const id of input.absent)assert.ok(!result.events.some(e=>e.id===id));
  replayResult(input,result);
});
const fixture=id=>fixtures.find(f=>f.id===id);
test('actual terminal moves remain accepted, king/check warnings keep priority',()=>{
  for(const [id,predicate]of[['actual-mate','isCheckmate'],['actual-stalemate','isStalemate'],['actual-dead-capture','isInsufficientMaterial']]){
    const input=fixture(id),result=explainMove(input),board=new Chess(result.after);
    assert.ok(board[predicate]()); assert.equal(result.foundationAnalysis.status,'accepted');
    replayResult(input,result);
  }
  const result=explainMove(fixture('actual-check'));
  assert.ok(result.events.some(e=>e.id==='check'));
  for(const id of['actual-check','actual-mate','actual-stalemate'])assert.equal(explainMove(fixture(id)).comment,parent(fixture(id)).comment);
});
test('accepted and rejected states, empty alternatives and truncation are not interchangeable',()=>{
  const input=fixture('long-origin-alternatives'),result=explainMove(input),e=result.events[0];
  assert.ok(e.evidence.originMoves.length>3); assert.ok(e.text.includes('Examples of legal'));
  assert.equal(e.text.match(/c3[a-h][1-8]/g).length,3);
  const none=explainMove(fixture('no-origin-alternatives')).events[0];
  assert.deepEqual(none.evidence.originMoves,[]);
  assert.ok(none.text.includes('no legal move starts'));
  for(const mutate of[r=>r.foundationAnalysis.accepted=true,r=>r.events[0].evidence.accepted=true,r=>r.after=input.fen,r=>r.events=[]]){
    const forged=structuredClone(result);mutate(forged);assert.throws(()=>replayResult(input,forged));
  }
});
test('special capture squares, history, castling flags and promotion fields resist tampering',()=>{
  for(const id of['castle-kingside','ep-legal','capture-promotion-n','valid-history']){
    const input=fixture(id),event=explainMove(input).events.find(e=>e.id==='piece-movement');
    for(const mutate of[e=>e.played.flags='n',e=>e.played.promotion='q',e=>e.played.captured='q',e=>e.to.file='h',e=>e.before.counts.own.k=0]){
      const forged=structuredClone(event);mutate(forged.evidence);
      if(JSON.stringify(forged)!==JSON.stringify(event))assert.throws(()=>replay(input,forged));
    }
  }
  const input=fixture('valid-history'),event=explainMove(input).events.find(e=>e.id==='piece-movement'),forged=structuredClone(event);
  forged.evidence.history.pop();assert.throws(()=>replay(input,forged));
});

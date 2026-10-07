import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {explainMove} from './formations.mjs';
import {replay} from './replay.mjs';
import {explainMove as parent} from '../../E071-octopus-knights/code/octopus.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {fixtures,reflect} = await import('./fixtures.mjs');
const ids = ['stonewall-structure','maroczy-bind'], fixture = id => fixtures.find(f => f.id === id);
const events = f => explainMove(f).events.filter(e => ids.includes(e.id));
for (const f of fixtures.flatMap(f => [f,reflect(f)])) test(f.id, () => {
  if (f.invalid) { assert.throws(() => explainMove(f),/Illegal move/); return; }
  const r = explainMove(f);
  for (const id of f.expected) assert.ok(r.events.some(e => e.id === id), f.id+': missing '+id);
  for (const id of f.absent) assert.ok(!r.events.some(e => e.id === id), f.id+': unexpected '+id);
  for (const e of r.events.filter(e => ids.includes(e.id))) replay(f,e);
  assert.ok(!r.comment || r.comment.split(/\s+/).length <= 24);
});
test('exact parent default, validated options and atomic budget at exact boundary', () => {
  for (const name of ['stone-d-completes','maroczy-recorded-exchange']) {
    const f=fixture(name),r=explainMove(f);
    assert.deepEqual(explainMove({...f,formationTags:false}),parent(f));
    assert.deepEqual(explainMove({...f,formationTags:undefined}),parent(f));
    assert.ok(events({...f,maxFormationNodes:r.formationAnalysis.nodes}).length);
    for (const limit of [0,r.formationAnalysis.nodes-1]) {
      const short=explainMove({...f,maxFormationNodes:limit});
      assert.equal(short.formationAnalysis.status,'exhausted');
      assert.deepEqual(short.events,parent(f).events); assert.equal(short.comment,parent(f).comment);
    }
  }
  for (const limit of [-1,50001,0.1,NaN]) assert.throws(() => explainMove({...fixture('stone-d-completes'),maxFormationNodes:limit}),/maxFormationNodes/);
  assert.throws(() => explainMove({...fixture('stone-d-completes'),formationTags:1}),/formationTags/);
});
test('each Stonewall completion, exact legal support edges and fixed-file negative', () => {
  for (const name of ['stone-d-completes','stone-c-completes','stone-e-completes','stone-f-double-completes','stone-capture-completes']) {
    const f=fixture(name), e=events(f)[0]; assert.equal(e.id,'stonewall-structure');
    assert.deepEqual(e.evidence.counterframes.map(r => r.captures.map(m => m.move).sort()),[['c3d4','e3d4'],['e3f4']]);
    assert.ok(explainMove(f).comment.startsWith('Stonewall structure:'));
    assert.equal(events(fixture(name+'-mirror')).length,0);
  }
  for(const name of ['stone-supporter-pinned','stone-e-supporter-pinned']) assert.equal(explainMove(fixture(name)).formationAnalysis.status,'no-legal-support-control');
});
test('Maroczy requires true original-pawn exchange, both orders and reversed-color wording', () => {
  const f=fixture('maroczy-recorded-exchange'),e=events(f)[0],reverse=events(reflect(f))[0];
  assert.equal(e.evidence.exchange.order,'enemy-c-takes-own-d');
  assert.equal(events(fixture('maroczy-own-d-captures'))[0].evidence.exchange.order,'own-d-takes-enemy-c');
  const ep=events(fixture('maroczy-original-exchange-en-passant'))[0];
  assert.equal(ep.evidence.exchange.capture.move,'d5c6'); assert.equal(ep.evidence.exchange.capture.captured,'p'); replay(fixture('maroczy-original-exchange-en-passant'),ep);
  assert.deepEqual(e.evidence.counterframes[0].captures.map(m => m.move).sort(),['c4d5','e4d5']);
  assert.ok(reverse.text.startsWith('Reversed Maroczy bind: c5 and e5 control d4'));
  assert.ok(explainMove(f).comment.startsWith('Maroczy bind:'));
  for (const name of ['maroczy-no-history','maroczy-wrong-root-d-pawn','maroczy-wrong-root-c-pawn','maroczy-delayed-recapture','maroczy-control-pinned','maroczy-extra-d-file-pawn','maroczy-extra-enemy-c-file-pawn']) assert.equal(events(fixture(name)).length,0);
});
test('all en-passant captures, promotions, pawn losses and terminal replies retained', () => {
  for (const [name,move,missing] of [['stone-en-passant-reply','e4f3','f4'],['maroczy-en-passant-reply','b4c3','c4']]) {
    const row=events(fixture(name))[0].evidence.replies.find(r => r.response.move===move);
    assert.ok(row); assert.equal(row.response.captured,'p'); assert.ok(!row.present.includes(missing));
  }
  for (const name of ['stone-terminal-promotion-replies','maroczy-terminal-promotion-replies']) {
    const f=fixture(name),e=events(f)[0],promos=e.evidence.replies.filter(r => r.response.from==='h2' && r.response.to==='h1');
    assert.deepEqual(promos.map(r => r.response.promotion).sort(),['b','n','q','r']);
    assert.ok(promos.some(r => r.checkmate && r.gameOver)); replay(f,e);
    assert.ok(!explainMove(f).comment.startsWith(e.id==='stonewall-structure'?'Stonewall':'Maroczy'));
  }
  for (const name of ['stone-capturable-pawn','maroczy-pawn-loss-reply']) assert.ok(events(fixture(name))[0].evidence.replies.some(r => r.present.length < events(fixture(name))[0].evidence.cells.length));
});
test('actual terminal refusal, full reversible history and pawn clock reset', () => {
  const f=fixture('stone-actual-stalemate'), c=new Chess(f.fen); c.move(f.move); assert.ok(c.isStalemate()); assert.equal(events(f).length,0);
  const h=fixture('stone-reversible-history'),e=events(h)[0]; assert.equal(e.evidence.history.length,6); replay(h,e);
  const clock=events(fixture('stone-pawn-clock-reset'))[0]; assert.equal(clock.evidence.played.after.split(' ')[4],'0');
  assert.ok(clock.evidence.replies.every(r => !r.draw));
});
test('independent replay rejects every forged structure, exchange, support set, reply, history and text', () => {
  for (const name of ['stone-d-completes','maroczy-recorded-exchange']) {
    const f=fixture(name),e=events(f)[0];
    for (const mutate of [x=>x.cells.pop(),x=>x.played.to='a4',x=>x.counterframes.pop(),x=>x.counterframes[0].captures.pop(),x=>x.counterframes[0].sources=[],x=>x.counterframes[0].counterFen=x.played.after,x=>x.replies.pop(),x=>x.replies[0].present=[],x=>x.replies[0].draw=!x.replies[0].draw]) {
      const changed=structuredClone(e);mutate(changed.evidence);assert.throws(()=>replay(f,changed));
    }
    assert.throws(()=>replay({...f,formationTags:false},e)); assert.throws(()=>replay(f,{...e,text:e.text+' Winning.'}));
    assert.throws(()=>replay(f,{...e,qualityClaim:true}));
  }
  const f=fixture('maroczy-recorded-exchange'),e=events(f)[0];
  for(const mutate of [x=>x.history.pop(),x=>x.exchange.firstPly++,x=>x.exchange.order='own-d-takes-enemy-c',x=>x.exchange.recapture.to='d5',x=>x.exchange=null]) {
    const altered=structuredClone(e);mutate(altered.evidence);assert.throws(()=>replay(f,altered));
  }
});

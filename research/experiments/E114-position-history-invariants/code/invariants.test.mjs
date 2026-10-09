import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './invariants.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E113-causal-slider-placement/code/placement.mjs';
for (const f of fixtures) test(f.id,() => {
  if (f.inputError) { assert.throws(() => explainMove(f),e => e.message === f.inputError); return; }
  const r = explainMove(f);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E114').map(e => e.id),f.expected);
  if (r.positionInvariantAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.positionInvariantAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const positionInvariantTags of [undefined,false]) {
    const i = {...fixtures[0],positionInvariantTags}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],positionInvariantTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPositionInvariantNodes:v}));
});
test('exact atomic budget and parent comments',() => {
  const f = fixtures[0],r = explainMove(f),n = r.positionInvariantAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxPositionInvariantNodes:n}).positionInvariantAnalysis.witness,r.positionInvariantAnalysis.witness);
  const i = {...f,maxPositionInvariantNodes:n-1},low = explainMove(i);
  assert.equal(low.positionInvariantAnalysis.status,'exhausted'); assert.equal(low.positionInvariantAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal moves',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['e3e4']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'e3e2'}));
});
for (const [name,mutate] of Object.entries({
  actor:w => w.actor = 'b',inventory:w => w.afterInventory.pop(),
  rank:w => w.pawn.afterRank = 1,hole:w => w.holes.pop(),
  requiredRank:w => w.holes[0].requiredPawnRank = 1,
  pawnList:w => w.holes[0].pawns.pop(),reply:w => w.replies.pop(),
  replyCount:w => w.replies[0].units++,replyFen:w => w.replies[0].fen = w.after,
  history:w => w.history = {fen:w.before,moves:[]},
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(explainMove(f))); mutate(r.positionInvariantAnalysis.witness);
  assert.throws(() => checkWitness(r.positionInvariantAnalysis.witness,r,f));
});
test('reject uncastled assertion without standard history',() => {
  const f = fixtures.find(f => f.id === 'standard-white'),r = explainMove(f);
  r.positionInvariantAnalysis.witness.standard = false;
  assert.throws(() => checkWitness(r.positionInvariantAnalysis.witness,r,f));
});
test('reject asymmetry and rights mutations',() => {
  for (const [id,mutate] of [
    ['standard-white',w => w.afterUnmatched = []],
    ['lost-rights',w => w.lostRights = []],
    ['en-passant',w => w.capturedSquare = 'd6'],
    ['already-castled',w => w.castles = []],
  ]) {
    const f = fixtures.find(f => f.id === id),r = explainMove(f); mutate(r.positionInvariantAnalysis.witness);
    assert.throws(() => checkWitness(r.positionInvariantAnalysis.witness,r,f));
  }
});
test('no strategic relabeling',() => {
  const f = fixtures[0],r = explainMove(f); r.events.find(e => e.evidence?.experiment === 'E114').text = 'This is a permanent strategic weakness';
  assert.throws(() => checkWitness(r.positionInvariantAnalysis.witness,r,f));
});

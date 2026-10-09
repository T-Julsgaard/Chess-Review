import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './storm.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E118-causal-attack-entry/code/entry.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E119').map(e => e.id),f.expected);
  if (r.pieceStormAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.pieceStormAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const pieceStormTags of [undefined,false]) { const i = {...fixtures[0],pieceStormTags,maxPieceStormNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],pieceStormTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPieceStormNodes:v}));
  for (const v of [false,null,1]) assert.throws(() => explainMove({...fixtures[0],attackEntryTags:v}),/requires/);
});
test('exact atomic budget and parent findings retained',() => {
  const f = fixtures[0],r = get(f),n = r.pieceStormAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxPieceStormNodes:n}).pieceStormAnalysis.witness,r.pieceStormAnalysis.witness);
  const i = {...f,maxPieceStormNodes:n-1},low = explainMove(i),p = parent({...i,attackEntryTags:true});
  assert.equal(low.pieceStormAnalysis.status,'exhausted'); assert.equal(low.pieceStormAnalysis.witness,null);
  assert.deepEqual(low.events,p.events); assert.equal(low.comment,p.comment); assert.equal(low.attackEntryAnalysis.status,'proven');
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['h1g1']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'b3b2q'}));
});
test('missing and inappropriate history statuses',() => {
  for (const id of ['missing-history','empty-history']) assert.equal(get(fixtures.find(f => f.id === id)).pieceStormAnalysis.status,'history-unavailable');
  for (const id of ['capture-arrival','king-history','pawn-history','same-queen-arrives-twice']) assert.equal(get(fixtures.find(f => f.id === id)).pieceStormAnalysis.status,'no-recorded-arrivals');
  for (const id of ['parent-exhausted','parent-short-bound','extra-knight-refutes-mate']) assert.equal(get(fixtures.find(f => f.id === id)).pieceStormAnalysis.status,'no-joint-entry');
});
for (const [name,mutate] of Object.entries({
  first:w => w.first.from = 'g4',reply:w => w.reply.move = 'b7b5',history:w => w.history.moves.pop(),
  army:w => w.inventory.pop(),oldLocal:w => w.oldLocal.pop(),local:w => w.newLocal.pop(),
  count:w => w.counts.afterOwn++,king:w => w.king = 'g8',frame:w => w.restored.fen = w.after,
  proof:w => w.removed.proof.tree.win = true,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.pieceStormAnalysis.witness);
  assert.throws(() => checkWitness(r.pieceStormAnalysis.witness,r,f));
});

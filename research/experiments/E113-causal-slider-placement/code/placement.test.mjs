import test from 'node:test';
import assert from 'node:assert/strict';
import {explainMove} from './placement.mjs';
import {explainMove as parent} from '../../E112-pawn-tempi-tension/code/tempi.mjs';
import {checkWitness} from './check-witness.mjs';
import {fixtures} from './fixtures.mjs';
for (const f of fixtures) test(f.id,() => {
  const r = explainMove(f);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E113').map(e => e.id),f.expected);
  if (r.sliderPlacementAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.sliderPlacementAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const sliderPlacementTags of [undefined,false]) {
    const i = {...fixtures[0],sliderPlacementTags}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],sliderPlacementTags:v}));
  for (const v of [-1,5,1.5,null]) assert.throws(() => explainMove({...fixtures[0],sliderPlacementPlies:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxSliderPlacementNodes:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = explainMove(f),n = r.sliderPlacementAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxSliderPlacementNodes:n}).sliderPlacementAnalysis.witness,r.sliderPlacementAnalysis.witness);
  const i = {...f,maxSliderPlacementNodes:n-1},low = explainMove(i);
  assert.equal(low.sliderPlacementAnalysis.status,'exhausted'); assert.equal(low.sliderPlacementAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and terminal continuation',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['f3f4']}}),/history/i);
  const r = explainMove(fixtures[0]); assert.throws(() => explainMove({...fixtures[0],fen:r.after,move:'h8g8'}));
});
for (const [name,mutate] of Object.entries({
  actor:w => w.actor = 'b',rank:w => w.rank = 1,inventory:w => w.inventory.pop(),
  played:w => w.played.from = 'a1',restoration:w => w.restored.fen = w.after,
  winner:w => w.actual.winner = 'b',depth:w => w.actual.plies = 1,
  fresh:w => w.freshActual.tree.win = false,restored:w => w.restored.proof.tree.win = true,
  history:w => w.history = {fen:w.before,moves:[]},
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(explainMove(f))); mutate(r.sliderPlacementAnalysis.witness);
  assert.throws(() => checkWitness(r.sliderPlacementAnalysis.witness,r,f));
});
test('reject incomplete legal defense proof and changed labels',() => {
  const f = fixtures.find(f => f.id === 'nonterminal-rook');
  for (const mutate of [r => r.sliderPlacementAnalysis.witness.actual.tree.branches.pop(),
    r => r.events.find(e => e.evidence?.experiment === 'E113').text = 'Best strategic rook lift']) {
    const r = explainMove(f); mutate(r); assert.throws(() => checkWitness(r.sliderPlacementAnalysis.witness,r,f));
  }
});
test('castling rights not admitted',() => {
  const r = explainMove({fen:'4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1',move:'a1a3',sliderPlacementTags:true,scanReplies:false});
  assert.equal(r.sliderPlacementAnalysis.status,'not-applicable');
});

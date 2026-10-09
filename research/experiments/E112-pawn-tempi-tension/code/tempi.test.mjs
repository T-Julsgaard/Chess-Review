import test from 'node:test';
import assert from 'node:assert/strict';
import {explainMove} from './tempi.mjs';
import {explainMove as parent} from '../../E111-pawn-chain-mating-constraints/code/constraints.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
for (const f of fixtures) test(f.id,() => {
  const r = explainMove(f);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E112').map(e => e.id),f.expected);
  if (r.pawnTempoAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.pawnTempoAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const pawnTempoTags of [undefined,false]) {
    const i = {...fixtures[0],pawnTempoTags}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],pawnTempoTags:v}));
  for (const v of [-1,7,1.5,null]) assert.throws(() => explainMove({...fixtures[0],pawnTempoPlies:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPawnTempoNodes:v}));
});
test('exact atomic budget boundary',() => {
  const i = fixtures[0],r = explainMove(i),n = r.pawnTempoAnalysis.nodes;
  assert.deepEqual(explainMove({...i,maxPawnTempoNodes:n}).pawnTempoAnalysis.witness,r.pawnTempoAnalysis.witness);
  const low = {...i,maxPawnTempoNodes:n-1},out = explainMove(low);
  assert.equal(out.pawnTempoAnalysis.status,'exhausted'); assert.equal(out.pawnTempoAnalysis.witness,null);
  assert.deepEqual(out.events,parent(low).events); assert.equal(out.comment,parent(low).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a2a3']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'a2a5'}));
});
const mutations = {
  actor:w => w.actor = 'b', root:w => w.rootMoves.pop(), pawn:w => w.pawns.reverse(),
  baseline:w => w.trials[1].actual.baselineFen = w.after,
  pass:w => w.trials[1].pass.fen = w.before,
  removed:w => w.trials[1].strippedActual.baselineFen = w.before,
  king:w => w.trials[1].kings.pop(), selected:w => w.selected.spare = null,
  omittedTrial:w => w.trials.shift(), win:w => w.trials[1].actual.win = false,
  proof:w => w.trials[1].actual.tree.moves.pop(),
};
for (const [name,mutate] of Object.entries(mutations)) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(explainMove(f)));
  mutate(r.pawnTempoAnalysis.witness); assert.throws(() => checkWitness(r.pawnTempoAnalysis.witness,r,f));
});
test('reject omitted exchange and relabeling',() => {
  const f = fixtures.find(f => f.id === 'tension');
  for (const mutate of [r => r.pawnTempoAnalysis.witness.trials[1].exchanges.pop(),
    r => r.pawnTempoAnalysis.witness.preservedPairs = [],
    r => r.events.find(e => e.evidence?.experiment === 'E112').text = 'The best strategic move']) {
    const r = explainMove(f); mutate(r); assert.throws(() => checkWitness(r.pawnTempoAnalysis.witness,r,f));
  }
});

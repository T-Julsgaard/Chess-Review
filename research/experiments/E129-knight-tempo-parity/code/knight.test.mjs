import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './knight.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E128-locked-structure-guards/code/structure.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E129').map(e => e.id),f.expected); if (r.knightTempoAnalysis.witness) checkWitness(r.knightTempoAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const knightTempoTags of [undefined,false]) { const i = {...fixtures[0],knightTempoTags,maxKnightTempoNodes:null,knightTempoMoves:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],knightTempoTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxKnightTempoNodes:v}));
  for (const v of [0,1,2,4,10,3.5,null]) assert.throws(() => explainMove({...fixtures[0],knightTempoMoves:v}));
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].history.fen,moves:['g1f3']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'h4h5'}));
});
test('exact atomic budget retains parent',() => {
  const f = fixtures[0],r = get(f),n = r.knightTempoAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxKnightTempoNodes:n}).knightTempoAnalysis.witness,r.knightTempoAnalysis.witness);
  const i = {...f,maxKnightTempoNodes:n-1},low = explainMove(i); assert.equal(low.knightTempoAnalysis.status,'exhausted'); assert.equal(low.knightTempoAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('global graph and collective identity-safe parity',() => {
  const w = get(fixtures[0]).knightTempoAnalysis.witness; assert.equal(w.graph.edges,336); assert.equal(w.graph.dark,32); assert.equal(w.graph.light,32); assert.equal(w.initial.parity,1-w.final.parity);
  const multiple = get(fixtures.find(f => f.id === 'multiple-knights')).knightTempoAnalysis.witness;
  assert.equal(multiple.segment[0].from,multiple.segment.at(-1).to); assert.deepEqual(multiple.initial.squares,['b1','g1']); assert.deepEqual(multiple.final.squares,['b1','f3']);
});
test('extra exhaustion retains enabled parent fixation',() => {
  const f = {fen:boardFen({a5:'K',a3:'k',d3:'P',d5:'p'}),move:'d3d4',scanReplies:false,lockedStructureTags:true,knightTempoTags:true,maxKnightTempoNodes:0},r = explainMove(f);
  assert.equal(r.knightTempoAnalysis.status,'exhausted'); assert.equal(r.lockedStructureAnalysis.status,'proven'); assert.deepEqual(r.events,parent(f).events);
});
for (const [name,mutate] of Object.entries({
  edges:w => w.graph.rows[0].destinations.pop(),color:w => w.graph.rows[0].color = 1,count:w => w.graph.edges++,
  segment:w => w.segment.pop(),window:w => w.segmentIndex++,history:w => w.history.moves.pop(),
  enemy:w => w.enemyAfter[0].square = 'h7',fixed:w => w.fixedAfter.pop(),initial:w => w.initial.dark++,
  final:w => w.final.parity = w.initial.parity,transition:w => w.transitions[0].after.parity = w.transitions[0].before.parity,
  counters:w => w.state.after[3] = '0',
})) test('reject '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r.knightTempoAnalysis.witness); assert.throws(() => checkWitness(r.knightTempoAnalysis.witness,r,f)); });

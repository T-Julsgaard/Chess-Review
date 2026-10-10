import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './endings.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E124-both-wing-capture-policy/code/wings.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E125').map(e => e.id),f.expected);
  if (r.endingEvidenceAnalysis.witness) checkWitness(r.endingEvidenceAnalysis.witness,r,f);
});
test('disabled exact parent',() => {
  for (const endingEvidenceTags of [undefined,false]) { const i = {...fixtures[0],endingEvidenceTags,endingPlies:null,maxEndingEvidenceNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],endingEvidenceTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxEndingEvidenceNodes:v}));
  for (const v of [-1,7,1.5,null]) assert.throws(() => explainMove({...fixtures[0],endingPlies:v}));
  assert.throws(() => explainMove({...fixtures[0],bothWingTags:false}));
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['b1c3']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'f1f2'}));
});
test('exact atomic budget preserves parent',() => {
  const f = fixtures.find(f => f.id === 'tempo'),r = get(f),n = r.endingEvidenceAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxEndingEvidenceNodes:n}).endingEvidenceAnalysis.witness,r.endingEvidenceAnalysis.witness);
  const i = {...f,maxEndingEvidenceNodes:n-1},low = explainMove(i); assert.equal(low.endingEvidenceAnalysis.status,'exhausted'); assert.equal(low.endingEvidenceAnalysis.witness,null);
  assert.deepEqual(low.events,parent({...i,bothWingTags:true}).events);
  const fork = get(fixtures[0]); assert.deepEqual(fork.endingEvidenceAnalysis.witness.fork.targets,['c4','g4']);
});
test('minimal tempo has successful and shorter failing full proof',() => {
  const v = get(fixtures.find(f => f.id === 'tempo')).endingEvidenceAnalysis.witness.conversion;
  assert.equal(v.minimum,2); assert.deepEqual(v.queries.map(q => [q.plies,q.win]),[[4,true],[2,true],[1,false]]);
});
for (const [name,mutate] of Object.entries({
  targets:r => r.endingEvidenceAnalysis.witness.fork.targets.pop(),
  selection:r => r.endingEvidenceAnalysis.witness.fork.selections[0] = -1,
  source:r => r.bothWingAnalysis.witness.actual.branches.pop(),
})) test('reject fork '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r); assert.throws(() => checkWitness(r.endingEvidenceAnalysis.witness,r,f)); });
for (const [name,mutate] of Object.entries({
  minimum:v => v.minimum++,queries:v => v.queries.pop(),order:v => v.queries.reverse(),baseline:v => v.queries[0].baselineFen = v.queries[0].rootFen,
  tree:v => v.queries[0].tree.win = false,
})) test('reject tempo '+name,() => { const f = fixtures.find(f => f.id === 'tempo'),r = structuredClone(get(f)); mutate(r.endingEvidenceAnalysis.witness.conversion); assert.throws(() => checkWitness(r.endingEvidenceAnalysis.witness,r,f)); });

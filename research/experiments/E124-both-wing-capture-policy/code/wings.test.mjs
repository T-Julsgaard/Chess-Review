import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './wings.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E123-temporary-vulnerability/code/temporary.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E124').map(e => e.id),f.expected);
  if (r.bothWingAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.bothWingAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const bothWingTags of [undefined,false]) { const i = {...fixtures[0],bothWingTags,maxBothWingNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],bothWingTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxBothWingNodes:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = get(f),n = r.bothWingAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxBothWingNodes:n}).bothWingAnalysis.witness,r.bothWingAnalysis.witness);
  const i = {...f,maxBothWingNodes:n-1},low = explainMove(i); assert.equal(low.bothWingAnalysis.status,'exhausted'); assert.equal(low.bothWingAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['b1c3']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'f1f2'}));
});
test('wing necessity and root-relative losses',() => {
  const same = get(fixtures.find(f => f.id === 'same-wing-targets')).bothWingAnalysis.witness.actual;
  assert.equal(same.coverage,true); assert.equal(same.kingsideOnly,null);
  const loss = get(fixtures.find(f => f.id === 'root-material-loss')).bothWingAnalysis.witness.actual.branches.at(-1);
  assert.equal(loss.offset,-5); assert.ok(loss.captures.some(t => t.proof && t.net <= 0)); assert.deepEqual(loss.wings,[]);
  const old = get(fixtures.find(f => f.id === 'old-pressure')).bothWingAnalysis.witness;
  assert.equal(old.actual.coverage,true); assert.equal(old.restored.policy.coverage,true);
});
for (const [name,mutate] of Object.entries({
  inventory:w => w.inventory.pop(),baseline:w => w.baseline++,defenses:w => w.actual.moves.pop(),branches:w => w.actual.branches.pop(),
  captures:w => w.actual.branches[0].captures.pop(),offset:w => w.actual.branches[0].offset++,
  certificate:w => w.actual.branches[0].captures[0].proof.minimumGain++,
  queen:w => w.actual.queensideOnly = null,king:w => w.actual.kingsideOnly = null,
  frame:w => w.restored.fen = w.after,restored:w => w.restored.policy.branches.pop(),
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.bothWingAnalysis.witness); assert.throws(() => checkWitness(r.bothWingAnalysis.witness,r,f));
});

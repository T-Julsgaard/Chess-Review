import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './holes.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E121-pawn-risk-comparisons/code/risk.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E122').map(e => e.id),f.expected);
  if (r.forcedPawnAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.forcedPawnAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const forcedPawnTags of [undefined,false]) { const i = {...fixtures[0],forcedPawnTags,maxForcedPawnNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],forcedPawnTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxForcedPawnNodes:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = get(f),n = r.forcedPawnAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxForcedPawnNodes:n}).forcedPawnAnalysis.witness,r.forcedPawnAnalysis.witness);
  const i = {...f,maxForcedPawnNodes:n-1},low = explainMove(i); assert.equal(low.forcedPawnAnalysis.status,'exhausted'); assert.equal(low.forcedPawnAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a8b8']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'f5f4'}));
});
for (const [name,mutate] of Object.entries({
  army:w => w.inventory.pop(),replies:w => w.replies.pop(),restored:w => w.restored.moves.pop(),
  frame:w => w.restored.fen = w.after,forced:w => w.forced = false,targets:w => w.targets.pop(),
  trials:w => w.trials.shift(),pawn:w => w.trials.at(-1).branches[0].pawns.pop(),
  permanent:w => w.trials.at(-1).branches[0].permanent = false,
  responses:w => w.trials.at(-1).branches[0].responses.pop(),selected:w => w.selected = null,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.forcedPawnAnalysis.witness); assert.throws(() => checkWitness(r.forcedPawnAnalysis.witness,r,f));
});

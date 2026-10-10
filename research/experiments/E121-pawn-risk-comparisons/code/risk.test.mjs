import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './risk.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E120-mating-move-order/code/order.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E121').map(e => e.id),f.expected);
  if (r.pawnRiskAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.pawnRiskAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const pawnRiskTags of [undefined,false]) { const i = {...fixtures[0],pawnRiskTags,maxPawnRiskNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],pawnRiskTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPawnRiskNodes:v}));
  for (const v of [false,null,1]) assert.throws(() => explainMove({...fixtures[0],defenseChoiceTags:v}),/requires/);
});
test('exact atomic budget and parent findings retained',() => {
  const f = fixtures[0],r = get(f),n = r.pawnRiskAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxPawnRiskNodes:n}).pawnRiskAnalysis.witness,r.pawnRiskAnalysis.witness);
  const i = {...f,maxPawnRiskNodes:n-1},low = explainMove(i),p = parent({...i,defenseChoiceTags:true});
  assert.equal(low.pawnRiskAnalysis.status,'exhausted'); assert.equal(low.pawnRiskAnalysis.witness,null);
  assert.deepEqual(low.events,p.events); assert.equal(low.comment,p.comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['f1e1']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'g2g1q'}));
});
for (const [name,mutate] of Object.entries({
  actual:w => w.actualIndex++,alternative:w => w.alternativeIndex++,rank:w => w.rank++,
  flag:w => w.advanced = false,fresh:w => w.fresh.tree.win = false,
  frame:w => w.restored.fen = w.after,proof:w => w.restored.proof.tree.win = true,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.pawnRiskAnalysis.witness); assert.throws(() => checkWitness(r.pawnRiskAnalysis.witness,r,f));
});

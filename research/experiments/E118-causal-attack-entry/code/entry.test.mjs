import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './entry.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E117-pawn-defense-policies/code/defense.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E118').map(e => e.id),f.expected);
  if (r.attackEntryAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.attackEntryAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const attackEntryTags of [undefined,false]) {
    const i = {...fixtures[0],attackEntryTags,attackEntryPlies:null,maxAttackEntryNodes:null}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],attackEntryTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxAttackEntryNodes:v}));
  for (const v of [-1,5,1.5,null]) assert.throws(() => explainMove({...fixtures[0],attackEntryPlies:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = get(f),n = r.attackEntryAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxAttackEntryNodes:n}).attackEntryAnalysis.witness,r.attackEntryAnalysis.witness);
  const i = {...f,maxAttackEntryNodes:n-1},low = explainMove(i);
  assert.equal(low.attackEntryAnalysis.status,'exhausted'); assert.equal(low.attackEntryAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['h1g1']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'b3b2q'}));
});
for (const [name,mutate] of Object.entries({
  army:w => w.inventory.pop(),partner:w => w.partners.pop(),king:w => w.king = 'a8',
  contacts:w => w.contacts.pop(),actual:w => w.actual.tree.branches.pop(),fresh:w => w.fresh = null,
  restore:w => w.restored.fen = w.after,remove:w => w.removed.legal = false,
  mate:w => w.removed.proof.tree.win = true,source:w => w.before = w.after,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.attackEntryAnalysis.witness);
  assert.throws(() => checkWitness(r.attackEntryAnalysis.witness,r,f));
});

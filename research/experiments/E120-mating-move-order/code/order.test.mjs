import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './order.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E119-recorded-piece-storm/code/storm.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E120').map(e => e.id),f.expected);
  if (r.moveOrderAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.moveOrderAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const moveOrderTags of [undefined,false]) { const i = {...fixtures[0],moveOrderTags,orderFollowup:null,maxMoveOrderNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],moveOrderTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxMoveOrderNodes:v}));
  for (const v of [-1,3,1.5,null]) assert.throws(() => explainMove({...fixtures[0],orderTailPlies:v}));
  for (const v of [undefined,null,'Bg6','h5g9',1]) assert.throws(() => explainMove({...fixtures[0],orderFollowup:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = get(f),n = r.moveOrderAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxMoveOrderNodes:n}).moveOrderAnalysis.witness,r.moveOrderAnalysis.witness);
  const i = {...f,maxMoveOrderNodes:n-1},low = explainMove(i); assert.equal(low.moveOrderAnalysis.status,'exhausted'); assert.equal(low.moveOrderAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a1a2']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'a1a2q'}));
});
for (const [name,mutate] of Object.entries({
  army:w => w.inventory.pop(),roots:w => w.rootMoves.pop(),defenses:w => w.replies.pop(),branch:w => w.branches.pop(),
  post:w => w.branches[0].post = w.after,proof:w => w.branches[0].proof.tree.win = false,
  reverse:w => w.reverse.proof.tree.win = true,fen:w => w.reverse.fen = w.after,check:w => w.check = false,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.moveOrderAnalysis.witness); assert.throws(() => checkWitness(r.moveOrderAnalysis.witness,r,f));
});

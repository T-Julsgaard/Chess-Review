import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './center.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E115-opening-mate-offers/code/offers.mjs';
const saved = new Map(),get = f => {
  if (!saved.has(f.id)) saved.set(f.id,explainMove(f));
  return saved.get(f.id);
};
for (const f of fixtures) test(f.id,() => {
  const r = get(f);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E116').map(e => e.id),f.expected);
  if (r.centerRestraintAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.centerRestraintAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const centerRestraintTags of [undefined,false]) {
    const i = {...fixtures[0],centerRestraintTags}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],centerRestraintTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxCenterRestraintNodes:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = get(f),n = r.centerRestraintAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxCenterRestraintNodes:n}).centerRestraintAnalysis.witness,r.centerRestraintAnalysis.witness);
  const i = {...f,maxCenterRestraintNodes:n-1},low = explainMove(i);
  assert.equal(low.centerRestraintAnalysis.status,'exhausted'); assert.equal(low.centerRestraintAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['e3e4']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'e3e2'}));
});
for (const [name,mutate] of Object.entries({
  root:w => w.rootMoves.pop(),inventory:w => w.inventory.pop(),target:w => w.restraint.target = 'd5',
  frame:w => w.restraint.removed.fen = w.after,released:w => w.restraint.released = [],
  reply:w => w.restraint.rows.pop(),retained:w => w.restraint.rows[0].retained = false,
  bishop:w => w.restraint.bishops[0].branches.pop(),material:w => w.restraint.bishops[0].branches[0].proof.minimumGain++,
  entrant:w => w.entries.pop(),entryReply:w => w.entries.at(-1).branches.pop(),
  entryResponses:w => w.entries.at(-1).branches[0].responses.pop(),selected:w => w.selectedEntry = null,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.centerRestraintAnalysis.witness);
  assert.throws(() => checkWitness(r.centerRestraintAnalysis.witness,r,f));
});
test('reject central control and fluid-profile changes',() => {
  for (const [id,mutate] of [
    ['central-knight',w => w.control.denied = []],
    ['central-knight',w => w.control.restored.moves.pop()],
    ['fluid',w => w.fluid[0].profile.pop()],
    ['fluid',w => w.selectedFluid = null],
  ]) {
    const f = fixtures.find(f => f.id === id),r = JSON.parse(JSON.stringify(get(f))); mutate(r.centerRestraintAnalysis.witness);
    assert.throws(() => checkWitness(r.centerRestraintAnalysis.witness,r,f));
  }
});
test('reject strategic relabeling',() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); r.events.find(e => e.evidence?.experiment === 'E116').text = 'Permanently weak pawn and winning entry';
  assert.throws(() => checkWitness(r.centerRestraintAnalysis.witness,r,f));
});
test('illegal controls and duplicate-profile choices',() => {
  const bad = get(fixtures.find(f => f.id === 'illegal-control-frame')).centerRestraintAnalysis.witness;
  assert.equal(bad.control.removed.legal,false); assert.equal(bad.control.restored.legal,false); assert.deepEqual(bad.control.denied,[]);
  const f = fixtures.find(f => f.id === 'fluid-duplicate-profiles'),r = get(f),w = r.centerRestraintAnalysis.witness;
  assert.deepEqual(w.fluid[0].profile,w.fluid[1].profile); assert.deepEqual(w.selectedFluid,[0,2]);
});

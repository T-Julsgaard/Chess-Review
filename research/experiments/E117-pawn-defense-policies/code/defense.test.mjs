import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './defense.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E116-center-restraint-entry/code/center.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => {
  const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E117').map(e => e.id),f.expected);
  if (r.pawnDefenseAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.pawnDefenseAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const pawnDefenseTags of [undefined,false]) {
    const i = {...fixtures[0],pawnDefenseTags,pawnCoverPlies:null,maxPawnDefenseNodes:null}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],pawnDefenseTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPawnDefenseNodes:v}));
  for (const v of [-1,5,1.5,null]) assert.throws(() => explainMove({...fixtures[0],pawnCoverPlies:v}));
});
test('exact atomic budget boundary',() => {
  for (const id of ['weak-fixed-pawn','cover-removal-mate']) {
    const f = fixtures.find(f => f.id === id),r = get(f),n = r.pawnDefenseAnalysis.nodes;
    assert.deepEqual(explainMove({...f,maxPawnDefenseNodes:n}).pawnDefenseAnalysis.witness,r.pawnDefenseAnalysis.witness);
    const i = {...f,maxPawnDefenseNodes:n-1},low = explainMove(i);
    assert.equal(low.pawnDefenseAnalysis.status,'exhausted'); assert.equal(low.pawnDefenseAnalysis.witness,null);
    assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
  }
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['e3e4']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'e3e2'}));
});
test('failed pawn prefix and varying capture choices retained',() => {
  const f = fixtures.find(f => f.id === 'failed-pawn-before-success'),r = get(f);
  assert.equal(r.pawnDefenseAnalysis.witness.selectedPawn,1);
  const changed = JSON.parse(JSON.stringify(r)); changed.pawnDefenseAnalysis.witness.pawns.shift();
  assert.throws(() => checkWitness(changed.pawnDefenseAnalysis.witness,changed,f));
  const varying = get(fixtures.find(f => f.id === 'varying-capturers-unrelated-loss')).pawnDefenseAnalysis.witness;
  const captures = new Set(varying.pawns.flatMap(p => p.branches.flatMap(b => b.trials.filter(t => t.proof).map(t => t.move))));
  assert.ok(captures.has('c4e5') && captures.has('c6e5')); assert.equal(varying.selectedPawn,null);
});
for (const [name,mutate] of Object.entries({
  root:w => w.rootMoves.pop(),inventory:w => w.inventory.pop(),pawn:w => w.pawns[0].square = 'd5',
  defenses:w => w.pawns[0].branches.pop(),captures:w => w.pawns[0].branches[0].captures.pop(),
  proof:w => w.pawns[0].branches[0].trials[0].proof.minimumGain++,
  retained:w => w.pawns[0].branches[0].retained = false,selected:w => w.selectedPawn = null,
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(get(f))); mutate(r.pawnDefenseAnalysis.witness);
  assert.throws(() => checkWitness(r.pawnDefenseAnalysis.witness,r,f));
});
for (const [name,mutate] of Object.entries({
  members:w => w.cover.members.pop(),frame:w => w.cover.removed.fen = w.after,
  mate:w => w.cover.removed.proof.tree.win = false,actual:w => w.cover.actual.winner = w.actor,
  missingFresh:w => w.cover.fresh = null,
})) test('reject cover '+name,() => {
  const f = fixtures.find(f => f.id === 'cover-removal-mate'),r = JSON.parse(JSON.stringify(get(f))); mutate(r.pawnDefenseAnalysis.witness);
  assert.throws(() => checkWitness(r.pawnDefenseAnalysis.witness,r,f));
});

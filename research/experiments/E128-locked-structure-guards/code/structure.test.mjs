import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './structure.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E127-locked-pawn-correspondence/code/correspondence.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E128').map(e => e.id),f.expected); if (r.lockedStructureAnalysis.witness) checkWitness(r.lockedStructureAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const lockedStructureTags of [undefined,false]) { const i = {...fixtures[0],lockedStructureTags,maxLockedStructureNodes:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],lockedStructureTags:v}));
  for (const v of [-1,500001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxLockedStructureNodes:v}));
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a5b5']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'d3e4'}));
});
test('exact atomic budgets preserve parent',() => {
  for (const f of [fixtures[0],fixtures.find(f => f.id === 'unique-guard')]) { const r = get(f),n = r.lockedStructureAnalysis.nodes;
    assert.deepEqual(explainMove({...f,maxLockedStructureNodes:n}).lockedStructureAnalysis.witness,r.lockedStructureAnalysis.witness);
    const i = {...f,maxLockedStructureNodes:n-1},low = explainMove(i); assert.equal(low.lockedStructureAnalysis.status,'exhausted'); assert.equal(low.lockedStructureAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
  }
});
test('fixation needs safe escape and static weakness needs opposite turn',() => {
  const w = get(fixtures[0]).lockedStructureAnalysis.witness; assert.equal(w.actual.rank,6); assert.equal(w.escape.move,'d5d4'); assert.equal(w.escape.result.rank,-1); assert.equal(w.opposite.result.rank,5);
  const partial = get(fixtures.find(f => f.id === 'turn-dependent-fixation')).lockedStructureAnalysis.witness; assert.equal(partial.actual.rank,8); assert.equal(partial.opposite.result.rank,-1);
  const unsafe = get(fixtures.find(f => f.id === 'escape-unsafe')).lockedStructureAnalysis.witness; assert.equal(unsafe.escape.result.outcome,'losing'); assert.equal(unsafe.opposite,null);
});
test('clock exact boundary and irreversible reset',() => {
  assert.equal(get(fixtures.find(f => f.id === 'clock-boundary-guard')).lockedStructureAnalysis.status,'proven');
  const low = get(fixtures.find(f => f.id === 'insufficient-clock')).lockedStructureAnalysis.witness; assert.ok(low.alternatives.some(a => a.result.outcome === 'unknown'));
  assert.equal(get(fixtures.find(f => f.id === 'irreversible-history-reset')).lockedStructureAnalysis.status,'proven');
  assert.equal(get(fixtures.find(f => f.id === 'guard-history-unavailable')).lockedStructureAnalysis.status,'no-new-fact');
});
test('capturing alternative refutes unique quiet guard',() => {
  const f = {...fixtures[0],fen:boardFen({c5:'K',h8:'k',d4:'P',d5:'p'}),move:'c5b5'},r = explainMove(f),w = r.lockedStructureAnalysis.witness;
  assert.ok(w.alternatives.some(a => a.move === 'c5d5' && a.captured === 'p' && a.result.outcome === 'safe')); assert.equal(w.unique,null); checkWitness(w,r,f);
  const actual = explainMove({...f,move:'c5d5'}); assert.equal(actual.lockedStructureAnalysis.status,'not-quiet');
});
test('extra exhaustion retains enabled parent response system',() => {
  const f = fixtures.find(f => f.id === 'inherited-correspondence'),r = get(f); assert.equal(r.correspondenceAnalysis.status,'proven'); assert.equal(r.lockedStructureAnalysis.status,'exhausted'); assert.deepEqual(r.events,parent(f).events);
});
for (const [name,mutate] of Object.entries({
  rank:w => w.actual.rank++,defender:w => w.graph.defender = 'w',certificate:w => w.graph.ranks[w.actual.id] = -1,
  escapeFrame:w => w.escape.fen = w.after,escapeMoves:w => w.escape.moves.pop(),escapeMove:w => w.escape.move = 'd5d6',
  escapeCertificate:w => w.escape.graph.ranks[w.escape.result.id] = 1,escapeOutcome:w => w.escape.result.outcome = 'losing',
  opposite:w => w.opposite.fen = w.after,oppositeRank:w => w.opposite.result.rank++,
})) test('reject fixation '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r.lockedStructureAnalysis.witness); assert.throws(() => checkWitness(r.lockedStructureAnalysis.witness,r,f)); });
for (const [name,mutate] of Object.entries({
  inventory:w => w.moves.pop(),alternatives:w => w.alternatives.pop(),outcome:w => w.alternatives[1].result.outcome = 'safe',unique:w => w.unique = null,
})) test('reject guard '+name,() => { const f = fixtures.find(f => f.id === 'unique-guard'),r = structuredClone(get(f)); mutate(r.lockedStructureAnalysis.witness); assert.throws(() => checkWitness(r.lockedStructureAnalysis.witness,r,f)); });

import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './tempo.mjs';
import {checkWitness} from './check-witness.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent} from '../../E125-finite-ending-evidence/code/endings.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E126').map(e => e.id),f.expected); if (r.reserveTempoAnalysis.witness) checkWitness(r.reserveTempoAnalysis.witness,r,f); });
test('disabled exact parent',() => {
  for (const reserveTempoTags of [undefined,false]) { const i = {...fixtures[0],reserveTempoTags,maxReserveTempoNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],reserveTempoTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxReserveTempoNodes:v}));
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a2a3']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'a2b3'}));
});
test('exact atomic budget preserves parent',() => {
  for (const f of [fixtures[0],fixtures.find(f => f.id === 'trebuchet-entry')]) {
    const r = get(f),n = r.reserveTempoAnalysis.nodes; assert.deepEqual(explainMove({...f,maxReserveTempoNodes:n}).reserveTempoAnalysis.witness,r.reserveTempoAnalysis.witness);
    const i = {...f,maxReserveTempoNodes:n-1},low = explainMove(i); assert.equal(low.reserveTempoAnalysis.status,'exhausted'); assert.equal(low.reserveTempoAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
  }
});
test('all opponent moves include spare pawn counterplay',() => {
  const w = get(fixtures.find(f => f.id === 'enemy-reserve')).reserveTempoAnalysis.witness;
  assert.equal(w.actual.success,false); assert.ok(w.actual.legalMoves.includes('h7h6')); assert.equal(w.actual.rows.at(-1).success,false); assert.equal(w.kingAlternatives,null);
});
test('extra exhaustion retains enabled parent conversion',() => {
  const f = fixtures.find(f => f.id === 'inherited-conversion'),r = get(f);
  assert.equal(r.reserveTempoAnalysis.status,'exhausted'); assert.equal(r.endingEvidenceAnalysis.status,'proven'); assert.deepEqual(r.events,parent(f).events);
});
test('reserve double advance admits recapture and root-relative loss',() => {
  const w = get(fixtures.find(f => f.id === 'reserve-double')).reserveTempoAnalysis.witness;
  assert.equal(w.actual.success,false); const row = w.actual.rows.at(-1);
  assert.equal(row.move,'c5b4'); assert.equal(row.offset,0); assert.equal(row.captures[0].proof,null);
  const c = legalPosition(row.captures[0].post); assert.equal(c.move('b4a4').captured,'p');
  const counter = get(fixtures.find(f => f.id === 'reserve-countercapture')).reserveTempoAnalysis.witness.actual.rows.at(-1);
  assert.equal(counter.move,'c5b4'); assert.equal(counter.offset,-1); assert.equal(counter.captures[0].proof.minimumGain,1); assert.equal(counter.captures[0].net,0); assert.equal(counter.success,false);
});
for (const [name,mutate] of Object.entries({
  pair:w => w.pair.w = 'd4',inventory:w => w.actual.legalMoves.pop(),options:w => w.actual.options.pop(),rows:w => w.actual.rows.pop(),
  target:w => w.actual.target = 'd5',offset:w => w.actual.rows[0].offset++,capture:w => w.actual.rows[0].captures.pop(),
  proof:w => w.actual.rows[0].captures[0].proof.minimumGain++,alternatives:w => w.kingAlternatives.rows.pop(),
})) test('reject reserve '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r.reserveTempoAnalysis.witness); assert.throws(() => checkWitness(r.reserveTempoAnalysis.witness,r,f)); });
for (const [name,mutate] of Object.entries({
  frame:w => w.opposite.fen = w.after,turn:w => w.opposite.policy.loser = 'b',missing:w => w.opposite.policy.rows.pop(),
})) test('reject reciprocal '+name,() => { const f = fixtures.find(f => f.id === 'trebuchet-entry'),r = structuredClone(get(f)); mutate(r.reserveTempoAnalysis.witness); assert.throws(() => checkWitness(r.reserveTempoAnalysis.witness,r,f)); });

import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './timing.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E129-knight-tempo-parity/code/knight.mjs';
import {fixtures as parentFixtures} from '../../E129-knight-tempo-parity/code/fixtures.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E130').map(e => e.id),f.expected); if (r.castlingTimingAnalysis.witness) checkWitness(r.castlingTimingAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const castlingTimingTags of [undefined,false]) { const i = {...fixtures[0],castlingTimingTags,maxCastlingTimingNodes:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],castlingTimingTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxCastlingTimingNodes:v}));
});
test('history mismatch and illegal actual',() => { assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].history.fen,moves:[]}}),/history/i); assert.throws(() => explainMove({...fixtures[0],move:'e1e3'})); });
test('exact atomic budget retains parent',() => {
  const f = fixtures[1],r = get(f),n = r.castlingTimingAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxCastlingTimingNodes:n}).castlingTimingAnalysis.witness,r.castlingTimingAnalysis.witness);
  const i = {...f,maxCastlingTimingNodes:n-1},low = explainMove(i); assert.equal(low.castlingTimingAnalysis.status,'exhausted'); assert.equal(low.castlingTimingAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('exhaustion preserves enabled parent knight proof',() => { const i = {...parentFixtures[0],castlingTimingTags:true,maxCastlingTimingNodes:0},r = explainMove(i); assert.equal(r.knightTempoAnalysis.status,'proven'); assert.deepEqual(r.events,parent(i).events); });
test('all alternatives and pre-existing threat retained',() => {
  const w = get(fixtures[1]).castlingTimingAnalysis.witness; assert.ok(w.common.includes('h4f2')); assert.ok(w.restored.mates.includes('h4f2'));
  assert.ok(w.alternatives.some(r => r.played.move === 'g2g3' && !r.panel.mates.length)); assert.ok(w.alternatives.some(r => r.played.move === 'a2a4' && r.panel.mates.includes('h4f2')));
});
for (const [name,mutate] of Object.entries({
  root:w => w.rootMoves.pop(),alternative:w => w.alternatives.pop(),reply:w => w.actual.rows.pop(),mate:w => w.actual.rows.find(r => r.mate).mate = false,
  history:w => w.history.moves.pop(),clock:w => w.after = w.after.replace(' 0 5',' 1 5'),prior:w => w.prior.fen = w.before,
  restored:w => w.restored.fen = w.after,safe:w => w.safeCastles = [],delay:w => w.pawnDelays = [],early:w => w.early = false,
  common:w => w.common = [],terminal:w => w.actual.terminal = true,labels:w => w.ids.pop(),
})) test('reject '+name,() => { const f = fixtures[1],r = structuredClone(get(f)); mutate(r.castlingTimingAnalysis.witness); assert.throws(() => checkWitness(r.castlingTimingAnalysis.witness,r,f)); });

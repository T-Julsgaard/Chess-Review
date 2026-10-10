import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './correspondence.mjs';
import {checkWitness} from './check-witness.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent} from '../../E126-reserve-tempo-trebuchet/code/tempo.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E127').map(e => e.id),f.expected); if (r.correspondenceAnalysis.witness) checkWitness(r.correspondenceAnalysis.witness,r,f); });
test('disabled exact parent',() => {
  for (const correspondenceTags of [undefined,false]) { const i = {...fixtures[0],correspondenceTags,maxCorrespondenceNodes:null}; assert.deepEqual(explainMove(i),parent(i)); }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],correspondenceTags:v}));
  for (const v of [-1,250001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxCorrespondenceNodes:v}));
});
test('history mismatch and illegal move',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['d1c1']}}),/history/i);
  assert.throws(() => explainMove({...fixtures[0],move:'d1f1'}));
});
test('exact atomic budget preserves parent',() => {
  const f = fixtures[0],r = get(f),n = r.correspondenceAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxCorrespondenceNodes:n}).correspondenceAnalysis.witness,r.correspondenceAnalysis.witness);
  const i = {...f,maxCorrespondenceNodes:n-1},low = explainMove(i); assert.equal(low.correspondenceAnalysis.status,'exhausted'); assert.equal(low.correspondenceAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events);
});
test('connected different square pairs and complete following choices',() => {
  const w = get(fixtures[0]).correspondenceAnalysis.witness; assert.equal(w.actual.unique,'g1g2');
  const next = w.follow[w.linked]; assert.equal(next.move,'e1e2'); assert.equal(next.responses.unique,'g2g3');
  assert.deepEqual(w.graph.counts,{states:6564,edges:38280,winning:3053,safe:3511,maxRank:19});
});
test('clock unknown and repeated history never become false absence',() => {
  const low = get(fixtures.find(f => f.id === 'insufficient-clock')).correspondenceAnalysis.witness;
  assert.deepEqual(low.actual.unknown,['g1h1','g1h2']); assert.equal(low.actual.unique,null);
  assert.equal(get(fixtures.find(f => f.id === 'repeated-history')).correspondenceAnalysis.status,'history-unavailable');
});
test('extra exhaustion retains enabled parent trebuchet',() => {
  const f = fixtures.find(f => f.id === 'inherited-trebuchet'),r = get(f); assert.equal(r.reserveTempoAnalysis.status,'proven'); assert.equal(r.correspondenceAnalysis.status,'exhausted'); assert.deepEqual(r.events,parent(f).events);
});
test('a prospective reply repeating earlier history is unknown',() => {
  const history = {fen:boardFen({e1:'K',h1:'k',d4:'P',d5:'p'}),moves:['e1d1','h1g1']},c = legalPosition(history.fen); for (const move of history.moves) c.move(move);
  const f = {...fixtures[0],fen:c.fen(),history},r = explainMove(f),w = r.correspondenceAnalysis.witness;
  assert.equal(w.actual.replies.find(t => t.move === 'g1h1').outcome,'unknown'); assert.equal(w.actual.unique,null); checkWitness(w,r,f);
});
test('a pawn capture cannot masquerade as a quiet king correspondence',() => {
  const r = explainMove({...fixtures[0],fen:boardFen({c5:'K',h8:'k',d4:'P',d5:'p'}),move:'c5d5'});
  assert.equal(r.correspondenceAnalysis.status,'not-quiet-king'); assert.equal(r.correspondenceAnalysis.witness,null);
});
for (const [name,mutate] of Object.entries({
  illegal:w => w.graph.ranks[w.graph.ranks.indexOf(-2)] = -1,
  safe:w => w.graph.ranks[w.graph.ranks.indexOf(-1)] = 1,
  winning:w => w.graph.ranks[w.graph.ranks.findIndex(n => n > 0)]++,
  omitted:w => w.graph.ranks.pop(),counts:w => w.graph.counts.edges++,
  replies:w => w.actual.replies.pop(),inventory:w => w.actual.moves.pop(),unique:w => w.actual.unique = 'g1h1',
  outcome:w => w.actual.replies[0].outcome = 'losing',following:w => w.follow.pop(),
  linked:w => w.linked = null,history:w => w.history = {fen:w.before,moves:[]},
})) test('reject '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r.correspondenceAnalysis.witness); assert.throws(() => checkWitness(r.correspondenceAnalysis.witness,r,f)); });

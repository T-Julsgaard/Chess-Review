import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './offers.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E130-castling-pawn-delays/code/timing.mjs';
import {fixtures as parentFixtures} from '../../E130-castling-pawn-delays/code/fixtures.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E131').map(e => e.id),f.expected); if (r.pawnOfferAnalysis.witness) checkWitness(r.pawnOfferAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const pawnOfferTags of [undefined,false]) { const i = {...fixtures[0],pawnOfferTags,maxPawnOfferNodes:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => { for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],pawnOfferTags:v})); for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxPawnOfferNodes:v})); });
test('history mismatch and illegal actual',() => { assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].history.fen,moves:[]}}),/history/i); assert.throws(() => explainMove({...fixtures[0],move:'e1e3'})); });
test('exact atomic budget retains parent',() => {
  const f = fixtures[3],r = get(f),n = r.pawnOfferAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxPawnOfferNodes:n}).pawnOfferAnalysis.witness,r.pawnOfferAnalysis.witness);
  const i = {...f,maxPawnOfferNodes:n-1},low = explainMove(i); assert.equal(low.pawnOfferAnalysis.status,'exhausted'); assert.equal(low.pawnOfferAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('exhaustion preserves enabled parent castling proof',() => { const i = {...parentFixtures[0],pawnOfferTags:true,maxPawnOfferNodes:0},r = explainMove(i); assert.equal(r.castlingTimingAnalysis.status,'proven'); assert.deepEqual(r.events,parent(i).events); });
test('countercapture balance does not become fictitious net gain',() => {
  const w = get(fixtures[3]).pawnOfferAnalysis.witness,r = w.current.rows[w.pair.current]; assert.equal(r.gain,1); assert.ok(r.replies.some(x => x.reply.move === 'd5c4' && x.gain === 0 && !x.takesAcceptor));
});
test('EP victim is distinct from accepting destination',() => { const f = fixtures.find(f => f.id === 'ep-accepted'),w = get(f).pawnOfferAnalysis.witness,r = w.incoming.rows[w.accepted[0]]; assert.equal(r.victim,'b5'); assert.equal(r.capture.to,'b6'); });
for (const [name,mutate] of Object.entries({
  inventory:w => w.current.moves.pop(),capture:w => w.current.rows.pop(),reply:w => w.current.rows[0].replies.pop(),
  balance:w => w.current.baseline++,gain:w => w.current.rows[0].replies[0].gain++,victim:w => w.current.rows[0].replies[0].victim = 'e5',
  recapture:w => w.current.rows[0].replies[0].takesAcceptor = true,history:w => w.history.moves.pop(),
  preserved:w => w.preserved.root = w.after,offer:w => w.incoming.offer.to = 'c3',eligible:w => w.current.eligible = [],
  pair:w => w.pair.preserved++,accepted:w => w.accepted.push(0),untaken:w => w.untaken = false,
  clock:w => w.after = w.after.replace(' 0 3',' 1 3'),labels:w => w.ids.pop(),
})) test('reject '+name,() => { const f = fixtures[3],r = structuredClone(get(f)); mutate(r.pawnOfferAnalysis.witness); assert.throws(() => checkWitness(r.pawnOfferAnalysis.witness,r,f)); });

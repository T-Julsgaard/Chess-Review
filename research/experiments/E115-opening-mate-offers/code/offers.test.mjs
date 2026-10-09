import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {explainMove} from './offers.mjs';
import {explainMove as parent} from '../../E114-position-history-invariants/code/invariants.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const saved = new Map();
for (const f of fixtures) test(f.id,() => {
  const r = explainMove(f);
  saved.set(f.id,r);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E115').map(e => e.id),f.expected);
  if (r.openingMateOfferAnalysis.witness) checkWitness(JSON.parse(JSON.stringify(r.openingMateOfferAnalysis.witness)),r,f);
});
test('disabled exact parent',() => {
  for (const openingMateOfferTags of [undefined,false]) {
    const i = {...fixtures[0],openingMateOfferTags}; assert.deepEqual(explainMove(i),parent(i));
  }
});
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],openingMateOfferTags:v}));
  for (const v of [-1,5,1.5,null]) assert.throws(() => explainMove({...fixtures[0],openingOfferMatePlies:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxOpeningMateOfferNodes:v}));
});
test('exact atomic budget boundary',() => {
  const f = fixtures[0],r = explainMove(f),n = r.openingMateOfferAnalysis.nodes;
  assert.deepEqual(explainMove({...f,maxOpeningMateOfferNodes:n}).openingMateOfferAnalysis.witness,r.openingMateOfferAnalysis.witness);
  const i = {...f,maxOpeningMateOfferNodes:n-1},low = explainMove(i);
  assert.equal(low.openingMateOfferAnalysis.status,'exhausted'); assert.equal(low.openingMateOfferAnalysis.witness,null);
  assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('history mismatch and terminal refusal',() => {
  assert.throws(() => explainMove({...fixtures[0],history:{...fixtures[0].history,moves:[]}}),/history/i);
  const c = new Chess(),moves = ['f2f3','e7e5','g2g4','d8h4']; for (const m of moves) c.move(m);
  assert.throws(() => explainMove({...fixtures[0],fen:c.fen(),move:'a2a3',history:{fen:new Chess().fen(),moves}}),e => e.message === 'Illegal move: a2a3');
});
for (const [name,mutate] of Object.entries({
  offset:w => w.current.offset = 0,baseline:w => w.current.baselineFen = w.after,
  capture:w => w.current.rows.pop(),minimum:w => w.current.rows[1].minimum++,
  material:w => w.current.rows[1].certificate.minimumGain++,
  replies:w => w.current.rows[1].certificate.witnesses.pop(),
  mate:w => w.current.rows[1].mate.tree.win = false,
  winner:w => w.current.rows[1].mate.winner = 'b',
  depth:w => w.current.rows[1].mate.plies = 1,
  selected:w => w.selected.offer = -1,
  history:w => w.history.moves.pop(),
})) test('reject '+name,() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(saved.get(f.id))); mutate(r.openingMateOfferAnalysis.witness);
  assert.throws(() => checkWitness(r.openingMateOfferAnalysis.witness,r,f));
});
test('stationary offered queen retained',() => {
  const r = saved.get(fixtures[0].id),w = r.openingMateOfferAnalysis.witness,row = w.current.rows[w.selected.offer];
  assert.equal(w.played.piece,'n'); assert.equal(row.capture.captured,'q'); assert.equal(row.capture.to,'d1');
  assert.equal(w.current.offset,-1); assert.equal(row.minimum,5);
});
test('accepted and untaken bind exact incoming move',() => {
  for (const id of ['white-offer-accepted','white-offer-untaken']) {
    const f = fixtures.find(f => f.id === id),r = JSON.parse(JSON.stringify(saved.get(id))); r.openingMateOfferAnalysis.witness.selected.accepted = 0;
    assert.throws(() => checkWitness(r.openingMateOfferAnalysis.witness,r,f));
  }
});
test('no intent or broad compensation relabeling',() => {
  const f = fixtures[0],r = JSON.parse(JSON.stringify(saved.get(f.id))); r.events.find(e => e.evidence?.experiment === 'E115').text = 'A sound gambit with lasting compensation';
  assert.throws(() => checkWitness(r.openingMateOfferAnalysis.witness,r,f));
});

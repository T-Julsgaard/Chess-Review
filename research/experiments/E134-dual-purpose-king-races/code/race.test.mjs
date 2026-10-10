import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './race.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E133-central-position-types/code/center.mjs';
import {fixtures as parentFixtures} from '../../E133-central-position-types/code/fixtures.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); },positive = fixtures.find(f => f.id === 'adaptive-distinct-files');
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E134').map(e => e.id),f.expected); if (r.kingRaceAnalysis.witness) checkWitness(r.kingRaceAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const kingRaceTags of [undefined,false]) { const i = {...positive,kingRaceTags,maxKingRaceNodes:null,kingRacePlies:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => {
  for (const v of [null,1,'true']) assert.throws(() => explainMove({...positive,kingRaceTags:v}));
  for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...positive,maxKingRaceNodes:v}));
  for (const v of [-1,11,1.5,null]) assert.throws(() => explainMove({...positive,kingRacePlies:v}));
});
test('history mismatch and illegal actual',() => { assert.throws(() => explainMove({...positive,history:{fen:positive.fen,moves:['f5g5']}}),/history/i); assert.throws(() => explainMove({...positive,move:'f5f7'})); });
test('exact atomic budget retains parent',() => {
  const r = get(positive),n = r.kingRaceAnalysis.nodes; assert.deepEqual(explainMove({...positive,maxKingRaceNodes:n}).kingRaceAnalysis.witness,r.kingRaceAnalysis.witness);
  const i = {...positive,maxKingRaceNodes:n-1},low = explainMove(i); assert.equal(low.kingRaceAnalysis.status,'exhausted'); assert.equal(low.kingRaceAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('exhaustion preserves enabled parent central structure',() => { const i = {...parentFixtures[0],kingRaceTags:true,maxKingRaceNodes:0},r = explainMove(i); assert.equal(r.centralPositionAnalysis.status,'proven'); assert.deepEqual(r.events,parent(i).events); });
test('dual policies, bare-king stopping and equal promoted material',() => {
  const w = get(positive).kingRaceAnalysis.witness; assert.equal(w.combined.win,true); assert.equal(w.capture.win,false); assert.equal(w.queen.win,false);
  const nodes = Object.values(w.combined.nodes); assert.ok(nodes.some(n => n.kind === 'stopped' && legalPosition(n.fen).isInsufficientMaterial()));
  assert.ok(nodes.some(n => n.kind === 'queen' && (n.probe.gain === 0 || n.probe.replies.some(r => r.gain === 0))));
});
test('single resource suffices and does not receive adaptive label',() => {
  const f = {...positive,fen:boardFen({f5:'K',c6:'P',h8:'k',d3:'p'})},r = explainMove(f); assert.equal(r.kingRaceAnalysis.status,'single-resource-suffices'); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E134'),[]); checkWitness(r.kingRaceAnalysis.witness,r,f);
});
test('full history and independent history mutation',() => {
  const history = {fen:positive.fen,moves:['f5g5','b5a5','g5f5','a5b5']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
  const f = {...positive,fen:c.fen(),history},r = explainMove(f); assert.equal(r.kingRaceAnalysis.status,'proven'); checkWitness(r.kingRaceAnalysis.witness,r,f);
  const bad = structuredClone(r); bad.kingRaceAnalysis.witness.history.moves.pop(); assert.throws(() => checkWitness(bad.kingRaceAnalysis.witness,bad,f));
});
test('outside material/move and actual clock terminal',() => {
  for (const f of [
    {...positive,fen:boardFen({f5:'K',c6:'P',b5:'k',d3:'p',a2:'P'})},
    {...positive,move:'c6c7'},
    {...positive,fen:positive.fen.replace(' 0 1',' 99 1')},
  ]) assert.deepEqual(explainMove(f).events.filter(e => e.evidence?.experiment === 'E134'),[]);
});
const root = w => w.combined.nodes[w.combined.root],queen = w => Object.values(w.combined.nodes).find(n => n.kind === 'queen');
for (const [name,mutate] of Object.entries({
  branch:w => root(w).branches.pop(),moves:w => root(w).moves.pop(),identity:w => root(w).ours = null,
  signature:w => root(w).historySignature = '[]',depth:w => root(w).left--,mode:w => w.capture.mode = 'combined',
  negative:w => w.capture.win = true,probe:w => queen(w).probe.replies.pop(),gain:w => queen(w).probe.gain++,
  survival:w => queen(w).probe.replies[0].good = !queen(w).probe.replies[0].good,
  goal:w => Object.values(w.combined.nodes).find(n => n.kind === 'stopped').win = false,
  reference:w => root(w).branches[0].child = -1,ownPawn:w => w.ownPawn = 'c5',distance:w => w.distances.own.before++,
  clock:w => w.after = w.after.replace(' 1 1',' 2 1'),
})) test('reject '+name,() => { const r = structuredClone(get(positive)); mutate(r.kingRaceAnalysis.witness); assert.throws(() => checkWitness(r.kingRaceAnalysis.witness,r,positive)); });

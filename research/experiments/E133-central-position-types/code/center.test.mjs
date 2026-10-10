import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './center.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E132-supported-outpost-challenges/code/outpost.mjs';
import {fixtures as parentFixtures} from '../../E132-supported-outpost-challenges/code/fixtures.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E133').map(e => e.id),f.expected); if (r.centralPositionAnalysis.witness) checkWitness(r.centralPositionAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const centralPositionTags of [undefined,false]) { const i = {...fixtures[0],centralPositionTags,maxCentralPositionNodes:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => { for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],centralPositionTags:v})); for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxCentralPositionNodes:v})); });
test('history mismatch and illegal actual',() => { assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a1b1']}}),/history/i); assert.throws(() => explainMove({...fixtures[0],move:'a1a3'})); });
test('exact atomic budget retains parent',() => {
  const f = fixtures.find(f => f.id === 'fluid'),r = get(f),n = r.centralPositionAnalysis.nodes; assert.deepEqual(explainMove({...f,maxCentralPositionNodes:n}).centralPositionAnalysis.witness,r.centralPositionAnalysis.witness);
  const i = {...f,maxCentralPositionNodes:n-1},low = explainMove(i); assert.equal(low.centralPositionAnalysis.status,'exhausted'); assert.equal(low.centralPositionAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('exhaustion preserves enabled parent outpost policy',() => { const i = {...parentFixtures[0],centralPositionTags:true,maxCentralPositionNodes:0},r = explainMove(i); assert.equal(r.outpostChallengeAnalysis.status,'proven'); assert.deepEqual(r.events,parent(i).events); });
test('same pawn count gives distinct structures and actual legal choice',() => {
  const a = get(fixtures.find(f => f.id === 'closed')).centralPositionAnalysis.witness,b = get(fixtures.find(f => f.id === 'fluid')).centralPositionAnalysis.witness;
  assert.equal(a.structure.pawns.length,b.structure.pawns.length); assert.equal(a.structure.type,'closed'); assert.equal(b.structure.type,'other'); assert.equal(b.successors[b.closing].move.move,'d5d4'); assert.equal(b.successors[b.opening].move.move,'d5e4');
});
test('pawn openness does not fabricate legal slider activity',() => {
  const none = get(fixtures[0]).centralPositionAnalysis.witness,withSlider = get(fixtures.find(f => f.id === 'open-legal-slider')).centralPositionAnalysis.witness;
  assert.equal(none.routes.length,0); assert.ok(withSlider.routes.some(r => r.center.includes('d5') && r.center.includes('e5')));
});
test('full history and independent history mutation rejection',() => {
  const history = {fen:fixtures[0].fen,moves:['a1b1','h8g8','b1a1','g8h8']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
  const f = {...fixtures[0],id:'history',fen:c.fen(),history},r = explainMove(f); checkWitness(r.centralPositionAnalysis.witness,r,f);
  const bad = structuredClone(r); bad.centralPositionAnalysis.witness.history.moves.pop(); assert.throws(() => checkWitness(bad.centralPositionAnalysis.witness,bad,f));
});
test('actual capture clears last central pawn',() => {
  const f = {...fixtures[0],fen:boardFen({a1:'K',a2:'P',h8:'k',h7:'p',c4:'B',d5:'p'}),move:'c4d5'},r = explainMove(f); assert.equal(r.centralPositionAnalysis.witness.structure.type,'open'); checkWitness(r.centralPositionAnalysis.witness,r,f);
});
for (const [name,id,mutate] of [
  ['pawn','closed',w => w.structure.pawns.pop()],['color','closed',w => w.structure.pawns[0].color = 'b'],
  ['file','closed',w => w.structure.files[3].w = []],['front','closed',w => w.structure.fronts[0].square = 'd6'],['lock','closed',w => w.structure.locks.pop()],
  ['semi','split-semi-open',w => w.structure.semiFiles.w = w.structure.semiFiles.w === 'd' ? 'e' : 'd'],['inventory','fluid',w => w.moves.pop()],['successor','fluid',w => w.successors.pop()],
  ['type','fluid',w => w.successors[w.opening].structure.type = 'closed'],['terminal','fluid',w => w.successors[w.opening].terminal = true],
  ['choice','fluid',w => w.closing++],['fluid','fluid',w => w.fluid = false],['path','open-legal-slider',w => w.routes[0].path.pop()],
  ['center','open-legal-slider',w => w.routes.find(r => r.center.length).center = []],['clock','fluid',w => w.after = w.after.replace(' 1 1',' 2 1')],
  ['label','fluid',w => w.ids = []],
]) test('reject '+name,() => { const f = fixtures.find(f => f.id === id),r = structuredClone(get(f)); mutate(r.centralPositionAnalysis.witness); assert.throws(() => checkWitness(r.centralPositionAnalysis.witness,r,f)); });

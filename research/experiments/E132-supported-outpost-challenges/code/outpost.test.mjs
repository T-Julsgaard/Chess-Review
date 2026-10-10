import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './outpost.mjs';
import {checkWitness} from './check-witness.mjs';
import {explainMove as parent} from '../../E131-pawn-counteroffers/code/offers.mjs';
import {fixtures as parentFixtures} from '../../E131-pawn-counteroffers/code/fixtures.mjs';
const saved = new Map(),get = f => { if (!saved.has(f.id)) saved.set(f.id,explainMove(f)); return saved.get(f.id); };
for (const f of fixtures) test(f.id,() => { const r = get(f); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E132').map(e => e.id),f.expected); if (r.outpostChallengeAnalysis.witness) checkWitness(r.outpostChallengeAnalysis.witness,r,f); });
test('disabled exact parent',() => { for (const outpostChallengeTags of [undefined,false]) { const i = {...fixtures[0],outpostChallengeTags,maxOutpostChallengeNodes:null}; assert.deepEqual(explainMove(i),parent(i)); } });
test('strict controls',() => { for (const v of [null,1,'true']) assert.throws(() => explainMove({...fixtures[0],outpostChallengeTags:v})); for (const v of [-1,50001,1.5,null]) assert.throws(() => explainMove({...fixtures[0],maxOutpostChallengeNodes:v})); });
test('history mismatch and illegal actual',() => { assert.throws(() => explainMove({...fixtures[0],history:{fen:fixtures[0].fen,moves:['a1b1']}}),/history/i); assert.throws(() => explainMove({...fixtures[0],move:'a1a3'})); });
test('exact atomic budget retains parent',() => {
  const f = fixtures[0],r = get(f),n = r.outpostChallengeAnalysis.nodes; assert.deepEqual(explainMove({...f,maxOutpostChallengeNodes:n}).outpostChallengeAnalysis.witness,r.outpostChallengeAnalysis.witness);
  const i = {...f,maxOutpostChallengeNodes:n-1},low = explainMove(i); assert.equal(low.outpostChallengeAnalysis.status,'exhausted'); assert.equal(low.outpostChallengeAnalysis.witness,null); assert.deepEqual(low.events,parent(i).events); assert.equal(low.comment,parent(i).comment);
});
test('exhaustion preserves enabled parent counteroffer',() => { const i = {...parentFixtures[3],outpostChallengeTags:true,maxOutpostChallengeNodes:0},r = explainMove(i); assert.equal(r.pawnOfferAnalysis.status,'proven'); assert.deepEqual(r.events,parent(i).events); });
test('equal exchange and universal two-knight entry',() => {
  const w = get(fixtures[0]).outpostChallengeAnalysis.witness,row = w.trials[w.selected].entries[0]; assert.ok(row.captures[row.selected].replies.some(r => r.gain === 0 && r.reply.move === 'e6d5'));
  const multi = get(fixtures[2]).outpostChallengeAnalysis.witness; assert.equal(multi.trials[multi.selected].entries.length,2);
});
for (const [name,mutate] of Object.entries({
  prior:w => w.prior.moves.pop(),priorEntry:w => w.prior.entries.pop(),priorReply:w => w.prior.entries.find(r => r.secure).replies.pop(),
  support:w => w.prior.entries.find(r => r.secure).profile.supporters = [],challenger:w => w.prior.entries.find(r => r.secure).profile.challengers.push('c2'),
  actual:w => w.actualMoves.pop(),entry:w => w.trials[w.selected].entries.pop(),capture:w => w.trials[w.selected].entries[0].captures.pop(),
  reply:w => w.trials[w.selected].entries[0].captures[0].replies.pop(),gain:w => w.trials[w.selected].entries[0].captures[0].replies[0].gain++,
  terminal:w => w.trials[w.selected].entries[0].terminal = true,turn:w => w.prior.fen = w.before,
  baseline:w => w.trials[w.selected].entries[0].baseline++,selected:w => w.selected++,target:w => w.targets[0] = 'e5',
  clock:w => w.after = w.after.replace(' 1 1',' 2 1'),
})) test('reject '+name,() => { const f = fixtures[0],r = structuredClone(get(f)); mutate(r.outpostChallengeAnalysis.witness); assert.throws(() => checkWitness(r.outpostChallengeAnalysis.witness,r,f)); });

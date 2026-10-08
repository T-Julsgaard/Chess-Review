import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: test} = await import('node:test');
const {default: assert} = await import('node:assert/strict');
const {Chess} = await import('../../../../lib/chess.js');
const {explainMove} = await import('./shield.mjs');
const {explainMove: parent} = await import('../../E079-central-king-support/code/center.mjs');
const {replayQuery} = await import('../../E029-forced-mates/code/replay.mjs');
const {turnBoard} = await import('../../E027-defensive-resources/code/defense.mjs');
const {candidate, rookOriginal, candidates, reflect} = await import('./fixtures.mjs');

// Authored prospective development hypothesis. No acceptance or tracker change.
for (const f of candidates.flatMap(f => [f, reflect(f)])) test(f.id + ': complete source proofs for retained development hypothesis', () => {
  const result = explainMove(f), a = result.pawnShieldAnalysis;
  assert.equal(a.status, f.expectedStatus || 'proven');
  const root = new Chess(f.fen), enemy = root.turn() === 'w' ? 'b' : 'w';
  assert.equal(replayQuery(turnBoard(root, enemy), a.beforeProof).win, true);
  root.move(f.move);
  if (a.status === 'proven') {
    assert.equal(replayQuery(root, a.afterProof).win, false);
    assert.ok(a.witness.blockedCapture.cells.includes(a.witness.played.to));
    assert.equal(result.events.at(-1).qualityClaim, false);
    assert.ok(result.events.at(-1).text.split(/\s+/).length <= 24);
  } else {
    if (a.afterProof) assert.equal(replayQuery(root, a.afterProof).win, true);
    assert.equal(a.witness, null);
    assert.ok(!result.events.some(e => e.id === 'pawn-shield-defense'));
  }
});
for (const f of [rookOriginal, reflect(rookOriginal)]) test(f.id + ': retained failed hypothesis with another mate', () => {
  const result = explainMove(f), a = result.pawnShieldAnalysis;
  assert.equal(a.status, 'no-new-fact');
  assert.equal(a.beforeProof.tree.win, true);
  assert.equal(a.afterProof.tree.win, true);
  const root = new Chess(f.fen); root.move(f.move);
  assert.equal(replayQuery(root, a.afterProof).win, true);
  assert.ok(!result.events.some(e => e.id === 'pawn-shield-defense'));
});
test('disabled exact parent, strict flags and atomic wrapper budget', () => {
  const f = {...candidate, pawnShieldTags: false};
  assert.deepEqual(explainMove(f), parent(f));
  for (const value of [null, 1, 'true']) assert.throws(() => explainMove({...candidate, pawnShieldTags: value}), /must be boolean/);
  for (const value of [null, -1, .5, 50001]) assert.throws(() => explainMove({...candidate, maxPawnShieldNodes: value}), /integer 0\.\.50000/);
  const zero = explainMove({...candidate, maxPawnShieldNodes: 0});
  assert.equal(zero.pawnShieldAnalysis.status, 'exhausted');
  assert.equal(zero.pawnShieldAnalysis.nodes, 1);
  assert.equal(zero.pawnShieldAnalysis.beforeProof, null);
  assert.deepEqual(zero.events, parent(candidate).events);
});
test('exact and one-less wrapper budgets preserve complete evidence or atomically abstain', () => {
  const complete = explainMove(candidate), limit = complete.pawnShieldAnalysis.nodes;
  const exact = explainMove({...candidate, maxPawnShieldNodes: limit});
  assert.equal(exact.pawnShieldAnalysis.status, 'proven');
  assert.deepEqual(exact.events, complete.events);
  const short = explainMove({...candidate, maxPawnShieldNodes: limit - 1});
  assert.equal(short.pawnShieldAnalysis.status, 'exhausted');
  assert.equal(short.pawnShieldAnalysis.nodes, limit);
  assert.equal(short.pawnShieldAnalysis.beforeProof, null);
  assert.equal(short.pawnShieldAnalysis.afterProof, null);
  assert.equal(short.pawnShieldAnalysis.witness, null);
  assert.deepEqual(short.events, parent(candidate).events);
});
test('cover shape without a mating threat or without the causal obstruction gets no new comment', () => {
  const unsupported = new Chess(candidate.fen); unsupported.remove('f3');
  for (const f of [{...candidate, fen: unsupported.fen()}, {...candidate, move: 'h2h3'}]) {
    const result = explainMove(f);
    assert.equal(result.pawnShieldAnalysis.status, 'no-new-fact');
    assert.equal(result.pawnShieldAnalysis.witness, null);
    assert.ok(!result.events.some(e => e.id === 'pawn-shield-defense'));
  }
});

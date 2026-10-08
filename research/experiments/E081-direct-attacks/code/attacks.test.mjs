import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: assert} = await import('node:assert/strict');
const {test} = await import('node:test');
const {candidate, fixtures, reflect} = await import('./fixtures.mjs');
const {explainMove} = await import('./attacks.mjs');
const {replayResult} = await import('./replay.mjs');
const {explainMove: parent} = await import('../../E080-pawn-shield-defense/code/shield.mjs');
for (const f of fixtures.flatMap(f => [f, reflect(f)])) test(f.id, () => {
  if (f.inputError) { assert.throws(() => explainMove(f), new RegExp(f.expectedError)); return; }
  const result = explainMove(f), checked = replayResult(f, result);
  assert.equal(checked.state, f.expectedStatus);
  for (const id of f.expected) assert.ok(result.events.some(e => e.id === id));
  for (const e of result.events.filter(e => ['direct-attack', 'attack-on-pawn', 'attack-on-piece'].includes(e.id))) {
    assert.equal(e.qualityClaim, false); assert.ok(e.text.split(/\s+/).length <= 24);
  }
});
test('strict options, disabled compatibility and exact atomic boundary', () => {
  for (const value of [null, 1, 'true']) assert.throws(() => explainMove({...candidate, directAttackTags: value}), /boolean/);
  for (const value of [null, -1, .5, 50001]) assert.throws(() => explainMove({...candidate, maxDirectAttackNodes: value}), /integer/);
  assert.deepEqual(explainMove({...candidate, directAttackTags: false, maxDirectAttackNodes: null}), parent(candidate));
  const full = explainMove(candidate), nodes = full.directAttackAnalysis.nodes;
  const exact = {...candidate, maxDirectAttackNodes: nodes}, short = {...candidate, maxDirectAttackNodes: nodes - 1};
  assert.equal(replayResult(exact, explainMove(exact)).state, 'proven');
  const refusal = explainMove(short); assert.equal(replayResult(short, refusal).state, 'exhausted');
  assert.equal(refusal.directAttackAnalysis.witness, null); assert.deepEqual(refusal.events, parent(candidate).events);
  assert.equal(refusal.comment, parent(candidate).comment);
});
test('independent replay rejects forged target, legal capture and teaching claim', () => {
  const full = explainMove(candidate);
  for (const change of [r => { r.directAttackAnalysis.witness.targets[0].target.type = 'q'; },
    r => { r.directAttackAnalysis.witness.targets[0].captures = []; },
    r => { r.events.at(-1).qualityClaim = true; }, r => { r.comment = 'You win a free pawn.'; }]) {
    const forged = structuredClone(full); change(forged); assert.throws(() => replayResult(candidate, forged));
  }
});

import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: assert} = await import('node:assert/strict');
const {test} = await import('node:test');
const {candidate, fixtures, reflect} = await import('./fixtures.mjs');
const {explainMove} = await import('./attacks.mjs');
const {replayResult} = await import('./replay.mjs');
const {explainMove: parent} = await import('../../E080-pawn-shield-defense/code/shield.mjs');
const {packReport} = await import('../../E079-central-king-support/code/pool.mjs');
const {unpackReport} = await import('../../E079-central-king-support/code/saved.mjs');
const {sha256} = await import('../../../data-policy.mjs');
const {readFile} = await import('node:fs/promises');
const {renderStatus} = await import('./status.mjs');
const {renderStatus: parentStatus} = await import('../../E080-pawn-shield-defense/code/status.mjs');
const {parseTracker} = await import('../../../workflow.mjs');
const {renderDemo} = await import('./display.mjs');
for (const f of fixtures.flatMap(f => [f, reflect(f)])) test(f.id, () => {
  if (f.inputError) { assert.throws(() => explainMove(f), new RegExp(f.expectedError)); return; }
  const result = explainMove(f), checked = replayResult(f, result);
  assert.equal(checked.state, f.expectedStatus);
  for (const id of f.expected) assert.ok(result.events.some(e => e.id === id));
  if (f.parentSelectedId) assert.equal(result.events.find(e => e.text === result.comment)?.id, f.parentSelectedId);
  if (f.id.startsWith('all-capture-promotion-choices')) {
    assert.equal(result.directAttackAnalysis.witness.targets.length, 2);
    for (const t of result.directAttackAnalysis.witness.targets) assert.equal(t.captures.length, 4);
  }
  if (f.id.startsWith('multiple-categories')) assert.equal(result.directAttackAnalysis.witness.targets.length, 2);
  if (f.id.startsWith('double-step-clears-hypothetical-ep')) {
    assert.notEqual(result.after.split(' ')[3], '-');
    assert.equal(result.directAttackAnalysis.witness.hypotheticalActorFen.split(' ')[3], '-');
  }
  if (f.id.startsWith('castling-king-new-contact')) assert.equal(result.directAttackAnalysis.witness.attacker, 'k');
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
test('complete witness reconstruction rejects inventory, ray, snapshot, history, category and selection forgery', () => {
  const f = fixtures.find(f => f.id === 'rook-orthogonal'), full = explainMove(f);
  const mutations = [
    r => r.directAttackAnalysis.witness.before.pieces.pop(),
    r => r.directAttackAnalysis.witness.after.pieces.pop(),
    r => { r.directAttackAnalysis.witness.actor = 'b'; },
    r => { r.directAttackAnalysis.witness.attacker = 'k'; },
    r => { r.directAttackAnalysis.witness.played.to = 'b3'; },
    r => r.directAttackAnalysis.witness.legalMoves.pop(),
    r => r.directAttackAnalysis.witness.hypotheticalLegalMoves.pop(),
    r => { r.directAttackAnalysis.witness.hypotheticalActorFen = f.fen; },
    r => { r.directAttackAnalysis.witness.history = {fen: f.fen, moves: ['b1b8']}; },
    r => r.directAttackAnalysis.witness.targets[0].cells.pop(),
    r => { r.directAttackAnalysis.witness.targets[0].target.color = 'w'; },
    r => { r.directAttackAnalysis.witness.targets[0].target.type = 'k'; },
    r => { r.directAttackAnalysis.witness.targets[0].captures = ['b2d3']; },
    r => r.directAttackAnalysis.witness.contacts.pop(),
    r => { r.directAttackAnalysis.nodes--; },
    r => { r.directAttackAnalysis.status = 'no-new-fact'; },
    r => { r.events.at(-1).evidence.targets = ['a1']; },
    r => { r.events.at(-1).id = 'attack-on-pawn'; },
    r => { r.events.at(-1).priority = 1000; },
    r => { r.events.at(-1).text = 'This wins a free knight.'; },
    r => { r.events.at(-1).qualityClaim = true; },
    r => { r.comment = 'You win a free knight.'; },
  ];
  for (const mutate of mutations) { const forged = structuredClone(full); mutate(forged); assert.throws(() => replayResult(f, forged)); }
  const promoted = fixtures.find(f => f.id === 'all-capture-promotion-choices'), forged = explainMove(promoted);
  forged.directAttackAnalysis.witness.targets[0].captures.pop();
  assert.throws(() => replayResult(promoted, forged));
});
test('rehashed valid storage still requires independent contact semantics', () => {
  const report = {results: [{fixture: candidate, result: explainMove(candidate)}]}, stored = packReport(report);
  assert.deepEqual(unpackReport(stored), report);
  const forged = structuredClone(report); forged.results[0].result.directAttackAnalysis.witness.targets[0].captures = [];
  const altered = JSON.stringify(packReport(forged)), original = JSON.stringify(stored);
  assert.notEqual(sha256(altered), sha256(original)); const newPhysicalHash = sha256(altered);
  assert.equal(sha256(altered), newPhysicalHash);
  const decoded = unpackReport(JSON.parse(altered)); assert.throws(() => replayResult(candidate, decoded.results[0].result));
});
test('three candidate occurrence gates preserve every outside row; preview distinguishes played terminal and exhaustion', async () => {
  const list = await readFile('research/experiments/E020-coach-concepts/CONCEPTS.md', 'utf8'), report = {fixtures: 5312 + fixtures.length * 2};
  const before = parentStatus(list, report), after = renderStatus(list, report);
  const rows = text => new Map([...text.matchAll(/^- .* (C\d{4}) \*\*.*$/gm)].map(r => [r[1], r[0]]));
  let unchanged = 0; const old = rows(before), current = rows(after);
  for (const [id, row] of old) if (!['C0404', 'C0410', 'C0411'].includes(id)) { assert.equal(current.get(id), row); unchanged++; }
  assert.equal(unchanged, 1082);
  for (const id of ['C0404', 'C0410', 'C0411']) assert.ok(current.get(id).startsWith('- [x]'));
  const status = parseTracker(after, list); assert.equal(status.verifiedEntries, 375); assert.equal(status.remainingEntries, 710);
  assert.equal(status.partialEntries, 76);
  const zero = {...candidate, id: 'preview-zero', maxDirectAttackNodes: 0}, html = renderDemo([{fixture: zero, result: explainMove(zero)}]);
  assert.ok(html.includes('Played position')); assert.ok(html.includes('exhausted')); assert.ok(!html.includes('The input position is terminal'));
  const terminal = fixtures.find(f => f.id === 'guard-actual-mate'), played = renderDemo([{fixture: terminal, result: explainMove(terminal)}]);
  assert.ok(played.includes('Played position')); assert.ok(played.includes('not-live')); assert.ok(!played.includes('The input position is terminal'));
});

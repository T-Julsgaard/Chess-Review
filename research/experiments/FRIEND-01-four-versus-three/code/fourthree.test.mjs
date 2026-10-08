import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: test} = await import('node:test');
const {default: assert} = await import('node:assert/strict');
const {explainMove} = await import('./fourthree.mjs');
const {explainMove: parent} = await import('../../E080-pawn-shield-defense/code/shield.mjs');
const {replay} = await import('./replay.mjs');
const {fixtures} = await import('./fixtures.mjs');
const {clone} = await import('../../FRIEND-shared/lib.mjs');

const inputOf = f => ({fen: f.fen, move: f.move, scanReplies: false, ...(f.history ? {history: f.history} : {}),
  ...(f.flag === false ? {} : {fourThreeTags: f.flag ?? true}),
  ...(f.limit === undefined ? {} : {maxFourThreeNodes: f.limit}), ...(f.extra || {})});
const run = f => explainMove(inputOf(f));
const valid = fixtures.filter(f => !f.inputError);

for (const f of fixtures) test(f.id + ': expected status or refusal', () => {
  if (f.inputError) return assert.throws(() => run(f), e => e.message.includes(f.inputError));
  const result = run(f);
  assert.equal(replay(f, result).state, f.expectedStatus);
  if (f.expectedStatus !== 'proven') assert.ok(!result.events.some(e => e.id === 'four-versus-three'));
  const {fourThreeTags, maxFourThreeNodes, ...bare} = inputOf(f);
  assert.deepEqual(result.events.filter(e => e.id !== 'four-versus-three'), parent(bare).events);
  if (f.flag === false) assert.deepEqual(result, parent(bare));
});

test('colour reflection preserves status for every white fixture', () => {
  for (const f of valid.filter(x => x.id.endsWith('-black'))) {
    const white = valid.find(x => x.id === f.id.slice(0, -6));
    assert.equal(f.expectedStatus, white.expectedStatus);
    assert.equal(run(f).fourThreeAnalysis?.status, run(white).fourThreeAnalysis?.status);
  }
  assert.ok(valid.some(f => f.id.endsWith('-black') && f.expectedStatus === 'proven'));
});
test('both wings, both majority holders and every arrival kind are represented', () => {
  const proven = valid.filter(f => f.expectedStatus === 'proven' && run(f).fourThreeAnalysis);
  const w = proven.map(f => run(f).fourThreeAnalysis.witness);
  assert.deepEqual([...new Set(w.map(x => x.after.wing))].sort(), ['a-d', 'e-h']);
  assert.deepEqual([...new Set(w.map(x => x.actor))].sort(), ['b', 'w']);
  assert.ok(w.some(x => x.after.counts[x.actor] === 3), 'enemy-majority case');
  assert.ok(w.some(x => x.played.promotion === 'r'));
  assert.ok(w.some(x => x.played.captured === 'n') && w.some(x => x.played.captured === 'b') && w.some(x => x.played.captured === 'p'));
});
test('quiet fixture selects the parent rook-ending comment, not the new event', () => {
  const r = run(valid.find(f => f.id === 'quiet-kings-no-urgent-warning'));
  assert.ok(r.events.some(e => e.id === 'four-versus-three'));
  assert.notEqual(r.comment, r.events.at(-1).text);
});

const proven = () => { const f = valid.find(x => x.id === 'pawn-capture-kingside'); return [f, run(f)]; };
const tampers = {
  'altered pawn count': r => { r.fourThreeAnalysis.witness.after.counts.w = 3; },
  'altered wing': r => { r.fourThreeAnalysis.witness.after.wing = 'a-d'; },
  'added extra piece to after FEN': r => { const w = r.fourThreeAnalysis.witness; w.after.fen = w.after.fen.replace('r', 'q'); },
  'before state already matched': r => { r.fourThreeAnalysis.witness.before.fen = r.fourThreeAnalysis.witness.after.fen; },
  'wrong pawn list': r => { r.fourThreeAnalysis.witness.after.pawns.w = r.fourThreeAnalysis.witness.after.pawns.w.slice(1); },
  'edited text': r => { r.events.at(-1).text = r.events.at(-1).text.replace('four pawns', 'five pawns'); },
  'edited evidence copy': r => { r.events.at(-1).evidence.actor = 'b'; },
  'quality claim': r => { r.events.at(-1).qualityClaim = true; },
  'wrong budget units': r => { r.fourThreeAnalysis.nodes += 1; },
  'wrong limit': r => { r.fourThreeAnalysis.limit = 10; },
  'illegal played move': r => { r.fourThreeAnalysis.witness.played.to = 'f6'; },
  'removed event': r => { r.events = r.events.filter(e => e.id !== 'four-versus-three'); },
  'wrong status': r => { r.fourThreeAnalysis.status = 'no-new-fact'; },
  'wrong selected comment': r => { r.comment = 'invented'; },
};
for (const [name, mutate] of Object.entries(tampers)) test('independent replay rejects: ' + name, () => {
  const [f, r] = proven(), bad = clone(r); mutate(bad);
  assert.throws(() => replay(f, bad));
});
test('independent replay rejects a forged history and a wrong fixture', () => {
  const f = valid.find(x => x.id === 'pawn-capture-with-history'), r = run(f);
  assert.throws(() => replay({...f, history: {...f.history, moves: []}}, r));
  const [other] = proven(); assert.throws(() => replay(valid.find(x => x.id === 'rook-takes-knight'), run(other)));
});

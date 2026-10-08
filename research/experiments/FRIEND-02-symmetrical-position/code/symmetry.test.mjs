import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: test} = await import('node:test');
const {default: assert} = await import('node:assert/strict');
const {explainMove} = await import('./symmetry.mjs');
const {explainMove: parent} = await import('../../E080-pawn-shield-defense/code/shield.mjs');
const {replay} = await import('./replay.mjs');
const {fixtures} = await import('./fixtures.mjs');
const {clone} = await import('../../FRIEND-shared/lib.mjs');

const inputOf = f => ({fen: f.fen, move: f.move, scanReplies: false, ...(f.history ? {history: f.history} : {}),
  ...(f.flag === false ? {} : {symmetryTags: f.flag ?? true}),
  ...(f.limit === undefined ? {} : {maxSymmetryNodes: f.limit}), ...(f.extra || {})});
const run = f => explainMove(inputOf(f));
const valid = fixtures.filter(f => !f.inputError);

for (const f of fixtures) test(f.id + ': expected status or refusal', () => {
  if (f.inputError) return assert.throws(() => run(f), e => e.message.includes(f.inputError));
  const result = run(f);
  assert.equal(replay(f, result).state, f.expectedStatus);
  if (f.expectedStatus !== 'proven') assert.ok(!result.events.some(e => e.id === 'symmetrical-pawns'));
  const {symmetryTags, maxSymmetryNodes, ...bare} = inputOf(f);
  assert.deepEqual(result.events.filter(e => e.id !== 'symmetrical-pawns'), parent(bare).events);
  if (f.flag === false) assert.deepEqual(result, parent(bare));
});

test('colour reflection preserves status for every white fixture', () => {
  for (const f of valid.filter(x => x.id.endsWith('-black'))) {
    const white = valid.find(x => x.id === f.id.slice(0, -6));
    assert.equal(f.expectedStatus, white.expectedStatus);
    assert.equal(run(f).symmetryAnalysis?.status, run(white).symmetryAnalysis?.status);
  }
  assert.ok(valid.some(f => f.id.endsWith('-black') && f.expectedStatus === 'proven'));
});
test('both actors, 3/4/8 pawns, flag both ways and every arrival kind are represented', () => {
  const w = valid.filter(f => f.expectedStatus === 'proven').map(f => run(f).symmetryAnalysis.witness);
  assert.deepEqual([...new Set(w.map(x => x.actor))].sort(), ['b', 'w']);
  assert.deepEqual([...new Set(w.map(x => x.after.pairs.length))].sort(), [3, 4, 8]);
  assert.ok(w.some(x => x.after.piecesAlsoMirror) && w.some(x => !x.after.piecesAlsoMirror));
  assert.ok(w.some(x => x.played.captured === 'p' && x.played.piece === 'p'), 'pawn captures pawn');
  assert.ok(w.some(x => x.played.captured === 'p' && x.played.piece === 'b'), 'piece captures pawn');
  assert.ok(w.some(x => x.played.promotion === 'q'), 'promotion removes extra pawn');
  assert.ok(w.some(x => !x.played.captured && x.played.piece === 'p'), 'plain pawn advance');
});
test('piecesAlsoMirror never changes the label', () => {
  const flags = valid.filter(f => f.expectedStatus === 'proven').map(f => run(f).symmetryAnalysis.witness.after.piecesAlsoMirror);
  assert.ok(flags.includes(true) && flags.includes(false));
});

const proven = () => { const f = valid.find(x => x.id === 'pawn-advance-completes'); return [f, run(f)]; };
const tampers = {
  'dropped pair': r => { r.symmetryAnalysis.witness.after.pairs.pop(); },
  'unmirrored pair rank': r => { r.symmetryAnalysis.witness.after.pairs[0].black = 'a6'; },
  'pair on a different file': r => { r.symmetryAnalysis.witness.after.pairs[0].black = 'b7'; },
  'altered mirror flag': r => { r.symmetryAnalysis.witness.before.mirror = true; },
  'altered piecesAlsoMirror': r => { r.symmetryAnalysis.witness.after.piecesAlsoMirror = false; },
  'altered file list': r => { r.symmetryAnalysis.witness.after.files = ['a', 'b']; },
  'recoloured a pawn in the after FEN': r => { const w = r.symmetryAnalysis.witness; w.after.fen = w.after.fen.replace('P', 'p'); },
  'before state already symmetric': r => { r.symmetryAnalysis.witness.before.fen = r.symmetryAnalysis.witness.after.fen; },
  'edited text': r => { r.events.at(-1).text = r.events.at(-1).text.replace('a, b, c', 'a, b'); },
  'edited evidence copy': r => { r.events.at(-1).evidence.actor = 'b'; },
  'quality claim': r => { r.events.at(-1).qualityClaim = true; },
  'wrong budget units': r => { r.symmetryAnalysis.nodes += 1; },
  'wrong limit': r => { r.symmetryAnalysis.limit = 10; },
  'illegal played move': r => { r.symmetryAnalysis.witness.played.to = 'c5'; },
  'removed event': r => { r.events = r.events.filter(e => e.id !== 'symmetrical-pawns'); },
  'wrong status': r => { r.symmetryAnalysis.status = 'no-new-fact'; },
  'wrong selected comment': r => { r.comment = 'invented'; },
};
for (const [name, mutate] of Object.entries(tampers)) test('independent replay rejects: ' + name, () => {
  const [f, r] = proven(), bad = clone(r); mutate(bad);
  assert.throws(() => replay(f, bad));
});
test('independent replay rejects a forged history and a wrong fixture', () => {
  const f = valid.find(x => x.id === 'advance-after-history'), r = run(f);
  assert.throws(() => replay({...f, history: {...f.history, moves: []}}, r));
  const [other] = proven(); assert.throws(() => replay(valid.find(x => x.id === 'four-pawn-advance'), run(other)));
});

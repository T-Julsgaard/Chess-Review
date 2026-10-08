import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: test} = await import('node:test');
const {default: assert} = await import('node:assert/strict');
const {explainMove, reachSteps} = await import('./wedge.mjs');
const {explainMove: parent} = await import('../../E080-pawn-shield-defense/code/shield.mjs');
const {replay, kingSteps} = await import('./replay.mjs');
const {fixtures} = await import('./fixtures.mjs');
const {clone, readFen} = await import('../../FRIEND-shared/lib.mjs');
const {Chess} = await import('../../../../lib/chess.js');

const inputOf = f => ({fen: f.fen, move: f.move, scanReplies: false, ...(f.history ? {history: f.history} : {}),
  ...(f.flag === false ? {} : {wedgeTags: f.flag ?? true}),
  ...(f.limit === undefined ? {} : {maxWedgeNodes: f.limit}), ...(f.extra || {})});
const run = f => explainMove(inputOf(f));
const valid = fixtures.filter(f => !f.inputError);

for (const f of fixtures) test(f.id + ': expected status or refusal', () => {
  if (f.inputError) return assert.throws(() => run(f), e => e.message.includes(f.inputError));
  const result = run(f);
  assert.equal(replay(f, result).state, f.expectedStatus);
  if (f.expectedStatus !== 'proven') assert.ok(!result.events.some(e => e.id === 'pawn-wedge'));
  const {wedgeTags, maxWedgeNodes, ...bare} = inputOf(f);
  assert.deepEqual(result.events.filter(e => e.id !== 'pawn-wedge'), parent(bare).events);
  if (f.flag === false) assert.deepEqual(result, parent(bare));
});

test('colour reflection preserves status for every white fixture', () => {
  for (const f of valid.filter(x => x.id.endsWith('-black'))) {
    const white = valid.find(x => x.id === f.id.slice(0, -6));
    assert.equal(f.expectedStatus, white.expectedStatus);
    assert.equal(run(f).wedgeAnalysis?.status, run(white).wedgeAnalysis?.status);
  }
  assert.ok(valid.some(f => f.id.endsWith('-black') && f.expectedStatus === 'proven'));
});
test('both actors, ranks 5 and 6, one and two denied squares, either support side, capture and advance', () => {
  const w = valid.filter(f => f.expectedStatus === 'proven').map(f => run(f).wedgeAnalysis.witness);
  assert.deepEqual([...new Set(w.map(x => x.actor))].sort(), ['b', 'w']);
  assert.deepEqual([...new Set(w.map(x => x.wedge.relativeRank))].sort(), [5, 6]);
  assert.deepEqual([...new Set(w.map(x => x.king.denied.length))].sort(), [1, 2]);
  assert.ok(w.some(x => x.played.captured) && w.some(x => !x.played.captured));
  assert.ok(w.some(x => x.wedge.supporters.some(s => s[0] < x.wedge.square[0])));
  assert.ok(w.some(x => x.wedge.supporters.some(s => s[0] > x.wedge.square[0])));
});
test('boundary pair: pawn one file closer can reach by capture, two files away cannot', () => {
  const reach = id => run(valid.find(f => f.id === id)).wedgeAnalysis;
  assert.equal(reach('rank5-capture-two-squares').status, 'proven');
  assert.equal(reach('enemy-pawn-reaches-by-capture').status, 'no-new-fact');
  assert.equal(reachSteps('f7', 'd5', 'w'), 1); assert.equal(reachSteps('g7', 'd5', 'w'), null);
  assert.equal(reachSteps('d7', 'e6', 'w'), 0); assert.equal(reachSteps('d6', 'e6', 'w'), null);
});
test('independent king enumeration agrees with the rules engine on every live actual position', () => {
  for (const f of valid.filter(x => !x.history && x.expectedStatus !== 'not-applicable' && x.flag !== false)) {
    const r = run(f); if (!r.after) continue;
    const c = new Chess(r.after); if (c.isGameOver()) continue;
    const engine = [...new Set(c.moves({verbose: true}).filter(m => m.piece === 'k').map(m => m.to))].sort();
    assert.deepEqual(kingSteps(readFen(r.after).board, c.turn()), engine, f.id);
  }
});

const proven = () => { const f = valid.find(x => x.id === 'rank6-left-support-two-squares'); return [f, run(f)]; };
const tampers = {
  'extra denied square': r => { r.wedgeAnalysis.witness.king.denied.push('e7'); },
  'dropped denied square': r => { r.wedgeAnalysis.witness.king.denied.pop(); },
  'altered actual king list': r => { r.wedgeAnalysis.witness.king.actual.pop(); },
  'altered counterfactual list': r => { r.wedgeAnalysis.witness.king.counterfactual.push('a1'); },
  'counterfactual turn changed': r => { r.wedgeAnalysis.witness.king.counterfactualFen = r.wedgeAnalysis.witness.king.counterfactualFen.replace(' b ', ' w '); },
  'removed supporter': r => { r.wedgeAnalysis.witness.wedge.supporters = []; },
  'reach step forged to attackable': r => { r.wedgeAnalysis.witness.reach[0].steps = 1; },
  'dropped reach row': r => { r.wedgeAnalysis.witness.reach.pop(); },
  'wrong relative rank': r => { r.wedgeAnalysis.witness.wedge.relativeRank = 7; },
  'wrong attacks list': r => { r.wedgeAnalysis.witness.wedge.attacks = ['d7']; },
  'wrong wedge square': r => { r.wedgeAnalysis.witness.wedge.square = 'e5'; },
  'recoloured pawn in after FEN': r => { const w = r.wedgeAnalysis.witness; w.after.fen = w.after.fen.replace('P', 'p'); },
  'edited text': r => { r.events.at(-1).text = r.events.at(-1).text.replace('d7 and f7', 'd7'); },
  'edited evidence copy': r => { r.events.at(-1).evidence.actor = 'b'; },
  'quality claim': r => { r.events.at(-1).qualityClaim = true; },
  'wrong budget units': r => { r.wedgeAnalysis.nodes += 1; },
  'wrong limit': r => { r.wedgeAnalysis.limit = 10; },
  'illegal played move': r => { r.wedgeAnalysis.witness.played.to = 'e7'; },
  'removed event': r => { r.events = r.events.filter(e => e.id !== 'pawn-wedge'); },
  'wrong status': r => { r.wedgeAnalysis.status = 'no-new-fact'; },
  'wrong selected comment': r => { r.comment = 'invented'; },
};
for (const [name, mutate] of Object.entries(tampers)) test('independent replay rejects: ' + name, () => {
  const [f, r] = proven(), bad = clone(r); mutate(bad);
  assert.throws(() => replay(f, bad));
});
test('independent replay rejects a forged history and a wrong fixture', () => {
  const f = valid.find(x => x.id === 'rank6-after-history'), r = run(f);
  assert.throws(() => replay({...f, history: {...f.history, moves: []}}, r));
  const [other] = proven(); assert.throws(() => replay(valid.find(x => x.id === 'rank6-right-support-two-squares'), run(other)));
});

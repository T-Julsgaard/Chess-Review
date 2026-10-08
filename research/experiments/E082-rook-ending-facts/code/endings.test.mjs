import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: assert} = await import('node:assert/strict');
const {test} = await import('node:test');
const {explainMove} = await import('./endings.mjs');
const {replayResult} = await import('./replay.mjs');
const {fixtures, reflect, side, fourThree} = await import('./fixtures.mjs');
const {explainMove: parent} = await import('../../E081-direct-attacks/code/attacks.mjs');
const {readFile} = await import('node:fs/promises');
const {gunzipSync} = await import('node:zlib');
const {sha256} = await import('../../../data-policy.mjs');
const {replay: replayOldMaterial} = await import('../../FRIEND-01-four-versus-three/code/replay.mjs');
for (const f of fixtures.flatMap(f => [f, reflect(f)])) test(f.id, () => {
  if (f.inputError) { assert.throws(() => explainMove(f), new RegExp(f.inputError)); return; }
  const result = explainMove(f), replay = replayResult(f, result);
  assert.equal(replay.state, f.expectedStatus);
  for (const id of f.expected) assert.ok(result.events.some(e => e.id === id));
  for (const e of result.events.filter(e => ['side-check-proof', 'rook-four-three', 'rook-three-two'].includes(e.id))) {
    assert.equal(e.qualityClaim, false); assert.ok(e.text.split(/\s+/).length <= 24);
  }
  if (f.id.startsWith('capturable-side-check')) assert.ok(result.rookEndingAnalysis.witness.side.replies.some(r => r.captured === 'r'));
  if (f.reusedSide) {
    const index = result.rookEndingAnalysis.witness.side.reuseIndex;
    assert.ok(index >= 0); assert.equal(result.events[index].id, 'side-rook-check');
    assert.equal(result.events.some(e => e.id === 'side-check-proof'), false);
    assert.deepEqual(result.events, parent(f).events);
  }
});
test('retained FRIEND-01 proof bytes and inputs authenticate covered same-wing observations before reuse', async () => {
  const base = 'research/experiments/FRIEND-01-four-versus-three/evidence';
  const run = JSON.parse(await readFile(base + '/run.json', 'utf8')), packed = await readFile(base + '/results.json.gz');
  assert.equal(sha256(packed), run.outputHashes['results.json.gz']);
  const raw = gunzipSync(packed); assert.equal(sha256(raw), run.uncompressedSha256['results.json']);
  for (const [file, hash] of Object.entries(run.inputHashes)) assert.equal(sha256(file.endsWith('.gz') ? await readFile(file)
    : (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')), hash, file);
  let count = 0;
  for (const row of JSON.parse(raw).rows) if (!row.error && row.state === 'proven') {
    assert.equal(replayOldMaterial(row.fixture, row.result).state, 'proven');
    const {fourThreeTags, maxFourThreeNodes, ...rest} = row.fixture;
    const f = {...rest, rookEndingTags: true}, result = explainMove(f);
    assert.equal(replayResult(f, result).state, 'proven'); assert.ok(result.events.some(e => e.id === 'rook-four-three'));
    assert.notEqual(result.rookEndingAnalysis.witness.after.wing, 'split'); count++;
  }
  assert.equal(count, 22);
});
test('strict options, exact parent compatibility and atomic boundaries for each certificate', () => {
  for (const value of [null, 1, 'true']) assert.throws(() => explainMove({...side, rookEndingTags: value}), /boolean/);
  for (const value of [null, -1, .5, 50001]) assert.throws(() => explainMove({...side, maxRookEndingNodes: value}), /integer/);
  assert.deepEqual(explainMove({...side, rookEndingTags: false, maxRookEndingNodes: null}), parent(side));
  for (const f of [side, fourThree]) {
    const complete = explainMove(f), nodes = complete.rookEndingAnalysis.nodes;
    const exact = {...f, maxRookEndingNodes: nodes}, short = {...f, maxRookEndingNodes: nodes - 1};
    assert.equal(replayResult(exact, explainMove(exact)).state, 'proven');
    const refusal = explainMove(short); assert.equal(replayResult(short, refusal).state, 'exhausted');
    assert.equal(refusal.rookEndingAnalysis.witness, null); assert.deepEqual(refusal.events, parent(f).events);
    assert.equal(refusal.comment, parent(f).comment);
  }
});
test('saved witness replay rejects missing evasion, pawn count and exaggerated teaching', () => {
  for (const [f, alter] of [[side, r => r.rookEndingAnalysis.witness.side.replies.pop()],
    [fourThree, r => { r.rookEndingAnalysis.witness.after.counts.w = 5; }],
    [side, r => { r.events.at(-1).qualityClaim = true; }],
    [fourThree, r => { r.comment = 'This rook ending wins easily.'; }]]) {
    const forged = structuredClone(explainMove(f)); alter(forged); assert.throws(() => replayResult(f, forged));
  }
});

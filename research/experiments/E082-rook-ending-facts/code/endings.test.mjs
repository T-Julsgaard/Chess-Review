import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {default: assert} = await import('node:assert/strict');
const {test} = await import('node:test');
const {explainMove, priority} = await import('./endings.mjs');
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
  for (const id of f.absent || []) assert.equal(result.events.some(e => e.id === id), false);
  for (const e of result.events.filter(e => ['side-check-proof', 'rook-four-three', 'rook-three-two'].includes(e.id))) {
    assert.equal(e.qualityClaim, false); assert.ok(e.text.split(/\s+/).length <= 24);
  }
  if (f.id.startsWith('capturable-side-check')) assert.ok(result.rookEndingAnalysis.witness.side.replies.some(r => r.captured === 'r'));
  if (f.id.startsWith('four-promotion-interpositions')) {
    const replies = result.rookEndingAnalysis.witness.side.replies;
    const promotions = replies.filter(r => r.promotion);
    assert.equal(promotions.length, 8);
    for (const captures of [false, true]) assert.deepEqual(promotions.filter(r => Boolean(r.captured) === captures)
      .map(r => r.promotion).sort(), ['b', 'n', 'q', 'r']);
    for (const reply of replies.filter(r => r.promotion)) assert.equal(reply.terminal, false);
  }
  if (f.reusedSide) {
    const index = result.rookEndingAnalysis.witness.side.reuseIndex;
    assert.ok(index >= 0); assert.equal(result.events[index].id, 'side-rook-check');
    assert.equal(result.events.some(e => e.id === 'side-check-proof'), false);
    assert.deepEqual(result.events, parent(f).events);
  }
});

test('complete evidence rejects forged inventories, rays, histories, transitions and event selection', () => {
  const mutations = [
    ['actor', w => { w.actor = 'b'; }],
    ['inventory omission', w => w.after.pieces.pop()],
    ['inventory color', w => { w.after.pieces[0].color = 'b'; }],
    ['before composition', w => { w.before.rookEnding = !w.before.rookEnding; }],
    ['pawn list', w => w.after.pawns.w.pop()],
    ['rook identity', w => { w.after.rooks[0].square = 'h4'; }],
    ['king identity', w => { w.after.kings[0].square = 'h4'; }],
    ['wing', w => { w.after.wing = 'a-d'; }],
    ['files', w => w.after.files.pop()],
    ['count predicate', w => { w.after.fourThree = false; }],
    ['category', w => w.categories.push('three-two')],
    ['legal move set', w => w.legalMoves.pop()],
    ['played capture', w => { w.played.captured = 'q'; }],
    ['played EP flag', w => { w.played.flags = 'e'; }],
    ['played promotion', w => { w.played.promotion = 'q'; }],
    ['played FEN', w => { w.after.fen = w.before.fen; }],
    ['history', w => { w.history = {fen: w.before.fen, moves: ['a1h8']}; }]
  ];
  for (const [name, mutate] of mutations) {
    const forged = structuredClone(explainMove(fourThree)); mutate(forged.rookEndingAnalysis.witness);
    assert.throws(() => replayResult(fourThree, forged), undefined, name);
  }
  const sideMutations = [
    ['ray omission', s => s.cells.pop()], ['blocked ray', s => { s.cells[0].piece = {type: 'p', color: 'b'}; }],
    ['checker omission', s => s.checkers.pop()], ['checker identity', s => { s.checker.square = 'h7'; }],
    ['checked king', s => { s.king.square = 'h7'; }], ['reuse index', s => { s.reuseIndex = 0; }],
    ['missing evasion', s => s.replies.pop()], ['illegal evasion', s => { s.replies[0].uci = 'a1h8'; }],
    ['reply FEN', s => { s.replies[0].fen = side.fen; }], ['reply flags', s => { s.replies[0].flags = 'e'; }],
    ['reply promotion', s => { s.replies[0].promotion = 'q'; }], ['reply terminal', s => { s.replies[0].terminal = !s.replies[0].terminal; }],
    ['reply draw', s => { s.replies[0].draw = !s.replies[0].draw; }], ['reply check', s => { s.replies[0].check = !s.replies[0].check; }]
  ];
  for (const [name, mutate] of sideMutations) {
    const forged = structuredClone(explainMove(side)); mutate(forged.rookEndingAnalysis.witness.side);
    assert.throws(() => replayResult(side, forged), undefined, name);
  }
  for (const mutate of [r => { r.rookEndingAnalysis.nodes--; }, r => { r.rookEndingAnalysis.limit--; },
    r => { r.events.at(-1).text = 'This guarantees a draw.'; }, r => r.events.pop(),
    r => { r.comment = 'This is a winning side check.'; }]) {
    const forged = structuredClone(explainMove(side)); mutate(forged); assert.throws(() => replayResult(side, forged));
  }
  const reused = fixtures.find(f => f.reusedSide), forged = structuredClone(explainMove(reused));
  forged.rookEndingAnalysis.witness.side.reuseIndex = -1; assert.throws(() => replayResult(reused, forged));
});

test('multiple categories and reused checks preserve atomic budgets and highest-priority teaching', () => {
  for (const f of [fixtures.find(f => f.id === 'side-and-four-three'), fixtures.find(f => f.reusedSide),
    fixtures.find(f => f.id === 'capturable-side-and-four-three')]) {
    const complete = explainMove(f), nodes = complete.rookEndingAnalysis.nodes;
    assert.equal(replayResult({...f, maxRookEndingNodes: nodes}, explainMove({...f, maxRookEndingNodes: nodes})).state, 'proven');
    for (const limit of [0, 1, nodes - 2, nodes - 1]) {
      const short = {...f, maxRookEndingNodes: limit}, refusal = explainMove(short);
      assert.equal(replayResult(short, refusal).state, 'exhausted');
      assert.deepEqual(refusal.events, parent(f).events); assert.equal(refusal.comment, parent(f).comment);
      assert.equal(refusal.rookEndingAnalysis.witness, null);
    }
    assert.equal(complete.comment, [...complete.events].sort((a, b) => priority(b) - priority(a))[0].text);
  }
  const multiple = explainMove(fixtures.find(f => f.id === 'side-and-four-three'));
  assert.equal(multiple.events.find(e => e.text === multiple.comment).id, 'side-check-proof');
  const warning = explainMove(fixtures.find(f => f.id === 'capturable-side-and-four-three'));
  assert.equal(warning.events.find(e => e.text === warning.comment).id, 'hanging-piece');
  const material = explainMove(fixtures.find(f => f.id === 'split-wing-4-3'));
  assert.equal(material.events.find(e => e.text === material.comment).id, 'rook-four-three');
});

test('candidate tracker advances only registered occurrences and preview distinguishes terminal positions', async () => {
  const {renderStatus} = await import('./status.mjs');
  const {renderStatus: parentStatus} = await import('../../E081-direct-attacks/code/status.mjs');
  const {renderDemo} = await import('./display.mjs');
  const list = await readFile('research/experiments/E020-coach-concepts/CONCEPTS.md', 'utf8');
  const report = {fixtures: 5456 + fixtures.length * 2};
  const rows = value => new Map([...value.matchAll(/^- .* (C\d{4}) \*\*.*$/gm)].map(r => [r[1], r[0]]));
  const before = rows(parentStatus(list, report)), after = rows(renderStatus(list, report));
  let unchanged = 0;
  for (const [id, row] of before) if (!['C0665', 'C0681', 'C0682'].includes(id)) {
    assert.equal(after.get(id), row, id); unchanged++;
  }
  assert.equal(unchanged, 1082);
  for (const id of ['C0665', 'C0681', 'C0682']) assert.ok(after.get(id).startsWith('- [x]'));
  const root = fixtures.find(f => f.id === 'guard-foundation-root-mate'), actual = fixtures.find(f => f.id === 'guard-actual-mate');
  const html = renderDemo([root, actual, fourThree, side].map(fixture => ({fixture, result: explainMove(fixture)})));
  assert.ok(html.includes('rook-ending')); assert.ok(html.includes('Four versus three:'));
  assert.equal((html.match(/<h3>Input position<\/h3>/g) || []).length, 4);
  assert.equal((html.match(/<h3>Played position<\/h3>/g) || []).length, 3);
  assert.ok(html.includes('no winning, drawing, safety or move-quality claim'));
});

test('lossless proof storage still rejects semantic forgery after content hashes are recomputed', async () => {
  const {packReport} = await import('../../E079-central-king-support/code/pool.mjs');
  const {unpackReport} = await import('../../E079-central-king-support/code/saved.mjs');
  const report = {results: [{fixture: side, result: explainMove(side)}]};
  const roundtrip = unpackReport(JSON.parse(JSON.stringify(packReport(report))));
  assert.deepEqual(roundtrip, JSON.parse(JSON.stringify(report)));
  assert.equal(replayResult(roundtrip.results[0].fixture, roundtrip.results[0].result).state, 'proven');
  const changed = structuredClone(report); changed.results[0].result.rookEndingAnalysis.witness.side.replies.pop();
  const json = JSON.stringify(packReport(changed)), recomputedHash = sha256(json);
  assert.equal(sha256(json), recomputedHash);
  const forged = unpackReport(JSON.parse(json));
  assert.throws(() => replayResult(forged.results[0].fixture, forged.results[0].result));
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

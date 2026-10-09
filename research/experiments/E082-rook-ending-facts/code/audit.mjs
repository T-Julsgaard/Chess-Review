import {openResearchData, sha256} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {readFile, readdir, stat} = await import('node:fs/promises');
const {default: assert} = await import('node:assert/strict');
const {unpackReport} = await import('../../E079-central-king-support/code/saved.mjs');
const {replayResult} = await import('./replay.mjs');
const {fixtures, reflect} = await import('./fixtures.mjs');
const dir = process.argv[2] || 'research/experiments/E082-rook-ending-facts/evidence';
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const run = await json(dir + '/run.json'), report = unpackReport(await json(dir + '/results.json'));
for (const [file, hash] of Object.entries(run.inputHashes)) assert.equal(sha256(file.endsWith('.gz') ? await readFile(file)
  : (await readFile(file, 'utf8')).replaceAll('\r\n', '\n')), hash, file);
for (const [file, hash] of Object.entries(run.outputHashes)) assert.equal(sha256(await readFile(dir + '/' + file)), hash, file);
const priorDir = 'research/experiments/E081-direct-attacks/evidence';
const prior = unpackReport(await json(priorDir + '/results.json')), priorRun = await json(priorDir + '/run.json');
const inherited = [...prior.results.map(row => [row.fixture.id, sha256(JSON.stringify(row.result || {error: row.error}))]),
  ...prior.baselineResults.map(row => [row.fixture, row.fullResultHash])];
assert.equal(inherited.length, 5456);
const core = run.evaluationRole === 'exposed synthetic core pilot; not canonical acceptance';
assert.deepEqual(report.baselineResults.map(row => [row.fixture, row.fullResultHash]), core ? [] : inherited);
assert.equal(report.baselineCases, core ? 0 : 5456);
const list = 'research/experiments/E020-coach-concepts/CONCEPTS.md';
assert.equal(run.inputHashes[list], priorRun.inputHashes[list]);
assert.deepEqual(report.results.map(row => row.fixture), JSON.parse(JSON.stringify(fixtures.flatMap(f => [f, reflect(f)]))));
let errors = 0, certificates = 0, replies = 0; const states = {}, categories = {w: new Set(), b: new Set()};
for (const row of report.results) {
  if (row.error) {
    assert.ok(row.fixture.inputError && row.error.includes(row.fixture.inputError), row.fixture.id); errors++; continue;
  }
  const checked = replayResult(row.fixture, row.result);
  assert.equal(checked.state, row.fixture.expectedStatus);
  states[checked.state] = (states[checked.state] || 0) + 1;
  certificates += checked.certificates; replies += checked.replies;
  const witness = row.result.rookEndingAnalysis?.witness;
  if (witness) for (const category of witness.categories) categories[witness.actor].add(category);
  for (const id of row.fixture.expected || []) assert.ok(row.result.events.some(e => e.id === id));
  for (const id of row.fixture.absent || []) assert.equal(row.result.events.some(e => e.id === id), false);
  for (const e of row.result.events.filter(e => ['side-check-proof', 'rook-four-three', 'rook-three-two'].includes(e.id))) {
    assert.equal(e.qualityClaim, false); assert.ok(e.text.split(/\s+/).length <= 24);
  }
  if (row.fixture.reusedSide) {
    assert.ok(witness.side.reuseIndex >= 0);
    assert.equal(row.result.events[witness.side.reuseIndex].id, 'side-rook-check');
    assert.equal(row.result.events.some(e => e.id === 'side-check-proof'), false);
  }
}
for (const actor of ['w', 'b']) assert.deepEqual([...categories[actor]].sort(), ['four-three', 'side-check', 'three-two']);
assert.equal(certificates, run.metrics.rookEndingCertificates); assert.equal(replies, run.metrics.rookEndingReplies);
assert.equal(report.results.length, fixtures.length * 2);
const rows = text => new Map([...text.matchAll(/^- .* (C\d{4}) \*\*.*$/gm)].map(row => [row[1], row[0]]));
const before = rows(await readFile(priorDir + '/concept-status.md', 'utf8')), after = rows(await readFile(dir + '/concept-status.md', 'utf8'));
let unchanged = 0;
for (const [id, row] of before) if (!['C0665', 'C0681', 'C0682'].includes(id)) { assert.equal(after.get(id), row, id); unchanged++; }
assert.equal(unchanged, 1082); for (const id of ['C0665', 'C0681', 'C0682']) assert.ok(after.get(id).startsWith('- [x]'));
let bytes = 0; for (const file of await readdir(dir)) bytes += (await stat(dir + '/' + file)).size;
console.log(JSON.stringify({passed: true, revision: run.codeRevision, cases: report.fixtures, newCases: report.results.length,
  inherited: core ? 0 : 5456, certificates, replies, errors, states, unchangedOccurrences: unchanged,
  inputCount: Object.keys(run.inputHashes).length, bytes, elapsedMs: Math.round(run.elapsedMs)}, null, 2));

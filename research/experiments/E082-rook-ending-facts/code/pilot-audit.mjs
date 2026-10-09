import {openResearchData, sha256} from '../../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {readFile} = await import('node:fs/promises');
const {default: assert} = await import('node:assert/strict');
const {replayResult} = await import('./replay.mjs');
const {explainMove} = await import('./endings.mjs');
const {fixtures, reflect} = await import('./fixtures.mjs');
const file = process.argv[2]; assert.ok(file?.startsWith('research/runs/E082/'));
const raw = await readFile(file), report = JSON.parse(raw);
for (const [name, hash] of Object.entries(report.inputHashes)) assert.equal(sha256(name.endsWith('.gz') ? await readFile(name)
  : (await readFile(name, 'utf8')).replaceAll('\r\n', '\n')), hash, name);
assert.deepEqual(report.rows.map(row => row.fixture), JSON.parse(JSON.stringify(fixtures.flatMap(f => [f, reflect(f)]))));
let errors = 0, certificates = 0; const states = {};
for (const row of report.rows) {
  if (row.error) { assert.throws(() => explainMove(row.fixture), new RegExp(row.fixture.inputError)); errors++; continue; }
  const replay = replayResult(row.fixture, row.result); assert.deepEqual(replay, row.replay);
  assert.equal(replay.state, row.fixture.expectedStatus); certificates += replay.certificates;
  states[replay.state] = (states[replay.state] || 0) + 1;
}
assert.equal(errors, report.errors); assert.equal(certificates, report.certificates); assert.deepEqual(states, report.states);
console.log(JSON.stringify({passed: true, rows: report.rows.length, errors, certificates, states,
  inputs: Object.keys(report.inputHashes).length, hash: sha256(raw)}, null, 2));

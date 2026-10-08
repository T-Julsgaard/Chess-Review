import {openResearchData, sha256} from '../../../data-policy.mjs';
const data = await openResearchData(['D001'], {purpose: 'test'});
const {readFile, writeFile, mkdir} = await import('node:fs/promises');
const {execFileSync} = await import('node:child_process');
const {default: assert} = await import('node:assert/strict');
const {fixtures, reflect} = await import('./fixtures.mjs');
const {explainMove} = await import('./shield.mjs');
const {replayResult} = await import('./replay.mjs');
const base = 'research/experiments/E080-pawn-shield-defense';
const prior = JSON.parse(await readFile('research/experiments/E079-central-king-support/evidence/run.json', 'utf8'));
const inputs = [...new Set([...Object.keys(prior.inputHashes),
  ...['shield.mjs', 'fixtures.mjs', 'replay.mjs', 'shield.test.mjs', 'pilot.mjs'].map(f => base + '/code/' + f),
  base + '/PLAN.md'])];
const inputHashes = {};
for (const file of inputs) inputHashes[file] = sha256(file.endsWith('.gz') ? await readFile(file)
  : (await readFile(file, 'utf8')).replaceAll('\r\n', '\n'));
const codeRevision = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const started = performance.now(), rows = [], states = {}, counts = {errors: 0, certificates: 0, replies: 0, leaves: 0};
for (const fixture of fixtures.flatMap(f => [f, reflect(f)])) {
  if (fixture.inputError) {
    let error;
    try { explainMove(fixture); } catch (e) { error = e.message; }
    assert.ok(error?.includes(fixture.expectedError), fixture.id + ': expected refusal');
    rows.push({fixture, error}); counts.errors++; continue;
  }
  const result = explainMove(fixture), checked = replayResult(fixture, result);
  assert.equal(checked.state, fixture.expectedStatus || 'proven', fixture.id);
  states[checked.state] = (states[checked.state] || 0) + 1;
  for (const key of ['certificates', 'replies', 'leaves']) counts[key] += checked[key];
  rows.push({fixture, result, replay: checked});
}
const report = {role: 'exposed guarded development pilot; not canonical acceptance', codeRevision,
  eligibilityReceipt: data.receipt, inputHashes, rows, states, ...counts,
  elapsedMs: Math.round(performance.now() - started)};
const json = JSON.stringify(report, null, 2) + '\n', out = 'research/runs/E080/pilot';
await mkdir(out, {recursive: true}); await writeFile(out + '/results.json', json);
console.log(JSON.stringify({passed: true, role: report.role, codeRevision, cases: rows.length,
  states, ...counts, bytes: Buffer.byteLength(json), hash: sha256(json), elapsedMs: report.elapsedMs, out}, null, 2));

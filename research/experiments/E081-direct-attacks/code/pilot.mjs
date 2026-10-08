import {openResearchData, sha256} from '../../../data-policy.mjs';
const data = await openResearchData(['D001'], {purpose: 'test'});
const {readFile, writeFile, mkdir} = await import('node:fs/promises');
const {execFileSync} = await import('node:child_process');
const {default: assert} = await import('node:assert/strict');
const {fixtures, reflect} = await import('./fixtures.mjs');
const {explainMove} = await import('./attacks.mjs');
const {replayResult} = await import('./replay.mjs');
const base = 'research/experiments/E081-direct-attacks';
const prior = JSON.parse(await readFile('research/experiments/E080-pawn-shield-defense/evidence/run.json', 'utf8'));
const inputs = [...new Set([...Object.keys(prior.inputHashes), base + '/PLAN.md',
  ...['attacks.mjs', 'replay.mjs', 'fixtures.mjs', 'attacks.test.mjs', 'pilot.mjs'].map(f => base + '/code/' + f)])];
const inputHashes = {};
for (const file of inputs) inputHashes[file] = sha256(file.endsWith('.gz') ? await readFile(file)
  : (await readFile(file, 'utf8')).replaceAll('\r\n', '\n'));
const started = performance.now(), rows = [], states = {}; let errors = 0, certificates = 0;
for (const fixture of fixtures.flatMap(f => [f, reflect(f)])) {
  if (fixture.inputError) {
    let error; try { explainMove(fixture); } catch (e) { error = e.message; }
    assert.ok(error?.includes(fixture.expectedError), fixture.id);
    rows.push({fixture, error}); errors++; continue;
  }
  const result = explainMove(fixture), replay = replayResult(fixture, result);
  assert.equal(replay.state, fixture.expectedStatus, fixture.id);
  for (const id of fixture.expected) assert.ok(result.events.some(e => e.id === id));
  states[replay.state] = (states[replay.state] || 0) + 1; certificates += replay.certificates;
  rows.push({fixture, result, replay});
}
const report = {role: 'exposed synthetic development pilot, not canonical acceptance',
  codeRevision: execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim(),
  workingTreeStatus: execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim(),
  eligibilityReceipt: data.receipt, inputHashes, rows, states, errors, certificates,
  elapsedMs: Math.round(performance.now() - started)};
const out = 'research/runs/E081/pilot';
const json = JSON.stringify(report, null, 2) + '\n';
await mkdir(out, {recursive: true}); await writeFile(out + '/results.json', json);
console.log(JSON.stringify({passed: true, cases: rows.length, states, errors, certificates,
  elapsedMs: report.elapsedMs, bytes: Buffer.byteLength(json), hash: sha256(json), out}, null, 2));

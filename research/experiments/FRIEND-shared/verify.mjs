// Usage: node research/experiments/FRIEND-shared/verify.mjs <study-dir> <frozen-revision> <clean-run-dir>
// Compares main/repeat/clean run records and re-checks every SAVED result with the
// study's independent replay, without calling the detector.
import {openResearchData, sha256} from '../../data-policy.mjs';
await openResearchData(['D001'], {purpose: 'test'});
const {readFile, writeFile, readdir, stat} = await import('node:fs/promises');
const {gunzipSync} = await import('node:zlib');
const {default: assert} = await import('node:assert/strict');
const {pathToFileURL} = await import('node:url');
const path = await import('node:path');
const {repoRoot} = await import('./lib.mjs');
const [study, revision, cleanDir] = process.argv.slice(2);
const base = path.join(repoRoot, 'research/experiments', study, 'evidence');
const dirs = [base, path.join(repoRoot, 'research/runs', study.split('-').slice(0, 2).join('-'), 'repeat'), cleanDir];
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const runs = await Promise.all(dirs.map(d => json(path.join(d, 'run.json'))));
const main = runs[0];
assert.equal(main.codeRevision, revision);
assert.equal(runs[2].workingTreeStatus, '');
for (const r of runs) {
  assert.equal(r.workingTreeStatus, r === runs[2] ? '' : r.workingTreeStatus);
  for (const f of ['codeRevision', 'inputHashes', 'outputHashes', 'uncompressedSha256', 'metrics', 'environment', 'config', 'eligibilityReceipt']) {
    assert.deepEqual(r[f], main[f], f);
  }
}
for (const [file, hash] of Object.entries(main.inputHashes)) {
  const bytes = await readFile(path.join(repoRoot, file));
  assert.equal(sha256(file.endsWith('.gz') ? bytes : bytes.toString('utf8').replaceAll('\r\n', '\n')), hash, file);
}
let rows;
for (let i = 0; i < 3; i++) {
  const packed = await readFile(path.join(dirs[i], 'results.json.gz'));
  assert.equal(sha256(packed), main.outputHashes['results.json.gz'], dirs[i]);
  const raw = gunzipSync(packed);
  assert.equal(sha256(raw), main.uncompressedSha256['results.json']);
  if (i === 0) rows = JSON.parse(raw.toString()).rows;
}
const {replay} = await import(pathToFileURL(path.join(repoRoot, 'research/experiments', study, 'code/replay.mjs')));
let replayed = 0, errors = 0;
for (const row of rows) {
  assert.ok(row.ok, 'saved row failed: ' + row.id);
  if (row.error) { assert.ok(row.fixture.inputError && row.error.includes(row.fixture.inputError)); errors++; continue; }
  assert.equal(replay(row.fixture, row.result).state, row.fixture.expectedStatus, row.id);
  replayed++;
}
await writeFile(path.join(base, 'repeat-run.json'), JSON.stringify(runs[1], null, 2) + '\n');
await writeFile(path.join(base, 'clean-run.json'), JSON.stringify(runs[2], null, 2) + '\n');
let bytes = 0; for (const f of await readdir(base)) bytes += (await stat(path.join(base, f))).size;
console.log(JSON.stringify({threeExactRuns: true, revision, inputs: Object.keys(main.inputHashes).length,
  savedRowsReplayed: replayed, expectedInputErrors: errors, evidenceBytes: bytes,
  elapsedMs: runs.map(r => Math.round(r.elapsedMs)), outputHashes: main.outputHashes,
  uncompressedSha256: main.uncompressedSha256}, null, 2));

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
await openResearchData(['D001'],{purpose:'test'});
const dir = process.argv[2] || 'research/experiments/E135-lucena-rook-bridges/evidence';
const packed = await readFile(dir+'/results.json.gz'),run = JSON.parse(await readFile(dir+'/run.json','utf8'));
const plain = gunzipSync(packed),report = JSON.parse(plain);
assert.equal(sha256(packed),run.outputHashes['results.json.gz']); assert.equal(sha256(plain),run.uncompressedSha256);
assert.equal(packed.length,run.compressedBytes); assert.equal(plain.length,run.uncompressedBytes);
assert.equal(report.revision,run.sourceRevision); assert.deepEqual(report.inputHashes,run.inputHashes);
assert.deepEqual(report.environment,run.environment); assert.deepEqual(report.command,run.command);
assert.equal(report.engine,null); assert.equal(report.seed,null); assert.equal(run.engine,null); assert.equal(run.seed,null);
assert.ok(report.environment.node && report.environment.platform && report.environment.arch);
assert.equal(report.rows.length,fixtures.length); assert.equal(run.cases,fixtures.length);
for (const [name,hash] of Object.entries(run.inputHashes)) assert.equal(sha256((await readFile(name,'utf8')).replaceAll('\r\n','\n')),hash,'Changed source '+name);
let witnesses = 0,positive = 0;
for (const [i,row] of report.rows.entries()) {
  const f = fixtures[i];
  assert.deepEqual(row.fixture,JSON.parse(JSON.stringify(f)));
  if (f.inputError) { assert.equal(row.error,f.inputError); assert.equal(row.result,undefined); continue; }
  assert.equal(row.error,undefined); const r = row.result,a = r.rookBridgeAnalysis;
  assert.deepEqual(row.fixture,JSON.parse(JSON.stringify(f)));
  assert.equal(a.limit,f.maxRookBridgeNodes ?? 50000);
  assert.ok(a.nodes >= 0 && a.nodes <= a.limit+1);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E135').map(e => e.id),f.expected);
  if (f.id.startsWith('zero-budget') || f.id.startsWith('atomic-budget')) {
    assert.equal(a.status,'exhausted'); assert.equal(a.witness,null);
  }
  if (f.expected.length) assert.equal(a.status,'proven');
  if (a.witness) { checkWitness(a.witness,r,f); witnesses++; }
  positive += a.status === 'proven';
}
console.log(JSON.stringify({passed:true,cases:fixtures.length,witnesses,positive,sourceInputs:Object.keys(run.inputHashes).length,
  compressedBytes:packed.length,plainBytes:plain.length}));

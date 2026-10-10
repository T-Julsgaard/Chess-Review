import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export async function forcingArchive(){
  const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E143-forcing-tempo-initiative',runBytes=await readFile(dir+'/evidence/run.json'),run=JSON.parse(runBytes),bytes=await readFile(dir+'/evidence/results.json.gz'),plain=gunzipSync(bytes),report=JSON.parse(plain);
  assert.equal(sha256(bytes),run.outputHashes['results.json.gz']);assert.equal(sha256(plain),run.uncompressedSha256);assert.deepEqual(report.eligibilityReceipt,data.receipt);assert.deepEqual(report.inputHashes,run.inputHashes);assert.deepEqual(await bindings(Object.keys(run.inputHashes)),run.inputHashes);assert.equal(run.engine,null);assert.equal(run.seed,null);assert.equal(report.rows.length,12);assert.equal(run.cases,12);
  return{receipt:data.receipt,rows:report.rows,locator:{results:dir+'/evidence/results.json.gz',resultsSha256:sha256(bytes),run:dir+'/evidence/run.json',runSha256:sha256(runBytes)}};
}

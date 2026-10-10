import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {treeKey} from './fixtures.mjs';
export const dir='research/experiments/E180-position-texture-forcing';
export async function quietArchive(){
  const data=await openResearchData(['D001'],{purpose:'test'}),bytes=await readFile(dir+'/evidence/observations.json.gz'),report=JSON.parse(gunzipSync(bytes)),runBytes=await readFile(dir+'/evidence/collection-finish.json'),run=JSON.parse(runBytes);
  assert.equal(report.schema,'E180-quiet-trees-v1');assert.equal(sha256(bytes),run.outputs.observations);assert.deepEqual(report.datasetReceipt,data.receipt);assert.deepEqual(run.datasetReceipt,data.receipt);assert.deepEqual(report.sourceHashes,run.sourceHashes);assert.deepEqual(await bindings(Object.keys(report.sourceHashes)),report.sourceHashes);assert.equal(report.rows.length,12);assert.equal(run.cases,12);
  return{rows:report.rows,receipt:data.receipt,report,locator:{path:dir+'/evidence/observations.json.gz',sha256:sha256(bytes),run:dir+'/evidence/collection-finish.json',runSha256:sha256(runBytes)}};
}
export function graphFor(f,rows){return rows.find(r=>JSON.stringify(r.key)===JSON.stringify(treeKey(f)))?.graph;}

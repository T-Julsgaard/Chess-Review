import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const origins={conversion:'research/experiments/E155-recorded-advantage-conversion',hunt:'research/experiments/E164-king-hunt-shelter'};
export const selectedHunt=[0,1,2,3,4,5,14,15,16,17];
export async function archive(source){
 assert.ok(Object.hasOwn(origins,source));const data=await openResearchData(['D001'],{purpose:'test'}),dir=origins[source],runBytes=await readFile(dir+'/evidence/run.json'),run=JSON.parse(runBytes),bytes=await readFile(dir+'/evidence/results.json.gz'),plain=gunzipSync(bytes),report=JSON.parse(plain),rawBytes=await readFile(dir+'/evidence/observations.json.gz'),raw=JSON.parse(gunzipSync(rawBytes)),hashes=run.inputHashes||run.sourceHashes;
 assert.equal(sha256(bytes),run.outputHashes?.['results.json.gz']||run.outputs.results);assert.equal(sha256(rawBytes),run.outputHashes?.['observations.json.gz']||run.outputs.observations);assert.deepEqual(await bindings(Object.keys(hashes)),hashes);assert.deepEqual(await bindings(Object.keys(raw.sourceHashes)),raw.sourceHashes);assert.equal(run.engine,null);assert.equal(run.seed,null);assert.equal(report.rows.length,run.cases);
 if(source==='conversion'){
  assert.equal(sha256(plain),run.uncompressedSha256);assert.deepEqual(report.eligibilityReceipt,data.receipt);assert.deepEqual(raw.eligibilityReceipt,data.receipt);assert.deepEqual(report.inputHashes,hashes);
  for(const r of report.rows){const w=r.result.conversionAnalysis.witness;if(!w)continue;const found=raw.rows.find(r=>r.key.fen===w.context.fen&&r.key.move===w.context.move&&r.key.retrogradeCalculationPlies===w.context.retrogradeCalculationPlies&&JSON.stringify(r.key.history)===JSON.stringify(w.context.history));assert.ok(found);assert.deepEqual(found.graph,w.graph);}
 }else{
  assert.deepEqual(run.datasetReceipt,data.receipt);const oldBytes=await readFile(dir+'/evidence/'+run.bindingRefresh.originalExecutionRecord);assert.equal(sha256(oldBytes),run.bindingRefresh.originalExecutionSha256);const old=JSON.parse(gunzipSync(oldBytes));assert.deepEqual(old.outputs,run.outputs);assert.deepEqual(old.datasetReceipt,run.datasetReceipt);assert.equal(run.bindingRefresh.freshCollection,false);
  const changed=Object.keys(hashes).filter(p=>old.sourceHashes[p]!==hashes[p]).sort();assert.deepEqual(changed,[dir+'/EXPOSURE.md',dir+'/code/king.test.mjs',dir+'/plan.md'].sort());
  for(const r of report.rows){const w=r.result.kingChaseAnalysis.witness;if(!w)continue;const found=raw.rows.find(rawRow=>rawRow.panel.before===w.panel.before&&JSON.stringify(rawRow.panel.history)===JSON.stringify(w.panel.history)&&rawRow.panel.plies===w.panel.plies);assert.ok(found);assert.deepEqual(found.panel,w.panel);}
 }
 const rows=report.rows.map((r,index)=>({index,input:r.input||r.fixture,result:r.result}));return{rows,raw,receipt:data.receipt,locator:{results:dir+'/evidence/results.json.gz',sha256:sha256(bytes),observations:dir+'/evidence/observations.json.gz',observationsSha256:sha256(rawBytes),run:dir+'/evidence/run.json',runSha256:sha256(runBytes)}};
}

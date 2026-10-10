import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {forcingArchive} from './archive.mjs';
import {quietArchive,dir,graphFor} from './saved.mjs';
import {quietFixtures,treeKey} from './fixtures.mjs';
import {forcingIds,quietIds} from './scopes.mjs';
import {checkForcing,checkQuiet} from './check-decisions.mjs';
// No new detector, evaluator, runtime classifier, derive or collector imports.
const data=await openResearchData(['D001'],{purpose:'test'}),old=await forcingArchive(),raw=await quietArchive(),bytes=await readFile(dir+'/evidence/results.json.gz'),report=JSON.parse(gunzipSync(bytes)),run=JSON.parse(await readFile(dir+'/evidence/run.json','utf8')),build=JSON.parse(await readFile(dir+'/build.json','utf8'));
assert.equal(report.schema,'E180-texture-pilot-v1');assert.equal(sha256(bytes),run.outputs.results);for(const r of [run,report]){assert.deepEqual(r.datasetReceipt,data.receipt);assert.deepEqual(r.sourceHashes,build.inputHashes);}assert.deepEqual(await bindings(Object.keys(build.inputHashes)),build.inputHashes);assert.deepEqual(report.forcingArchive,old.locator);assert.deepEqual(report.quietArchive,raw.locator);assert.equal(run.outputs.observations,raw.locator.sha256);
const smokeBytes=await readFile(dir+'/evidence/observations-smoke.json.gz'),smoke=JSON.parse(gunzipSync(smokeBytes));assert.equal(sha256(smokeBytes),run.outputs.smoke);assert.deepEqual(smoke,{...raw.report,rows:raw.rows.slice(0,6)});
for(const mode of ['smoke','finish']){
  const c=JSON.parse(await readFile(dir+'/evidence/collection-'+mode+'.json','utf8'));assert.deepEqual(c.datasetReceipt,data.receipt);assert.deepEqual(c.sourceHashes,raw.report.sourceHashes);assert.equal(c.preregistration,'416cc85');assert.match(c.revision,/^[a-f0-9]{40}$/);assert.equal(c.mode,mode);assert.equal(c.argv.at(-1),mode);assert.match(c.argv.at(-2),/collect\.mjs$/);assert.equal(c.engine,null);assert.equal(c.seed,null);assert.equal(c.cases,mode==='smoke'?6:12);assert.equal(c.collected,6);assert.equal(c.reused,mode==='smoke'?0:6);assert.equal(c.outputs.observations,mode==='smoke'?sha256(smokeBytes):raw.locator.sha256);
}
assert.equal(new Set(raw.rows.map(r=>JSON.stringify(r.key))).size,12);
for(const input of quietFixtures.slice(0,12)){const row=raw.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(treeKey(input)));assert.ok(row);assert.deepEqual(row.input,input);assert.equal(row.origin,'E146-frozen-collector');}
const counts=Object.fromEntries([...forcingIds,...quietIds].map(id=>[id,0]));assert.equal(report.records.length,30);
for(const [n,r]of report.records.entries()){
  if(n<12){const source=old.rows[n];assert.equal(r.family,'forcing');assert.equal(r.index,n);assert.equal(r.inputSha256,sha256(JSON.stringify(source.fixture)));assert.equal(r.sourceSha256,sha256(JSON.stringify(source.result)));checkForcing(source.fixture,source.result,r.output);for(const d of r.output)counts[d.id]+=d.available;}
  else{const index=n-12,input=quietFixtures[index],graph=graphFor(input,raw.rows);assert.equal(r.family,'quiet');assert.equal(r.index,index);assert.equal(r.inputSha256,sha256(JSON.stringify(input)));assert.equal(r.graphSha256,graph?sha256(JSON.stringify(graph)):null);const output={...r.output,graph:r.output.status==='exhausted'||!graph?null:graph};checkQuiet(input,output,graph);for(const d of output.decisions)counts[d.id]+=d.available;}
}
assert.deepEqual(counts,run.available);assert.equal(run.cases,30);assert.equal(run.decisions,96);assert.equal(run.quietTrees,12);assert.equal(run.newMateQueries,0);assert.equal(run.preregistration,'416cc85');assert.match(run.revision,/^[a-f0-9]{40}$/);assert.match(run.argv.at(-1),/pilot\.mjs$/);assert.equal(run.engine,null);assert.equal(run.seed,null);console.log(JSON.stringify({cases:30,decisions:96,available:counts,sourceHashes:Object.keys(build.inputHashes).length,independentReplay:'passed'}));

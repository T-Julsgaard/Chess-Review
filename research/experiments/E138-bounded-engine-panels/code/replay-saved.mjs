// Saved semantic replay: no engine, collector, detector, parser or ranker import.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {checkPanel} from './check-panel.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir=process.argv[2]||'research/experiments/E138-bounded-engine-panels/evidence';
const run=JSON.parse(await readFile(dir+'/run.json','utf8')),packed=await readFile(dir+'/results.json.gz'),plain=gunzipSync(packed),report=JSON.parse(plain);
assert.equal(run.schema,'E138-focused-retention-v1');assert.equal(report.schema,'E138-focused-pilot-v1');assert.equal(sha256(packed),run.outputHashes['results.json.gz']);assert.equal(sha256(plain),run.uncompressedSha256);assert.equal(packed.length,run.compressedBytes);assert.equal(plain.length,run.uncompressedBytes);
assert.equal(report.revision,run.sourceRevision);assert.deepEqual(report.inputHashes,run.inputHashes);assert.deepEqual(report.environment,run.environment);assert.deepEqual(report.command,run.command);assert.deepEqual(report.engine,run.engine);assert.equal(report.seed,null);assert.equal(run.seed,null);assert.ok(report.environment.node&&report.environment.platform&&report.environment.arch);
assert.equal(report.eligibilityReceipt.registrySha256,data.receipt.registrySha256);assert.equal(report.eligibilityReceipt.purpose,'test');assert.equal(report.eligibilityReceipt.policyVersion,'public-data-v1');assert.ok(report.eligibilityReceipt.datasets.D001);
for(const [name,hash]of Object.entries(run.inputHashes)){const bytes=await readFile(name);assert.equal(sha256(name.endsWith('.wasm')?bytes:bytes.toString('utf8').replaceAll('\r\n','\n')),hash,'Changed source '+name);}
assert.equal(report.rows.length,fixtures.length);assert.equal(run.cases,fixtures.length);let searches=0;
for(const [i,row]of report.rows.entries()){
 assert.deepEqual(row.fixture,JSON.parse(JSON.stringify(fixtures[i])));assert.equal(row.bundle.status,'complete');assert.equal(row.bundle.observationKind,'local-stockfish');assert.deepEqual(row.bundle.config,report.engine);assert.equal(row.bundle.eligibilityReceipt.registrySha256,data.receipt.registrySha256);
 const source=row.collectionSource;assert.equal(source.schema,'E138-collection-source-v1');assert.match(source.revision,/^[a-f0-9]{40}$/);assert.equal(source.reused,i===0);
 for(const [name,hash]of Object.entries(source.sourceHashes))assert.equal(hash,run.inputHashes[name]);
 if(source.reused){assert.equal(source.revision,source.snapshot.revision);for(const [name,hash]of Object.entries(source.snapshot.sourceHashes))assert.equal(hash,source.sourceHashes[name]);assert.deepEqual(Object.keys(source.dependencyAudit),Object.keys(source.sourceHashes));assert.ok(Object.values(source.dependencyAudit).every(v=>['contemporaneous smoke snapshot','unchanged committed bytes at smoke revision'].includes(v)));}
 else{assert.equal(source.revision,report.revision);assert.ok(source.elapsedMs>=0);}
 assert.equal(row.bundle.config.loaderSha256,sha256(await readFile('engine/stockfish-19-lite-single.js')));assert.equal(row.bundle.config.wasmSha256,run.inputHashes['engine/stockfish-19-lite-single.wasm']);
 checkPanel(row.fixture,row.bundle,row.result);searches+=row.bundle.searchCount;
}
console.log(JSON.stringify({passed:true,cases:fixtures.length,searches,sourceInputs:Object.keys(run.inputHashes).length,compressedBytes:packed.length,plainBytes:plain.length,eligibilityReceipt:data.receipt}));

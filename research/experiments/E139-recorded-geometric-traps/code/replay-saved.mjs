import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir=process.argv[2]||'research/experiments/E139-recorded-geometric-traps/evidence';
const packed=await readFile(dir+'/results.json.gz'),run=JSON.parse(await readFile(dir+'/run.json','utf8')),plain=gunzipSync(packed),report=JSON.parse(plain);
assert.equal(report.schema,'E139-focused-pilot-v1');assert.equal(run.schema,'E139-focused-retention-v1');assert.equal(sha256(packed),run.outputHashes['results.json.gz']);assert.equal(sha256(plain),run.uncompressedSha256);assert.equal(packed.length,run.compressedBytes);assert.equal(plain.length,run.uncompressedBytes);assert.equal(report.revision,run.sourceRevision);assert.deepEqual(report.inputHashes,run.inputHashes);assert.deepEqual(report.environment,run.environment);assert.deepEqual(report.command,run.command);assert.ok(report.environment.node&&report.environment.platform&&report.environment.arch);for(const r of [run,report]){assert.equal(r.engine,null);assert.equal(r.seed,null);}assert.equal(report.eligibilityReceipt.registrySha256,data.receipt.registrySha256);assert.equal(report.eligibilityReceipt.purpose,'test');assert.equal(report.eligibilityReceipt.policyVersion,'public-data-v1');assert.ok(report.eligibilityReceipt.datasets.D001);
for(const [name,hash]of Object.entries(run.inputHashes)){const bytes=await readFile(name);assert.equal(sha256(name.endsWith('.wasm')?bytes:bytes.toString('utf8').replaceAll('\r\n','\n')),hash,'Changed source '+name);}
assert.equal(report.rows.length,fixtures.length);assert.equal(run.cases,fixtures.length);let witnesses=0;
for(const [i,row]of report.rows.entries()){
 const f=fixtures[i];assert.deepEqual(row.fixture,JSON.parse(JSON.stringify(f)));
 if(f.inputError){assert.equal(row.error,f.inputError);assert.equal(row.result,undefined);const c=new Chess(f.history.fen);for(const m of f.history.moves)c.move(m);assert.notEqual(c.fen(),f.fen);continue;}
 const r=row.result,a=r.recordedTrapAnalysis;assert.equal(a.limit,f.maxRecordedTrapNodes??50000);assert.ok(a.nodes>=1&&a.nodes<=a.limit+1);assert.deepEqual(r.events.filter(e=>e.evidence?.experiment==='E139').map(e=>e.id),f.expected);
 if(a.witness){checkWitness(a.witness,r,f);witnesses++;}
 else{assert.equal(a.witness,null);assert.deepEqual(f.expected,[]);if(f.maxRecordedTrapNodes!==undefined){assert.equal(a.status,'exhausted');assert.equal(a.nodes,a.limit+1);}else if(!f.history)assert.equal(a.status,'history-unavailable');else if(f.id==='same-knight-moved-twice'){const c=new Chess(f.history.fen),m=c.move(f.history.moves[0]);assert.equal(m.to,f.move.slice(0,2));assert.equal(a.status,'unsupported-arrivals');}else{assert.equal(f.id,'unrelated-preparation');assert.equal(a.status,'no-joint-contact');}}
}
console.log(JSON.stringify({passed:true,cases:fixtures.length,witnesses,sourceInputs:Object.keys(run.inputHashes).length,plainBytes:plain.length,compressedBytes:packed.length,registrySha256:data.receipt.registrySha256}));

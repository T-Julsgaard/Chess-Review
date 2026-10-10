import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir=process.argv[2]||'research/experiments/E142-tactical-trade-judgments/evidence',packed=await readFile(dir+'/results.json.gz'),plain=gunzipSync(packed),report=JSON.parse(plain),run=JSON.parse(await readFile(dir+'/run.json','utf8'));
assert.equal(report.schema,'E142-focused-pilot-v1');assert.equal(run.schema,'E142-focused-retention-v1');assert.equal(sha256(packed),run.outputHashes['results.json.gz']);assert.equal(sha256(plain),run.uncompressedSha256);assert.equal(packed.length,run.compressedBytes);assert.equal(plain.length,run.uncompressedBytes);assert.equal(report.revision,run.sourceRevision);assert.match(report.revision,/^[a-f0-9]{40}$/);assert.deepEqual(report.inputHashes,run.inputHashes);assert.deepEqual(report.environment,run.environment);assert.deepEqual(report.command,run.command);assert.ok(report.environment.node&&report.environment.platform&&report.environment.arch);assert.deepEqual(report.eligibilityReceipt,data.receipt);for(const r of [report,run]){assert.equal(r.engine,null);assert.equal(r.seed,null);}
for(const [name,hash]of Object.entries(run.inputHashes))assert.equal(sha256((await readFile(name,'utf8')).replaceAll('\r\n','\n')),hash,'Changed source '+name);
assert.equal(report.rows.length,fixtures.length);assert.equal(run.cases,fixtures.length);let witnesses=0;
for(const [i,row]of report.rows.entries()){
  const f=fixtures[i],r=row.result,a=r.tacticalTradeAnalysis;assert.deepEqual(row.fixture,JSON.parse(JSON.stringify(f)));assert.equal(a.limit,f.maxTradeNodes??50000);assert.equal(a.plies,f.tradeMatePlies??1);assert.deepEqual(r.events.filter(e=>e.evidence?.experiment==='E142').map(e=>e.id),f.expected);assert.deepEqual(r.events.filter(e=>e.evidence?.experiment!=='E142'),row.parent.events);assert.equal(r.after,row.parent.after);
  if(a.witness){checkWitness(a.witness,r,f);witnesses++;}else{assert.equal(a.witness,null);assert.deepEqual(f.expected,[]);assert.equal(r.comment,row.parent.comment);if(f.maxTradeNodes===0){assert.equal(a.status,'exhausted');assert.equal(a.nodes,1);}else{assert.equal(f.history,undefined);assert.equal(a.status,'history-prerequisite');}}
}
console.log(JSON.stringify({passed:true,cases:fixtures.length,witnesses,sourceInputs:Object.keys(run.inputHashes).length,plainBytes:plain.length,compressedBytes:packed.length}));

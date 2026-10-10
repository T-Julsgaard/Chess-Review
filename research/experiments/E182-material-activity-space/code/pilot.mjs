import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {dir,fullBindings} from './source.mjs';
import {spaceFixtures} from './fixtures.mjs';
import {inspectSpace,evaluateSpace} from './space.mjs';
import {inspectOffer} from './offer.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),sources={},read=async file=>{const bytes=await readFile(file);sources[file]=sha256(bytes);return JSON.parse(file.endsWith('.gz')?gunzipSync(bytes):bytes.toString());};
const original='research/experiments/E165-comparative-sacrificial-attack/evidence',oldRun=await read(original+'/run.json'),oldResults=await read(original+'/results.json.gz');
assert.equal(sources[original+'/results.json.gz'],oldRun.outputs.results);
assert.deepEqual(oldRun.datasetReceipt,data.receipt);
for(const [file,hash]of Object.entries(oldRun.sourceHashes))assert.equal(sha256(normalized(file,await readFile(file))),hash);
const rows=[];
for(const index of [0,1,4,5,6,7,8,9,10,11,12,13]){
  const {input,result}=oldResults.rows[index];
  rows.push({kind:'offer',origin:{file:original+'/results.json.gz',index},input,source:result,decision:inspectOffer(input,result)});
}
for(const color of ['w','b']){
  const file=dir+'/evidence/recovery-result-'+color+'.json.gz',record=await read(file);
  const decision=inspectOffer(record.input,record.result);assert.deepEqual(decision,record.decision);
  rows.push({kind:'offer',origin:{file},input:record.input,source:record.result,decision});
}
const space=await read(dir+'/evidence/space-panels.json.gz');assert.deepEqual(space.datasetReceipt,data.receipt);
for(const input of spaceFixtures){
  const raw=space.rows.find(r=>r.input.id===input.id);
  const supplied=raw?{...input,materialSpacePanel:raw.panel}:input;
  const decision=raw?inspectSpace(supplied):evaluateSpace(supplied);
  assert.equal(decision.available,input.expected,input.id);
  rows.push({kind:'space',origin:raw?{file:dir+'/evidence/space-panels.json.gz',id:input.id}:null,input,decision});
}
assert.equal(rows.length,30);
const sourceHashes=await fullBindings(),packed=gzipSync(JSON.stringify({schema:'E182-main-pilot-v1',datasetReceipt:data.receipt,sourceHashes,sources,rows}),{level:9});
await writeFile(dir+'/evidence/results.json.gz',packed);
const positives={C0588:rows.filter(r=>r.kind==='offer'&&r.decision.claims.C0588).length,C0593:rows.filter(r=>r.kind==='offer'&&r.decision.claims.C0593).length,C0590:rows.filter(r=>r.kind==='space'&&r.decision.available).length};
await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E182',preregistration:'0c9c53a18909ef7b259157061decb83e3743210c',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,os:os.release(),engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,sources,outputs:{results:sha256(packed)},cases:30,decisions:44,positives,scope:'Exposed synthetic development; combined acceptance and broad strategic/human validity remain open.'},null,2)+'\n');
console.log(JSON.stringify({cases:30,decisions:44,positives,bytes:packed.length,sourceInputs:Object.keys(sourceHashes).length}));

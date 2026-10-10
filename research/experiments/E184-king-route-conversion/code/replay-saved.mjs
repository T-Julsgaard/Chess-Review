import assert from 'node:assert/strict';import {readFile,writeFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';import {checkKingRoute} from './check-result.mjs';import {dir,fullBindings} from './source.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),raw=await readFile(dir+'/evidence/corrected-smoke.json.gz'),panels=JSON.parse(gunzipSync(raw)),bytes=await readFile(dir+'/evidence/pilot.json.gz'),saved=JSON.parse(gunzipSync(bytes)),run=JSON.parse(await readFile(dir+'/evidence/run.json','utf8'));
assert.equal(sha256(raw),saved.panelSha256);assert.equal(sha256(bytes),run.outputs.pilot);assert.deepEqual(saved.datasetReceipt,data.receipt);assert.deepEqual(panels.receipt,data.receipt);assert.deepEqual(saved.sourceHashes,await fullBindings());assert.deepEqual(run.sourceHashes,saved.sourceHashes);
const provenance=JSON.parse(await readFile(dir+'/evidence/raw-provenance.json','utf8'));
for(const [name,hash] of Object.entries(provenance.artifacts))assert.equal(sha256(await readFile(dir+'/evidence/'+name)),hash);
const collection=JSON.parse(gunzipSync(await readFile(dir+'/evidence/corrected-collection-source.json.gz'))),collectionHashes=await bindings(Object.keys(collection).map(f=>dir+'/code/'+f));
for(const [f,source] of Object.entries(collection))collectionHashes[dir+'/code/'+f]=sha256(source.replaceAll('\r\n','\n'));
assert.deepEqual(collectionHashes,provenance.sourceHashes);
const traceSource=JSON.parse(gunzipSync(await readFile(dir+'/evidence/traced-source.json.gz')));
for(const [name,source] of Object.entries(collection))if(!['fixtures.mjs','smoke.mjs'].includes(name))assert.equal(source,traceSource[name]);
for(const r of panels.rows)checkKingRoute(r.input,{...r.options,proofs:r.result.witness.queries},r.result);
let decisions=0;for(const row of saved.rows){const result=structuredClone(row.result),source=panels.rows.find(r=>r.id===row.source),options={...row.options};if(source){options.proofs=source.result.witness.queries;if(result.witness)result.witness.queries=options.proofs;}checkKingRoute(row.input,options,result);decisions+=4;}
assert.equal(saved.rows.length,run.cases);assert.equal(decisions,run.decisions);
const proof={passed:true,cases:saved.rows.length,decisions,rawPanels:panels.rows.length,retainedFailureArtifacts:Object.keys(provenance.artifacts).length,collectionBindings:Object.keys(collectionHashes).length,sourceBindings:Object.keys(saved.sourceHashes).length,pilotSha256:sha256(bytes),panelSha256:sha256(raw),limitations:'Shares legal Chess, old E106 independent proof checker and old ordinary-data helper. Imports no E184 runtime/context/collector/admission. Synthetic development, not full original definitions or human validity.'};await writeFile(dir+'/evidence/replay.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));

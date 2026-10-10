import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {archives,selected} from './archives.mjs';
import {inspectScope} from './inspect-scope.mjs';
// Independent replay: imports no detector, evaluator, context or derivation.
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E176-weakness-planning-reuse',bytes=await readFile(dir+'/evidence/results.json.gz'),report=JSON.parse(gunzipSync(bytes)),run=JSON.parse(await readFile(dir+'/evidence/run.json','utf8')),build=JSON.parse(await readFile(dir+'/build.json','utf8')),source=await archives();
assert.equal(sha256(bytes),run.outputs.results);assert.equal(report.schema,'E176-scoped-proof-reuse-v1');
for(const r of [report,run]){assert.deepEqual(r.receipt,data.receipt);assert.deepEqual(r.sourceHashes,build.inputHashes);}
assert.deepEqual(await bindings(Object.keys(build.inputHashes)),build.inputHashes);assert.deepEqual(report.archives,source.locators);
const reused=selected(source.all);assert.equal(report.rows.length,18);let available=0;
const initialBytes=await readFile(report.collectionSource.path);assert.equal(sha256(initialBytes),report.collectionSource.sha256);const initial=JSON.parse(gunzipSync(initialBytes)),initialRun=JSON.parse(gunzipSync(await readFile(dir+'/evidence/initial-pilot/run.json.gz')));assert.equal(sha256(initialBytes),initialRun.outputs.results);assert.equal(initialRun.fresh,4);assert.equal(initialRun.reused,14);assert.deepEqual(initial.receipt,data.receipt);assert.deepEqual(initial.archives,source.locators);for(const [p,h]of Object.entries(await bindings(['research/experiments/E116-center-restraint-entry/code/center.mjs'])))assert.equal(initial.sourceHashes[p],h,'Changed original E116 collector');
for(const [i,row]of report.rows.entries()){
  let input,result;
  if(i<14){const r=reused[i];assert.equal(row.id,r.id);assert.equal(row.origin,r.origin);assert.equal(row.index,r.index);input=r.input;result=r.result;assert.equal(row.inputSha256,sha256(JSON.stringify(input)));assert.equal(row.resultSha256,sha256(JSON.stringify(result)));}
  else{assert.equal(row.id,'C0541');assert.equal(row.origin,'E116');assert.equal(row.freshIndex,[4,5,12,13][i-14]);const f=source.all.E116[row.freshIndex].fixture;input={...f,history:{fen:f.fen,moves:[]}};assert.deepEqual(row.input,input);result=row.result;assert.deepEqual(row,initial.rows[i]);}
  const decision=inspectScope(row.id,input,result);assert.deepEqual(decision,row.decision);assert.equal(decision.available,i<14?reused[i].expected:false);available+=decision.available;
}
assert.equal(available,8);assert.equal(run.available,8);assert.equal(run.cases,18);assert.equal(run.fresh+run.reused,18);assert.equal(run.preregistration,'e7099b7');assert.match(run.revision,/^[a-f0-9]{40}$/);assert.match(run.command.at(-1),/pilot\.mjs$/);assert.equal(run.engine,null);assert.equal(run.seed,null);
console.log(JSON.stringify({cases:18,available,sourceHashes:Object.keys(build.inputHashes).length,independentReplay:'passed',bytes:bytes.length}));

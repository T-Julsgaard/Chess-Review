import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings,normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {verifyPanel as verifyOld} from '../../E152-causal-space-room/code/verify-panel.mjs';
import {Chess} from '../../../../lib/chess.js';
import {dir,fullBindings} from './source.mjs';
import {spaceFixtures} from './fixtures.mjs';
import {checkOffer} from './check-offer.mjs';
import {checkSpace} from './check-space.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),read=async file=>{const b=await readFile(file);return JSON.parse(file.endsWith('.gz')?gunzipSync(b):b.toString());};
const report=await read(dir+'/evidence/run.json'),bytes=await readFile(dir+'/evidence/results.json.gz'),saved=JSON.parse(gunzipSync(bytes));
assert.equal(sha256(bytes),report.outputs.results);assert.deepEqual(saved.sourceHashes,await fullBindings());assert.deepEqual(report.sourceHashes,saved.sourceHashes);
assert.deepEqual(saved.datasetReceipt,data.receipt);assert.deepEqual(report.datasetReceipt,data.receipt);assert.deepEqual(report.sources,saved.sources);
for(const [file,hash]of Object.entries(saved.sources))assert.equal(sha256(await readFile(file)),hash);
const original='research/experiments/E165-comparative-sacrificial-attack/evidence',oldRun=await read(original+'/run.json'),oldResults=await read(original+'/results.json.gz');
assert.equal(sha256(await readFile(original+'/results.json.gz')),oldRun.outputs.results);assert.deepEqual(oldRun.datasetReceipt,data.receipt);
for(const [file,hash]of Object.entries(oldRun.sourceHashes))assert.equal(sha256(normalized(file,await readFile(file))),hash);
const panels=await read(dir+'/evidence/space-panels.json.gz');assert.deepEqual(panels.datasetReceipt,data.receipt);
assert.deepEqual(panels.sourceHashes,await bindings([dir+'/code/collect-space.mjs']));
const oldSpace=await read(panels.oldOrigin.file),oldSpaceRun=await read('research/experiments/E152-causal-space-room/evidence/run.json');
assert.equal(sha256(await readFile(panels.oldOrigin.file)),panels.oldOrigin.sha256);assert.equal(panels.oldOrigin.sha256,oldSpaceRun.outputHashes['observations.json.gz']);
assert.deepEqual(oldSpace.sourceHashes,panels.oldOrigin.sourceHashes);assert.deepEqual(oldSpace.eligibilityReceipt,panels.oldOrigin.receipt);assert.deepEqual(panels.oldOrigin.receipt,data.receipt);
for(const [file,hash]of Object.entries(oldSpace.sourceHashes))assert.equal(sha256(normalized(file,await readFile(file))),hash);
assert.equal(panels.rows.length,10);assert.equal(panels.rows.filter(r=>r.origin.kind==='fresh').length,8);
for(const row of panels.rows.filter(r=>r.origin.kind==='E152-explicit-projection')){
  const original=oldSpace.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(row.origin.key));assert.ok(original);
  assert.equal(sha256(JSON.stringify(original.panel)),row.origin.originalPanelHash);verifyOld({...row.input,spaceAlternative:row.input.materialAlternative},original.panel);
  const projected=structuredClone(row.panel),score=fen=>new Chess(fen).board().flat().filter(Boolean).reduce((n,p)=>n+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color===row.panel.actor?1:-1),0);
  assert.equal(projected.balance,score(projected.before));delete projected.balance;projected.schema=original.panel.schema;
  for(const variant of projected.variants){assert.equal(variant.balance,score(variant.state.fen));delete variant.balance;}
  assert.deepEqual(projected,original.panel);
}
assert.equal(saved.rows.length,30);
const selected=[0,1,4,5,6,7,8,9,10,11,12,13];let offerIndex=0,spaceIndex=0,decisions=0;
for(const row of saved.rows){
  if(row.kind==='offer'){
    if(offerIndex<12){const index=selected[offerIndex],originalRow=oldResults.rows[index];assert.deepEqual(row.origin,{file:original+'/results.json.gz',index});assert.deepEqual(row.input,originalRow.input);assert.deepEqual(row.source,originalRow.result);}
    else{
      const color=offerIndex===12?'w':'b',file=dir+'/evidence/recovery-result-'+color+'.json.gz',recovery=await read(file),raw=await read(dir+'/evidence/recovery-raw-'+color+'.json.gz');
      assert.deepEqual(row.origin,{file});assert.deepEqual(row.input,recovery.input);assert.deepEqual(row.source,recovery.result);assert.deepEqual(row.decision,recovery.decision);
      assert.deepEqual(recovery.datasetReceipt,data.receipt);assert.deepEqual(raw.datasetReceipt,data.receipt);
      assert.deepEqual(recovery.sourceHashes,await bindings([dir+'/code/recovery-smoke.mjs']));assert.deepEqual(raw.sourceHashes,await bindings(['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']));
      assert.deepEqual(raw.input,row.input);assert.deepEqual(raw.panel,row.source.attackPolicyAnalysis.witness.panel);
    }
    checkOffer(row.input,row.source,row.decision);offerIndex++;decisions+=2;
  }else{
    // JSON transport omits explicitly undefined optional fields. Compare the
    // exact transported fixture, retaining all actual history/moves if present.
    assert.equal(row.kind,'space');assert.deepEqual(row.input,JSON.parse(JSON.stringify(spaceFixtures[spaceIndex++])));
    const raw=panels.rows.find(r=>r.input.id===row.input.id);
    assert.deepEqual(row.origin,raw?{file:dir+'/evidence/space-panels.json.gz',id:row.input.id}:null);
    if(raw){assert.deepEqual(raw.input,row.input);assert.deepEqual(row.decision.witness.panel,raw.panel);}
    checkSpace(raw?{...row.input,materialSpacePanel:raw.panel}:row.input,row.decision,raw?'inspect':'evaluate');
    assert.equal(row.decision.available,row.input.expected);decisions++;
  }
}
assert.equal(offerIndex,14);assert.equal(spaceIndex,16);assert.equal(decisions,44);
const positives={C0588:saved.rows.filter(r=>r.kind==='offer'&&r.decision.claims.C0588).length,C0593:saved.rows.filter(r=>r.kind==='offer'&&r.decision.claims.C0593).length,C0590:saved.rows.filter(r=>r.kind==='space'&&r.decision.available).length};assert.deepEqual(report.positives,positives);
await writeFile(dir+'/evidence/replay.json',JSON.stringify({experiment:'E182',status:'passed',cases:30,decisions,positives,datasetReceipt:data.receipt,resultsHash:sha256(bytes),runHash:sha256(await readFile(dir+'/evidence/run.json')),sourceHashes:saved.sourceHashes,limitations:['Shared Chess and frozen E165/E152 independent legal admission','Synthetic exposed development, no human validity','Combined acceptance deferred']},null,2)+'\n');
console.log(JSON.stringify({status:'passed',cases:30,decisions,positives,sourceInputs:Object.keys(saved.sourceHashes).length}));

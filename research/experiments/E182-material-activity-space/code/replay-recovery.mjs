import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {checkOffer} from './check-offer.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E182-material-activity-space/evidence',files={},rows=[];
const current=await bindings(['research/experiments/E182-material-activity-space/code/recovery-smoke.mjs']);
for(const color of ['w','b']){
  const filename=dir+'/recovery-result-'+color+'.json.gz',bytes=await readFile(filename),record=JSON.parse(gunzipSync(bytes));
  assert.deepEqual(record.sourceHashes,current);
  const rawName=dir+'/recovery-raw-'+color+'.json.gz',rawBytes=await readFile(rawName),raw=JSON.parse(gunzipSync(rawBytes));
  assert.deepEqual(raw.sourceHashes,await bindings(['research/experiments/E143-forcing-tempo-initiative/code/panel.mjs']));
  assert.deepEqual(raw.input,record.input);assert.deepEqual(raw.panel,record.result.attackPolicyAnalysis.witness.panel);
  assert.equal(raw.datasetReceipt.registrySha256,data.receipt.registrySha256);
  assert.equal(record.datasetReceipt.registrySha256,data.receipt.registrySha256);
  checkOffer(record.input,record.result,record.decision);
  files[filename]=createHash('sha256').update(bytes).digest('hex');files[rawName]=createHash('sha256').update(rawBytes).digest('hex');
  rows.push({color,claims:record.decision.claims,sourceNodes:raw.panel.nodes});
}
await writeFile(dir+'/recovery-replay.json',JSON.stringify({experiment:'E182',status:'passed',datasetReceipt:data.receipt,sourceHashes:await bindings(['research/experiments/E182-material-activity-space/code/replay-recovery.mjs']),files,rows},null,2)+'\n');
console.log(JSON.stringify({status:'passed',rows}));

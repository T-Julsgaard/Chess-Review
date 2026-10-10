import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {sourceArchive,dir} from './saved.mjs';
import {inspectTurnover} from './turnover.mjs';
import {checkTurnover} from './check-turnover.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await sourceArchive(),prior=JSON.parse(gunzipSync(await readFile(dir+'/evidence/prior-trees.json.gz'))),rows=[];
assert.deepEqual(prior.sourceHashes,await bindings([dir+'/code/collect-prior.mjs']));assert.deepEqual(prior.datasetReceipt,data.receipt);
for(const row of saved.rows){
  const graph=prior.rows.find(r=>r.source===row.source&&r.color===row.color).graph,options={...row.options,priorTree:graph};
  const decision=inspectTurnover(row.source,row.input,row.result,options);checkTurnover(row.source,row.input,row.result,options,decision);
  assert.deepEqual(decision.claims,{C0595:true,C0596:true,C0597:row.source==='defense'});
  rows.push({source:row.source,color:row.color,input:row.input,options,decision,origin:row.locator});
  console.log(JSON.stringify({source:row.source,color:row.color,claims:decision.claims,nodes:decision.nodes,bounds:{prior:decision.witness.earlierBound,current:decision.witness.currentBound}}));
}
await writeFile(dir+'/evidence/turnover-smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
const dir='research/experiments/E183-recorded-initiative-turnover',data=await openResearchData(['D001'],{purpose:'test'}),files={},rows=[];
const read=async name=>{const bytes=await readFile(dir+'/evidence/'+name);files[name]=sha256(bytes);return JSON.parse(gunzipSync(bytes));};
for(const source of ['tempo','defense'])for(const color of ['w','b']){
  const stem=source+'-'+color,raw=await read(stem+'-raw.json.gz'),saved=await read(stem+'-result.json.gz');
  assert.deepEqual(raw.input,saved.input);assert.deepEqual(raw.options,saved.options);
  assert.deepEqual(raw.datasetReceipt,data.receipt);assert.deepEqual(saved.datasetReceipt,data.receipt);
  assert.deepEqual(saved.sourceHashes,await bindings([dir+'/code/smoke-root.mjs']));
  const panel=source==='tempo'?saved.result.forcingTempoAnalysis.witness.panel:saved.result.defenseComparisonAnalysis.witness.panel;
  assert.deepEqual(raw.panel,panel);
  if(source==='tempo'){
    const old=await read('initial-'+stem+'-result.json.gz');assert.deepEqual(old.input,saved.input);assert.deepEqual(old.result,saved.result);
    const changed=Object.keys(saved.sourceHashes).filter(f=>saved.sourceHashes[f]!==old.sourceHashes[f]);
    assert.deepEqual(changed,[dir+'/code/fixtures.mjs']);
  }
  rows.push({source,color,rawNodes:raw.panel.nodes,originalCacheHit:raw.reused,earlierMate:saved.earlierMate.mate,sourceStatus:source==='tempo'?saved.result.forcingTempoAnalysis.status:saved.result.defenseComparisonAnalysis.status});
}
await writeFile(dir+'/evidence/smoke-manifest.json',JSON.stringify({experiment:'E183',stage:'source-smoke-only',datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/record-smoke.mjs']),files,rows,collection:{tempo:2,defense:2,tempoRederivationFreshCollections:0},limitations:['Turnover APIs/earlier E146 certificates/independent E183 decision replay not implemented','Original illegal queen-route failure preserved; corrected defense root preregistered at24def14','No accepted or ready candidate coverage']},null,2)+'\n');
console.log(JSON.stringify({stage:'source-smoke-only',rows,originalTempoResultsUnchanged:true}));

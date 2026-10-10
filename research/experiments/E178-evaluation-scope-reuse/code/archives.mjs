import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {openResearchData,sha256} from '../../../data-policy.mjs';import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const origins={E143:'E143-forcing-tempo-initiative',E174:'E174-comparative-piece-improvement',E156:'E156-piece-objective-effectiveness'};
export async function archives(){
 const data=await openResearchData(['D001'],{purpose:'test'}),all={},locators={};
 for(const [origin,name]of Object.entries(origins)){
  const dir='research/experiments/'+name+'/evidence',runBytes=await readFile(dir+'/run.json'),run=JSON.parse(runBytes),bytes=await readFile(dir+'/results.json.gz'),plain=gunzipSync(bytes),report=JSON.parse(plain),modern=origin==='E174';
  assert.equal(sha256(bytes),modern?run.outputs.results:run.outputHashes['results.json.gz']);assert.deepEqual(modern?run.datasetReceipt:report.eligibilityReceipt,data.receipt);assert.equal(run.engine,null);assert.equal(run.seed,null);assert.equal(report.rows.length,run.cases);
  if(!modern){assert.equal(sha256(plain),run.uncompressedSha256);assert.equal(bytes.length,run.compressedBytes);assert.equal(plain.length,run.uncompressedBytes);assert.deepEqual(report.inputHashes,run.inputHashes);assert.equal(report.revision,run.sourceRevision);}
  for(const [p,h]of Object.entries(run.sourceHashes||run.inputHashes))assert.equal(sha256(normalized(p,await readFile(p))),h,'Changed original source '+p);
  all[origin]=report.rows;locators[origin]={results:dir+'/results.json.gz',resultsSha256:sha256(bytes),run:dir+'/run.json',runSha256:sha256(runBytes)};
 }
 return{all,locators,receipt:data.receipt};
}
export function selected(all){const rows=[];for(const [origin,ids,indices]of [['E143',['C0554','C0582'],[0,1,4,5,10,11]],['E174',['C0557'],[0,1,2,3,4,5,6,7]],['E156',['C0563'],[0,1,2,3,4,5]]])for(const index of indices){const r=all[origin][index];rows.push({origin,ids,index,input:r.input||r.fixture,result:r.result,expected:index<2});}return rows;}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {normalized} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const origins={E116:'E116-center-restraint-entry',E168:'E168-forced-pawn-weakness',E153:'E153-second-target-defense'};
const oldPolicy='9e6e2e256958657981c680d3678a07ebf28f94c99c809652453004cf161204b6',newPolicy='b9f78bc7e345dc2d5fea681b16f801d85c808ae2173cf8b44ece30ba99e2298f';
export function admitReceipt(archived,current) {
  if(archived.policySha256===current.policySha256){assert.deepEqual(archived,current);return;}
  assert.equal(archived.policySha256,oldPolicy);assert.equal(current.policySha256,newPolicy);
  const {policySha256:old,...a}=archived,{policySha256:now,...b}=current;assert.deepEqual(a,b,'Changed game eligibility receipt');
}
export async function archives() {
  const data=await openResearchData(['D001'],{purpose:'test'}),all={},locators={};
  assert.equal(sha256(await readFile('research/DATA_POLICY.md')),data.receipt.policySha256,'Current policy fingerprint');
  for(const [origin,name]of Object.entries(origins)) {
    const dir='research/experiments/'+name+'/evidence',runBytes=await readFile(dir+'/run.json'),run=JSON.parse(runBytes),bytes=await readFile(dir+'/results.json.gz'),plain=gunzipSync(bytes),report=JSON.parse(plain);
    assert.equal(sha256(bytes),origin==='E168'?run.outputs.results:run.outputHashes['results.json.gz']);
    if(origin!=='E168'){assert.equal(sha256(plain),run.uncompressedSha256);assert.equal(bytes.length,run.compressedBytes);assert.equal(plain.length,run.uncompressedBytes);assert.deepEqual(report.inputHashes,run.inputHashes);admitReceipt(report.eligibilityReceipt,data.receipt);assert.equal(report.revision,run.sourceRevision);}
    else admitReceipt(run.datasetReceipt,data.receipt);
    assert.equal(run.engine,null);assert.equal(run.seed,null);assert.equal(report.rows.length,run.cases);
    for(const [p,h]of Object.entries(run.sourceHashes||run.inputHashes)){const actual=sha256(normalized(p,await readFile(p)));if(p==='research/DATA_POLICY.md'&&h===oldPolicy)assert.equal(actual,newPolicy);else assert.equal(actual,h,'Changed original source '+p);}
    all[origin]=report.rows;
    locators[origin]={results:dir+'/results.json.gz',resultsSha256:sha256(bytes),run:dir+'/run.json',runSha256:sha256(runBytes)};
  }
  return {all,locators,receipt:data.receipt};
}
// Selection is prospectively fixed in plan.md. Original rows remain immutable.
export function selected(all) {
  const rows=[];
  for(const [origin,id,indices]of [['E116','C0541',[34,35]],['E168','C0542',[0,1,2,3,4,5]],['E153','C0543',[0,1,2,3,4,5]]])
    for(const index of indices){const r=all[origin][index];rows.push({id,origin,index,input:r.fixture||r.input,result:r.result,expected:origin==='E116'||(origin==='E168'?index<2:index<4)});}
  return rows;
}

import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
export const dir='research/experiments/E183-recorded-initiative-turnover';
export async function sourceArchive(){
  const data=await openResearchData(['D001'],{purpose:'test'}),manifest=JSON.parse(await readFile(dir+'/evidence/smoke-manifest.json','utf8')),rows=[];
  assert.deepEqual(manifest.datasetReceipt,data.receipt);
  for(const [name,hash]of Object.entries(manifest.files))assert.equal(sha256(await readFile(dir+'/evidence/'+name)),hash);
  for(const source of ['tempo','defense'])for(const color of ['w','b']){
    const file=dir+'/evidence/'+source+'-'+color+'-result.json.gz',rawFile=dir+'/evidence/'+source+'-'+color+'-raw.json.gz';
    const saved=JSON.parse(gunzipSync(await readFile(file))),raw=JSON.parse(gunzipSync(await readFile(rawFile)));
    assert.deepEqual(saved.datasetReceipt,data.receipt);assert.deepEqual(raw.datasetReceipt,data.receipt);
    assert.deepEqual(saved.sourceHashes,await bindings([dir+'/code/smoke-root.mjs']));
    assert.deepEqual(raw.kernelHashes,await bindings(Object.keys(raw.kernelHashes)));
    assert.deepEqual(saved.input,raw.input);assert.deepEqual(saved.options,raw.options);
    const panel=source==='tempo'?saved.result.forcingTempoAnalysis.witness.panel:saved.result.defenseComparisonAnalysis.witness.panel;
    assert.deepEqual(panel,raw.panel);rows.push({...saved,color,locator:{file,sha256:sha256(await readFile(file)),rawFile,rawSha256:sha256(await readFile(rawFile))}});
  }
  return{rows,receipt:data.receipt};
}

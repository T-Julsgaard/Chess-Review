import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {gunzipSync} from 'node:zlib';import {sha256} from '../../../data-policy.mjs';import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';import {dir} from './source.mjs';
export async function archives(){
 const bytes=await readFile(dir+'/evidence/smoke.json.gz'),oldBytes=await readFile('research/experiments/E184-king-route-conversion/evidence/corrected-smoke.json.gz'),fresh=JSON.parse(gunzipSync(bytes)),old=JSON.parse(gunzipSync(oldBytes)),parent=JSON.parse(await readFile('research/experiments/E184-king-route-conversion/build.json','utf8'));
 const now=await bindings(Object.keys(parent.inputHashes));for(const [p,h] of Object.entries(parent.inputHashes))if(now[p]!==h)throw Error('Changed E184 dependency '+p);
 const oldRun=JSON.parse(await readFile('research/experiments/E184-king-route-conversion/evidence/run.json','utf8')),collection=JSON.parse(await readFile(dir+'/evidence/collection.json','utf8'));
 assert.equal(sha256(oldBytes),oldRun.outputs.panels);assert.deepEqual(oldRun.sourceHashes,parent.inputHashes);assert.equal(sha256(bytes),collection.outputs.smoke);assert.deepEqual(fresh.sourceHashes,collection.sourceHashes);assert.deepEqual(old.receipt,fresh.receipt);
 return{fresh,old,hashes:{fresh:sha256(bytes),old:sha256(oldBytes)},lookup(source){return(source.archive==='fresh'?fresh:old).rows.find(r=>r.id===source.id);}};
}

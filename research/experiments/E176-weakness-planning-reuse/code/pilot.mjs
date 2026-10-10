import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {archives,selected} from './archives.mjs';
import {evaluateScope} from './evaluate-scope.mjs';
import {inspectScope} from './inspect-scope.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E176-weakness-planning-reuse',source=await archives(),build=JSON.parse(await readFile(dir+'/build.json','utf8')),rows=[];
let fresh=0,reused=0,old;
try{old=JSON.parse(gunzipSync(await readFile(dir+'/evidence/results.json.gz')));}catch(e){if(e.code!=='ENOENT')throw e;}
if(old){assert.deepEqual(old.receipt,data.receipt);assert.deepEqual(old.archives,source.locators);for(const [p,h]of Object.entries(await bindings(['research/experiments/E116-center-restraint-entry/code/center.mjs'])))assert.equal(old.sourceHashes[p],h,'Changed E116 collection source');}
for(const r of selected(source.all)){
  const decision=inspectScope(r.id,r.input,r.result);assert.equal(decision.available,r.expected);
  rows.push({id:r.id,origin:r.origin,index:r.index,inputSha256:sha256(JSON.stringify(r.input)),resultSha256:sha256(JSON.stringify(r.result)),decision});reused++;
}
for(const index of [4,5,12,13]){
  const original=source.all.E116[index].fixture,input={...original,history:{fen:original.fen,moves:[]}},existing=old?.rows.find(r=>r.origin==='E116'&&r.freshIndex===index);
  let result,decision;
  if(existing){assert.deepEqual(existing.input,input);result=existing.result;decision=inspectScope('C0541',input,result);reused++;}
  else{({result,decision}=evaluateScope('C0541',input));fresh++;}
  assert.equal(decision.available,false);assert.equal(decision.status,'scope-not-proven');
  rows.push({id:'C0541',origin:'E116',freshIndex:index,input,result,decision});
}
assert.equal(rows.length,18);assert.equal(rows.filter(r=>r.decision.available).length,8);
const initial=await readFile(dir+'/evidence/initial-pilot/results.json.gz').catch(e=>{if(e.code==='ENOENT')return null;throw e;}),collectionSource=initial?{path:dir+'/evidence/initial-pilot/results.json.gz',sha256:sha256(initial)}:null;
const report={schema:'E176-scoped-proof-reuse-v1',receipt:data.receipt,sourceHashes:build.inputHashes,archives:source.locators,collectionSource,rows},bytes=gzipSync(JSON.stringify(report)),run={experiment:'E176',preregistration:'e7099b7',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),command:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,cases:18,available:8,reused,fresh,outputs:{results:sha256(bytes)},receipt:data.receipt,sourceHashes:build.inputHashes};
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/results.json.gz',bytes);await writeFile(dir+'/evidence/run.json',JSON.stringify(run,null,2)+'\n');
console.log(JSON.stringify({cases:18,available:8,reused,fresh,bytes:bytes.length}));

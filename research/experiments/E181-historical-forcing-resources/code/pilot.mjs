import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {archive,selectedHunt} from './archive.mjs';
import {saved,dir,continuationFor} from './saved.mjs';
import {inspectHistory} from './history.mjs';
import {ids} from './scopes.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),old=await archive('conversion'),hunt=await archive('hunt'),raw=await saved(),build=JSON.parse(await readFile(dir+'/build.json','utf8')),records=[];
for(const source of ['conversion','hunt'])for(const r of source==='conversion'?old.rows:hunt.rows.filter(r=>selectedHunt.includes(r.index))){
 const graph=source==='conversion'?continuationFor(r.index,raw.rows):undefined,options=graph?{continuation:graph}:{},output=inspectHistory(source,r.input,r.result,options);
 records.push({source,index:r.index,inputSha256:sha256(JSON.stringify(r.input)),resultSha256:sha256(JSON.stringify(r.result)),graphSha256:graph?sha256(JSON.stringify(graph)):null,output:{...output,analysis:{...output.analysis,continuation:undefined}}});
}
const all=records.flatMap(r=>r.output.decisions),counts=Object.fromEntries(ids.map(id=>[id,all.filter(d=>d.id===id&&d.available).length]));assert.equal(records.length,24);assert.equal(all.length,72);
const controlBytes=await readFile(dir+'/evidence/longer-policy-control.json.gz'),control={path:dir+'/evidence/longer-policy-control.json.gz',sha256:sha256(controlBytes)},report={schema:'E181-forcing-history-pilot-v1',datasetReceipt:data.receipt,sourceHashes:build.inputHashes,archives:{conversion:old.locator,hunt:hunt.locator},continuations:raw.locator,control,records},bytes=gzipSync(JSON.stringify(report),{level:9}),run={experiment:'E181',preregistration:'5eb8dcb',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes:build.inputHashes,cases:24,decisions:72,controlCases:1,controlDecisions:3,available:counts,newMateQueries:0,newRawTrees:2,outputs:{results:sha256(bytes),observations:raw.locator.sha256,control:sha256(controlBytes)}};
await writeFile(dir+'/evidence/results.json.gz',bytes);await writeFile(dir+'/evidence/run.json',JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify({cases:24,decisions:72,available:counts,newMateQueries:0,newRawTrees:2,bytes:bytes.length}));

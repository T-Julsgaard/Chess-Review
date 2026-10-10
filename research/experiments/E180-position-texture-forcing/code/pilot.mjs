import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {forcingArchive} from './archive.mjs';
import {dir,quietArchive,graphFor} from './saved.mjs';
import {quietFixtures} from './fixtures.mjs';
import {forcingIds,quietIds} from './scopes.mjs';
import {inspectForcing} from './forcing.mjs';
import {evaluateQuiet} from './quiet.mjs';
import {checkQuiet} from './check-decisions.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),old=await forcingArchive(),raw=await quietArchive(),build=JSON.parse(await readFile(dir+'/build.json','utf8')),records=[];
// Retain the original six-case checkpoint, verifying its original recorded hash.
const smokeRun=JSON.parse(await readFile(dir+'/evidence/collection-smoke.json','utf8')),smokeBytes=gzipSync(JSON.stringify({...raw.report,rows:raw.rows.slice(0,6)}),{level:9});assert.equal(sha256(smokeBytes),smokeRun.outputs.observations);await writeFile(dir+'/evidence/observations-smoke.json.gz',smokeBytes);
for(const [index,r]of old.rows.entries()){
  const output=inspectForcing(forcingIds,r.fixture,r.result);
  records.push({family:'forcing',index,inputSha256:sha256(JSON.stringify(r.fixture)),sourceSha256:sha256(JSON.stringify(r.result)),output});
}
for(const [index,input]of quietFixtures.entries()){
  const graph=graphFor(input,raw.rows),output=evaluateQuiet({...input,...(graph?{quietPanel:graph}:{})});checkQuiet(input,output,graph);
  records.push({family:'quiet',index,inputSha256:sha256(JSON.stringify(input)),graphSha256:graph?sha256(JSON.stringify(graph)):null,output:{...output,graph:undefined}});
}
const all=records.flatMap(r=>r.family==='forcing'?r.output:r.output.decisions),counts=Object.fromEntries([...forcingIds,...quietIds].map(id=>[id,all.filter(d=>d.id===id&&d.available).length]));assert.equal(records.length,30);assert.equal(all.length,96);
const report={schema:'E180-texture-pilot-v1',datasetReceipt:data.receipt,sourceHashes:build.inputHashes,forcingArchive:old.locator,quietArchive:raw.locator,records},bytes=gzipSync(JSON.stringify(report),{level:9}),run={experiment:'E180',preregistration:'416cc85',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes:build.inputHashes,cases:30,decisions:96,available:counts,newMateQueries:0,quietTrees:12,outputs:{results:sha256(bytes),observations:raw.locator.sha256,smoke:sha256(smokeBytes)}};
await writeFile(dir+'/evidence/results.json.gz',bytes);await writeFile(dir+'/evidence/run.json',JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify({cases:30,decisions:96,available:counts,newMateQueries:0,quietTrees:12,bytes:bytes.length}));

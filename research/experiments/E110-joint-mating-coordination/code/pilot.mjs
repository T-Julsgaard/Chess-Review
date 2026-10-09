import {gzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {explainMove} from './coordination.mjs';
import {fixtures} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[];
for(const f of fixtures){
 const input={...f,scanReplies:false};
 try{const result=explainMove(input);assert.ok(!f.inputError);if(result.jointMateAnalysis.witness)checkWitness(result.jointMateAnalysis.witness,result,f);
  for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id));for(const id of f.absent||[])assert.ok(!result.events.some(e=>e.evidence?.experiment==='E110'&&e.id===id));rows.push({fixture:f,result});
 }catch(e){if(!f.inputError||!e.message.includes(f.inputError))throw e;rows.push({fixture:f,error:e.message});}
}
const out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E110/pilot';await mkdir(out,{recursive:true});
const environment={node:process.version,platform:process.platform,arch:process.arch},command=process.argv,engine=null,seed=null;
const report={environment,command,engine,seed,schema:'E110-focused-pilot-v1',source:'authored synthetic only',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 inputHashes:JSON.parse(await readFile('research/experiments/E110-joint-mating-coordination/build.json','utf8')).inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows};
const text=JSON.stringify(report)+'\n',packed=gzipSync(Buffer.from(text),{level:9});await writeFile(out+'/results.json.gz',packed);
await writeFile(out+'/run.json',JSON.stringify({schema:'E110-focused-retention-v1',sourceRevision:report.revision,environment,command,engine,seed,
 inputHashes:report.inputHashes,outputHashes:{'results.json.gz':sha256(packed)},uncompressedSha256:sha256(text),
 uncompressedBytes:Buffer.byteLength(text),compressedBytes:packed.length,cases:rows.length,
 scope:'provisional authored synthetic causal joint mating coordination pilot; full combined validation deferred'},null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:rows.length,errors:rows.filter(r=>r.error).length,witnesses:rows.filter(r=>r.result?.jointMateAnalysis.witness).length,
 bytes:Buffer.byteLength(text),compressedBytes:packed.length,sha256:sha256(text),compressedSha256:sha256(packed),out}));

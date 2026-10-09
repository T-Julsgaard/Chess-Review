import {gzipSync} from 'node:zlib';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {explainMove} from './endings.mjs';
import {bothColors} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[];
for(const f of bothColors){
 const input={fen:f.fen,move:f.move,history:f.history,scanReplies:false,endingConversionTags:true,...f.extra};
 try{const result=explainMove(input);assert.ok(!f.inputError);if(result.endingConversionAnalysis.witness)checkWitness(result.endingConversionAnalysis.witness,result,f);
  for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id));for(const id of f.absent||[])assert.ok(!result.events.some(e=>e.evidence?.experiment==='E106'&&e.id===id));rows.push({fixture:f,result});
 }catch(e){if(!f.inputError||!e.message.includes(f.inputError))throw e;rows.push({fixture:f,error:e.message});}
}
const out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E106/pilot';await mkdir(out,{recursive:true});
const report={schema:'E106-focused-pilot-v1',source:'authored synthetic only',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 inputHashes:JSON.parse(await readFile('research/experiments/E106-ending-conversion-policies/build.json','utf8')).inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows};
const text=JSON.stringify(report)+'\n',packed=gzipSync(Buffer.from(text),{level:9});await writeFile(out+'/results.json.gz',packed);
await writeFile(out+'/run.json',JSON.stringify({schema:'E106-focused-retention-v1',sourceRevision:report.revision,
 inputHashes:report.inputHashes,outputHashes:{'results.json.gz':sha256(packed)},uncompressedSha256:sha256(text),
 uncompressedBytes:Buffer.byteLength(text),compressedBytes:packed.length,cases:rows.length,
 scope:'provisional authored synthetic combined ending conversion policies pilot; full combined validation deferred'},null,2)+'\n');
console.log(JSON.stringify({passed:true,cases:rows.length,errors:rows.filter(r=>r.error).length,witnesses:rows.filter(r=>r.result?.endingConversionAnalysis.witness).length,
 bytes:Buffer.byteLength(text),compressedBytes:packed.length,sha256:sha256(text),compressedSha256:sha256(packed),out}));

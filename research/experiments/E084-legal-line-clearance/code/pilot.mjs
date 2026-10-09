import {openResearchData,sha256} from '../../../data-policy.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {explainMove} from './lines.mjs';
import {bothColors} from './fixtures.mjs';
import {checkWitness} from './check-witness.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),rows=[];
for(const f of bothColors){
 const input={fen:f.fen,move:f.move,history:f.history,scanReplies:false,lineTags:true};
 try{const result=explainMove(input);assert.ok(!f.inputError);for(const w of result.lineAnalysis.witnesses)checkWitness(w);
  for(const id of f.expected)assert.ok(result.events.some(e=>e.id===id));rows.push({fixture:f,result});
 }catch(e){if(!f.inputError||!e.message.includes(f.inputError))throw e;rows.push({fixture:f,error:e.message});}
}
const out=process.argv.includes('--out')?process.argv[process.argv.indexOf('--out')+1]:'research/runs/E084/pilot';await mkdir(out,{recursive:true});
const report={schema:'E084-focused-pilot-v1',source:'authored synthetic only',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 inputHashes:JSON.parse(await readFile('research/experiments/E084-legal-line-clearance/build.json','utf8')).inputHashes,workingTreeStatus:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,rows};
const text=JSON.stringify(report)+'\n';await writeFile(out+'/results.json',text);
console.log(JSON.stringify({passed:true,cases:rows.length,errors:rows.filter(r=>r.error).length,witnesses:rows.filter(r=>r.result?.lineAnalysis.witnesses.length).length,
 bytes:Buffer.byteLength(text),sha256:sha256(text),out}));

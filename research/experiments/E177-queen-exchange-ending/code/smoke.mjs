import {writeFile,mkdir} from 'node:fs/promises';import {gzipSync} from 'node:zlib';import assert from 'node:assert/strict';import {openResearchData} from '../../../data-policy.mjs';import {white} from './fixtures.mjs';import {explainMove} from './ending.mjs';import {checkWitness} from './check-witness.mjs';import {savedPanels,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),rows=[];await mkdir(dir+'/evidence',{recursive:true});let failed=false;
for(const input of [white[0],white[1],white[2],white[3],white[9]]){
  try{const p=saved.get(input),result=explainMove({...input,...(p?{endingPreparationPanel:p}:{})});rows.push({input,result});if(result.endingPreparationAnalysis.witness){saved.store(input,result.endingPreparationAnalysis.witness.panel);checkWitness(input,result);}const ids=result.events.filter(e=>e.evidence?.experiment==='E177').map(e=>e.id);console.log(JSON.stringify({id:input.id,status:result.endingPreparationAnalysis.status,ids,nodes:result.endingPreparationAnalysis.nodes}));assert.deepEqual(ids,input.expected);}
  catch(e){rows.push({input,error:{message:e.message,stack:e.stack}});console.log(JSON.stringify({id:input.id,error:e.message}));failed=true;}
  await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:saved.hashes,queryReuseAudit:saved.audit,rows}),{level:9}));
}
if(failed)process.exitCode=1;

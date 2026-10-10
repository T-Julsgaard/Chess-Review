import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {explainMove} from './attack.mjs';
import {white} from './fixtures.mjs';
import {savedPanels,key,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),rows=[];for(const input of [white[0],white[2],white[3],white[4]]){const found=saved.cache.get(key(input));try{const result=explainMove({...input,...(found?{attackPolicyPanel:found.panel}:{})});rows.push({input,result,reused:!!found});if(result.attackPolicyAnalysis.witness)saved.cache.set(key(input),{input,panel:result.attackPolicyAnalysis.witness.panel});console.log(JSON.stringify({id:input.id,status:result.attackPolicyAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E165').map(e=>e.id),nodes:result.attackPolicyAnalysis.nodes,reused:!!found}));}catch(e){rows.push({input,error:{message:e.message,stack:e.stack}});console.log(JSON.stringify({id:input.id,error:e.message}));}}await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {explainMove} from './attack-context.mjs';
import {white} from './fixtures.mjs';
import {savedPanels,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),rows=[];for(const input of [white[0],white[3],white[4],white[5],white[7]]){const found=saved.get(input);try{const result=explainMove({...input,...(found?{[input.attackContextMode==='development'?'developmentAttackPanel':'capacityPanel']:found.raw}:{})});rows.push({input,result,reused:!!found});if(result.attackContextAnalysis.witness)saved.store(input,result.attackContextAnalysis.witness.raw);console.log(JSON.stringify({id:input.id,status:result.attackContextAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E166').map(e=>e.id),nodes:result.attackContextAnalysis.nodes,reused:!!found,exclusive:result.attackContextAnalysis.witness?.capacity?.exclusive}));}catch(e){rows.push({input,error:{message:e.message,stack:e.stack}});console.log(JSON.stringify({id:input.id,error:e.message}));}}await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

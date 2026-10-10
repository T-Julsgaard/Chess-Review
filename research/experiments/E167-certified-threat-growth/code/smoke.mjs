import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {explainMove} from './threats.mjs';
import {white} from './fixtures.mjs';
import {savedPanels,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),rows=[];for(const input of white.slice(0,5)){const found=saved.get(input);try{const result=explainMove({...input,...(found.target?{threatGrowthPanel:found.target}:{}),...(found.root?{threatRootPanel:found.root}:{})});rows.push({input,result,targetReused:!!found.target,rootReused:!!found.root});if(result.threatGrowthAnalysis.witness)saved.store(input,result.threatGrowthAnalysis.witness);console.log(JSON.stringify({id:input.id,status:result.threatGrowthAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E167').map(e=>e.id),nodes:result.threatGrowthAnalysis.nodes,legacyPositive:!!result.threatGrowthAnalysis.witness?.component.weaknessAnalysis.witness.newSecondTarget,root:result.threatGrowthAnalysis.witness?.summaries}));}catch(e){rows.push({input,error:{message:e.message,stack:e.stack}});console.log(JSON.stringify({id:input.id,error:e.message}));}}await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {white} from './fixtures.mjs';
import {explainMove} from './king.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E163-king-placement-objectives',rows=[];for(const input of white.slice(0,6)){try{const result=explainMove(input);rows.push({input,result});console.log(JSON.stringify({id:input.id,status:result.kingPolicyAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E163').map(e=>e.id),nodes:result.kingPolicyAnalysis.nodes}));}catch(e){rows.push({input,error:e.stack});console.log(input.id+': '+e.message);}}await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({receipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

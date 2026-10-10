import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {white} from './fixtures.mjs';
import {explainMove} from './king.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E164-king-hunt-shelter',rows=[],cache=new Map();for(const input of white.slice(0,7)){const k=JSON.stringify([input.fen,input.history,input.kingChasePlies??(input.kingChaseMode==='hunt'?2:3)]);try{const result=explainMove({...input,...(cache.has(k)?{kingChasePanel:cache.get(k)}:{})});if(result.kingChaseAnalysis.witness)cache.set(k,result.kingChaseAnalysis.witness.panel);rows.push({input,result});console.log(JSON.stringify({id:input.id,status:result.kingChaseAnalysis.status,ids:result.events.filter(e=>e.evidence?.experiment==='E164').map(e=>e.id),nodes:result.kingChaseAnalysis.nodes,hunt:result.kingChaseAnalysis.witness?.hunt,shelter:result.kingChaseAnalysis.witness?.shelter}));}catch(e){rows.push({input,error:e.stack});console.log(input.id+': '+e.message);}}await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({receipt:data.receipt,sourceHashes:await bindings([dir+'/code/smoke.mjs']),rows}),{level:9}));

import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {roots} from './fixtures.mjs';
import {evaluateKingRoute} from './routes.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E184-king-route-conversion/evidence';await mkdir(dir,{recursive:true});
const rows=[];for(const r of roots){const start=performance.now();try{const result=evaluateKingRoute(r.input,r.options);rows.push({...r,result,milliseconds:performance.now()-start});console.log(JSON.stringify({id:r.id,status:result.status,nodes:result.nodes,claims:result.claims,route:result.witness&&[result.witness.actualRoute.distance,result.witness.alternativeRoute.distance],milliseconds:performance.now()-start}));}catch(e){rows.push({...r,error:String(e),milliseconds:performance.now()-start});console.log(JSON.stringify({id:r.id,error:String(e)}));}}
await writeFile(dir+'/corrected-smoke.json.gz',gzipSync(JSON.stringify({receipt:data.receipt,rows}),{level:9}));

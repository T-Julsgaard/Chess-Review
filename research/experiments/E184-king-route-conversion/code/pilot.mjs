import {readFile,writeFile} from 'node:fs/promises';import {gzipSync,gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';import {boardFen} from '../../FRIEND-shared/lib.mjs';
import {evaluateKingRoute,inspectKingRoute} from './routes.mjs';import {checkKingRoute} from './check-result.mjs';import {dir,fullBindings} from './source.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),raw=await readFile(dir+'/evidence/corrected-smoke.json.gz'),panels=JSON.parse(gunzipSync(raw));
const rows=[];function add(id,input,options,source=null,collect=false){
 const r=panels.rows.find(r=>r.id===source),o={...options,...(source?{proofs:r.result.witness.queries}:{})},result=collect?evaluateKingRoute(input,o):inspectKingRoute(input,o);
 checkKingRoute(input,o,result);
 const stored=structuredClone(result);if(source&&stored.witness)delete stored.witness.queries;
 rows.push({id,input,options,source,result:stored});console.log(JSON.stringify({id,status:result.status,nodes:result.nodes,claims:result.claims}));
}
for(const r of panels.rows.filter(r=>r.id.startsWith('outflanking'))){
 add(r.id,r.input,r.options,r.id);
 add(r.id+'-snapshot',{...r.input,history:{fen:r.input.fen,moves:[]}},r.options,r.id);
 const missing={fen:r.input.fen,move:r.input.move};add(r.id+'-missing-history',missing,r.options,r.id);
 add(r.id+'-zero-budget',r.input,{...r.options,maxNodes:0},r.id);
 add(r.id+'-disabled',r.input,{...r.options,enabled:false},r.id);
 // Material control is authored independently, then reflected by actor.
 const extra=r.id.endsWith('-black')?boardFen({e3:'k',f3:'p',a7:'p',d1:'K'},'b'):boardFen({e6:'K',f6:'P',a2:'P',d8:'k'});
 add(r.id+'-extra-pawn',{fen:extra,move:r.input.move,history:{fen:extra,moves:[]}},r.options,r.id);
 add(r.id+'-zero-horizon',r.input,{...r.options,plies:0},null,true);
}
for(const r of panels.rows.filter(r=>r.id.startsWith('shouldering')))add(r.id+'-noncausal-control',r.input,r.options,r.id);
const sourceHashes=await fullBindings(),payload={schema:'E184-pilot-v1',datasetReceipt:data.receipt,sourceHashes,panelSha256:sha256(raw),rows},packed=gzipSync(JSON.stringify(payload),{level:9});
await writeFile(dir+'/evidence/pilot.json.gz',packed);
const positives={};for(const row of rows)for(const [id,value] of Object.entries(row.result.claims))if(value)positives[id]=(positives[id]||0)+1;
await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E184',preregistration:'91195905c2274e9526161232915b69df6d81c8fd',firstAmendment:'5f37ed5bd08516e5a2dbe70636de93b9d94aefaf',rootAmendment:'e313fa1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,outputs:{pilot:sha256(packed),panels:sha256(raw)},cases:rows.length,decisions:rows.length*4,positives,scope:'Exposed authored synthetic development; only comparative recorded outflanking ready, shouldering positive gate unresolved; combined acceptance deferred.'},null,2)+'\n');

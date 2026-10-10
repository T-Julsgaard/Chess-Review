import {readFile,writeFile} from 'node:fs/promises';import {gzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';import {archives} from './archive.mjs';import {dir,fullBindings} from './source.mjs';
import {inspectKingRoute,evaluateKingRoute} from '../../E184-king-route-conversion/code/routes.mjs';import {checkKingRoute} from '../../E184-king-route-conversion/code/check-result.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),a=await archives(),rows=[];
function add(id,input,options,source,collect=false){const panel=source?a.lookup(source):null,o={...options,...(panel?{proofs:panel.result.witness.queries}:{})},result=collect?evaluateKingRoute(input,o):inspectKingRoute(input,o);checkKingRoute(input,o,result);const stored=structuredClone(result);if(panel&&stored.witness)delete stored.witness.queries;rows.push({id,input,options,source,result:stored});console.log(JSON.stringify({id,status:result.status,nodes:result.nodes,claims:result.claims}));}
for(const r of a.fresh.rows){const source={archive:'fresh',id:r.id},black=r.id.endsWith('-black');
 add(r.id,r.input,r.options,source);
 add(r.id+'-missing-history',{fen:r.input.fen,move:r.input.move},r.options,source);
 add(r.id+'-disabled',r.input,{...r.options,enabled:false},source);
 add(r.id+'-zero-cap',r.input,{...r.options,maxNodes:0},source);
 add(r.id+'-zero-horizon',r.input,{...r.options,plies:0},null,true);
 for(const id of ['shouldering','outflanking']){const old=a.old.rows.find(r=>r.id===id+(black?'-black':''));add(r.id+'-'+(id==='shouldering'?'noncausal':'direct-protection'),old.input,old.options,{archive:'old',id:old.id});}
}
const sourceHashes=await fullBindings(),packed=gzipSync(JSON.stringify({schema:'E185-pilot-v1',datasetReceipt:data.receipt,sourceHashes,panelHashes:a.hashes,rows}),{level:9});await writeFile(dir+'/evidence/pilot.json.gz',packed);
const positives={C0622:0,C0639:0};for(const r of rows)for(const id of Object.keys(positives))if(r.result.claims[id])positives[id]++;
await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E185',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),preregistration:JSON.parse(await readFile(dir+'/evidence/collection.json','utf8')).preregistration,argv:process.argv,node:process.version,platform:process.platform,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,panelHashes:a.hashes,outputs:{pilot:sha256(packed)},cases:rows.length,shoulderDecisions:rows.length*2,sourceDecisions:rows.length*4,positives,reuse:'Two new H6 panels collected once, four old E184 controls reused exactly. Two tiny H0 queries fresh; old/outflanking positives never counted as new shoulder coverage.'},null,2)+'\n');

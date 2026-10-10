import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {savedTrees} from '../../E146-retrograde-calculation/code/saved-trees.mjs';
import {quietArchive} from '../../E180-position-texture-forcing/code/saved.mjs';
import {archive} from './archive.mjs';
const dir='research/experiments/E181-historical-forcing-resources',data=await openResearchData(['D001'],{purpose:'test'}),old=await archive('conversion'),legacy=await savedTrees(),quiet=await quietArchive(),mode=process.argv[2];assert.ok(['smoke','finish'].includes(mode));
const sourceHashes=await bindings([dir+'/code/collect.mjs']),file=dir+'/evidence/observations.json.gz',key=f=>({fen:f.fen,history:f.history,move:f.move,plies:2});await mkdir(dir+'/evidence',{recursive:true});let rows=[];
try{const prior=JSON.parse(gunzipSync(await readFile(file)));assert.deepEqual(prior.sourceHashes,sourceHashes);assert.deepEqual(prior.datasetReceipt,data.receipt);rows=prior.rows;}catch(e){if(e.code!=='ENOENT')throw e;}
if(mode==='finish')assert.equal(rows.length,1,'Smoke checkpoint required');let collected=0,reused=0;
for(const sourceRow of old.rows.slice(6,mode==='smoke'?7:8)){
 const input=sourceRow.input,k=key(input),existing=rows.find(r=>JSON.stringify(r.key)===JSON.stringify(k));if(existing){verifyTree({...input,retrogradeCalculationPlies:2},existing.graph);reused++;continue;}
 const found=[...legacy.rows,...old.raw.rows,...quiet.rows].find(r=>r.graph.before===input.fen&&r.graph.played===input.move&&r.graph.plies===2&&JSON.stringify(r.graph.history)===JSON.stringify(input.history));
 const graph=found?found.graph:collectTree(input,2,50000);verifyTree({...input,retrogradeCalculationPlies:2},graph);rows.push({sourceIndex:sourceRow.index,key:k,input,graph,origin:found?'exact-graph-reuse':'E146-frozen-collector'});found?reused++:collected++;
 const report={schema:'E181-current-trees-v1',datasetReceipt:data.receipt,sourceHashes,archive:old.locator,rows};const packed=gzipSync(JSON.stringify(report),{level:9});await writeFile(file,packed);if(mode==='smoke')await writeFile(dir+'/evidence/smoke.json.gz',packed);
}
const bytes=await readFile(file),run={experiment:'E181',preregistration:'5eb8dcb',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,mode,plies:2,collectorCap:50000,cases:rows.length,collected,reused,outputs:{observations:sha256(bytes)}};
await writeFile(dir+'/evidence/collection-'+mode+'.json',JSON.stringify(run,null,2)+'\n');console.log(JSON.stringify({mode,cases:rows.length,collected,reused,nodes:rows.map(r=>r.graph.nodes),bytes:bytes.length}));

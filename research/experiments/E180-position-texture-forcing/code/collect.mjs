import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {savedTrees} from '../../E146-retrograde-calculation/code/saved-trees.mjs';
import {quietFixtures,treeKey} from './fixtures.mjs';
const dir='research/experiments/E180-position-texture-forcing',data=await openResearchData(['D001'],{purpose:'test'}),old=await savedTrees(),mode=process.argv[2];
assert.ok(['smoke','finish'].includes(mode),'Specify smoke or finish');
const sourceHashes=await bindings([dir+'/code/collect.mjs',dir+'/code/fixtures.mjs']),file=dir+'/evidence/observations.json.gz';
await mkdir(dir+'/evidence',{recursive:true});let rows=[];
try{const saved=JSON.parse(gunzipSync(await readFile(file)));assert.equal(saved.schema,'E180-quiet-trees-v1');assert.deepEqual(saved.datasetReceipt,data.receipt);assert.deepEqual(saved.sourceHashes,sourceHashes);rows=saved.rows;}catch(e){if(e.code!=='ENOENT')throw e;}
let collected=0,reused=0;
const selected=quietFixtures.slice(0,12).filter((f,i)=>mode==='finish'||i%2===0);
if(mode==='finish')assert.ok(rows.length>=6,'Smoke checkpoint required');
for(const input of selected){
  const key=treeKey(input),same=r=>JSON.stringify(r.key)===JSON.stringify(key);let row=rows.find(same);
  if(row){verifyTree({...input,retrogradeCalculationPlies:2},row.graph);reused++;continue;}
  const prior=old.rows.find(same),graph=prior?prior.graph:collectTree(input,2,50000);verifyTree({...input,retrogradeCalculationPlies:2},graph);
  rows.push({key,input,graph,origin:prior?'E146-exact-cache':'E146-frozen-collector'});prior?reused++:collected++;
  const report={schema:'E180-quiet-trees-v1',datasetReceipt:data.receipt,sourceHashes,rows};
  await writeFile(file,gzipSync(JSON.stringify(report),{level:9}));
}
const bytes=await readFile(file),run={experiment:'E180',preregistration:'416cc85',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes,mode,cases:rows.length,collected,reused,outputs:{observations:sha256(bytes)}};
await writeFile(dir+'/evidence/collection-'+mode+'.json',JSON.stringify(run,null,2)+'\n');
console.log(JSON.stringify({mode,cases:rows.length,collected,reused,bytes:bytes.length,maxNodes:Math.max(...rows.map(r=>r.graph.nodes))}));

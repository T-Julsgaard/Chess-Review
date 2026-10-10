import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {fixtures} from './fixtures.mjs';
import {collectTree} from './tree.mjs';
import {verifyTree} from './verify-tree.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),dir='research/experiments/E146-retrograde-calculation',sourceHashes=await bindings([dir+'/code/tree.mjs',dir+'/code/fixtures.mjs']),smoke=JSON.parse(await readFile('research/runs/E146/smoke/observations.json','utf8'));assert.deepEqual(smoke.sourceHashes,sourceHashes);const rows=[];let reusedSmoke=0;
for(const f of fixtures){if(!f.history||f.maxRetrogradeCalculationNodes===0)continue;const key={fen:f.fen,history:f.history,move:f.move,plies:f.retrogradeCalculationPlies??2};if(rows.some(r=>JSON.stringify(r.key)===JSON.stringify(key)))continue;const initial=smoke.rows.find(r=>JSON.stringify(r.key)===JSON.stringify(key)),graph=initial?initial.graph:collectTree(f,key.plies,50000);if(initial)reusedSmoke++;verifyTree(f,graph);rows.push({key,graph});}
await mkdir(dir+'/evidence',{recursive:true});const packed=gzipSync(Buffer.from(JSON.stringify({schema:'E146-saved-trees-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),eligibilityReceipt:data.receipt,sourceHashes,reusedSmoke,rows})+'\n'),{level:9});await writeFile(dir+'/evidence/observations.json.gz',packed);console.log(JSON.stringify({trees:rows.length,reusedSmoke,newlyCollected:rows.length-reusedSmoke,sourceInputs:Object.keys(sourceHashes).length,treeNodes:rows.map(r=>r.graph.tree.length),collectionNodes:rows.map(r=>r.graph.nodes),compressedBytes:packed.length}));

import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {white} from './fixtures.mjs';
import {explainMove} from './weakness.mjs';
import {savedPanels,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),rows=[];
for(const input of white.slice(0,3)){const p=saved.get(input),result=explainMove({...input,...(p?{forcedWeaknessPanel:p}:{})});rows.push({input,result});console.log(JSON.stringify({id:input.id,status:result.forcedWeaknessAnalysis.status,nodes:result.forcedWeaknessAnalysis.nodes,branches:result.forcedWeaknessAnalysis.witness?.branches}));}
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/smoke.json.gz',gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:saved.hashes,rows}),{level:9}));
for(const {input,result}of rows)assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E168').map(e=>e.id),input.expected,input.id);

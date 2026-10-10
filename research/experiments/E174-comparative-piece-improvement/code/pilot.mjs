import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {openResearchData} from '../../../data-policy.mjs';
import {fixtures} from './fixtures.mjs';
import {explainMove} from './improvement.mjs';
import {explainMove as parent} from '../../E173-declared-objective-plans/code/plans.mjs';
import {checkWitness} from './check-witness.mjs';
import {savedPanels,key,dir} from './saved.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),saved=await savedPanels(),build=JSON.parse(await readFile(dir+'/build.json','utf8')),rows=[],raw=new Map();let reused=0,fresh=0;
for(const input of fixtures){const p=saved.get(input),result=explainMove({...input,...(p?{improvementPanel:p}:{})});assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E174').map(e=>e.id),input.expected,input.id);const w=result.improvementAnalysis.witness;if(w){checkWitness(input,result);if(p)reused++;else fresh++;saved.store(input,w.panel);raw.set(key(input),{input,panel:w.panel});}const inherited=parent(input);assert.ok(isDeepStrictEqual(explainMove({...input,improvementTags:false}),inherited));rows.push({input,result,inherited});}
const observations=gzipSync(JSON.stringify({datasetReceipt:data.receipt,sourceHashes:saved.hashes,rows:[...raw.values()]}),{level:9}),results=gzipSync(JSON.stringify({rows}),{level:9}),hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(dir+'/evidence',{recursive:true});await writeFile(dir+'/evidence/observations.json.gz',observations);await writeFile(dir+'/evidence/results.json.gz',results);await writeFile(dir+'/evidence/run.json',JSON.stringify({experiment:'E174',preregistration:'fc10de4',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,arch:process.arch,os:os.release(),engine:null,seed:null,datasetReceipt:data.receipt,sourceHashes:build.inputHashes,outputs:{observations:hash(observations),results:hash(results)},cases:rows.length,witnesses:rows.filter(r=>r.result.improvementAnalysis.witness).length,positives:rows.filter(r=>r.input.expected.length).length,reused,fresh},null,2)+'\n');console.log(JSON.stringify({cases:rows.length,witnesses:raw.size,reused,fresh,bytes:observations.length+results.length}));

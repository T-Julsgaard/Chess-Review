import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {fixtures} from './fixtures.mjs';
import {evaluateOrderResources} from './resources.mjs';
import {checkResult} from './check-result.mjs';
import {dir} from './source.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),file=dir+'/evidence/smoke.json.gz';try{await readFile(file);throw Error('Smoke exists: reuse instead of recollection');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=[];await mkdir(dir+'/evidence',{recursive:true});
for(const f of fixtures){let result,error;try{result=evaluateOrderResources(f.input,f.options);}catch(e){error=e.stack;}rows.push({...f,result,error});await writeFile(file,gzipSync(JSON.stringify({schema:'E188-smoke-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,receipt:data.receipt,sourceHashes:await bindings([dir+'/code/collect-smoke.mjs']),rows}),{level:9}));if(error)throw Error(error);checkResult(f.input,f.options,result.proofs,result);const ids=Object.keys(result.claims).filter(k=>result.claims[k]);assert.deepEqual(ids,f.expected,f.id);console.log(JSON.stringify({id:f.id,ids,nodes:result.nodes,actualResources:result.witness.actualResources,removedResources:result.witness.removedResources}));}

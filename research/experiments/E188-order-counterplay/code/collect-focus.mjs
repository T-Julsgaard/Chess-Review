import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {focusFixtures} from './focus-fixtures.mjs';
import {evaluateOrderResources} from './resources.mjs';
import {checkResult} from './check-result.mjs';
import {dir} from './source.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),file=dir+'/evidence/focus.json.gz';try{await readFile(file);throw Error('Focus exists: reuse instead of recollection');}catch(e){if(e.code!=='ENOENT')throw e;}
const rows=[];for(const f of focusFixtures){let result,error;try{result=evaluateOrderResources(f.input,f.options);}catch(e){error=e.stack;}rows.push({...f,result,error});await writeFile(file,gzipSync(JSON.stringify({schema:'E188-focus-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,receipt:data.receipt,sourceHashes:await bindings([dir+'/code/collect-focus.mjs']),rows}),{level:9}));if(error)throw Error(error);checkResult(f.input,f.options,result.proofs,result);assert.deepEqual(Object.keys(result.claims).filter(k=>result.claims[k]),f.expected,f.id);if(f.status)assert.equal(result.status,f.status);console.log(JSON.stringify({id:f.id,claims:result.claims,status:result.status,nodes:result.nodes,material:result.proofs?.actualCaptures.rows.map(r=>({move:r.move,gain:r.minimumGain,positive:r.positive}))}));}

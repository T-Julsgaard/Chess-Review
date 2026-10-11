import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {openResearchData} from '../../../data-policy.mjs';
import {bindings} from '../../E138-bounded-engine-panels/code/source-bindings.mjs';
import {cases} from './fixtures.mjs';
import {evaluatePairedChoices,inspectPairedChoices} from './choices.mjs';
import {checkResult} from './check-result.mjs';
import {dir} from './source.mjs';
const data=await openResearchData(['D001'],{purpose:'test'}),path=dir+'/evidence/focus.json.gz';
try{await readFile(path);throw Error('Focus already retained; reuse, do not recollect');}catch(e){if(e.code!=='ENOENT')throw e;}
const f=cases[0],parts=f.input.fen.split(' ');parts[4]='99';const fen=parts.join(' '),input={...f.input,fen,history:{fen,moves:[]}},options={...f.options,plies:0},result=evaluatePairedChoices(input,options);
await writeFile(path,gzipSync(JSON.stringify({schema:'E187-focused-collection-v1',revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),argv:process.argv,node:process.version,platform:process.platform,receipt:data.receipt,sourceHashes:await bindings([dir+'/code/collect-focus.mjs']),input,options,result}),{level:9}));
assert.equal(result.status,'claim-rule-prerequisite');assert.deepEqual(result.ids,[]);assert.deepEqual(inspectPairedChoices(input,options,result.panel),result);checkResult(input,options,result.panel,result);console.log(JSON.stringify({passed:true,status:result.status,nodes:result.nodes,rows:result.panel.rows.length,fresh:1}));

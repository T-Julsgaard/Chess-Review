import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {loadBoard,extract} from './board.mjs';
import {makePolicy,baselineRevision} from './policy.mjs';
if(process.argv.length!==2)throw Error('No arguments supported');
const access=await openResearchData(['D001'],{purpose:'reuse'}),root=fileURLToPath(new URL('../../../../',import.meta.url)),file=fileURLToPath(new URL('../../../../engine/stockfish-nnue.js',import.meta.url)),board=await loadBoard(),
  baseline=execFileSync('git',['show',baselineRevision+':analysis.js'],{cwd:root,encoding:'utf8',windowsHide:true});
if(sha256(extract(baseline))!==board.blockSha256)throw Error('Board predicate differs from B000');
const configs={'20k':await engineConfig(file,{kind:'nodes',value:20000}),'80k':await engineConfig(file,{kind:'nodes',value:80000})},policy=makePolicy(configs,board.blockSha256),out=new URL('../evidence/',import.meta.url);
await mkdir(out,{recursive:true});await writeFile(new URL('policy.json',out),JSON.stringify(policy,null,2)+'\n');
await writeFile(new URL('freeze-run.json',out),JSON.stringify({schema:'research-run-v1',id:'E012-policy-freeze',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),command:'node research/experiments/E012-offer-evidence/code/freeze.mjs',dataEligibility:access.receipt,
  baselineRevision,boardBlockSha256:board.blockSha256,engineConfigs:configs,codeSha256:Object.fromEntries(await Promise.all(['freeze.mjs','policy.mjs','board.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),
  engineSearches:0,modelFits:0,caseInspection:0,outputs:{'policy.json':sha256(await readFile(new URL('policy.json',out)))}},null,2)+'\n');
console.log(JSON.stringify({frozen:true,boardMatchesB000:true,policySha256:sha256(JSON.stringify(policy)),registered:false}));

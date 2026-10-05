import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {loadInputs} from './inputs.mjs';
import {evaluate} from './method.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'reuse'}),{high,low,freeze,metadata}=await loadInputs(access),result=evaluate(high,low,freeze,metadata),bytes=JSON.stringify(result,null,2)+'\n';
if(bytes.length>1024*1024||performance.now()-started>5*60*1000)throw Error('Registered compute/storage budget exceeded');
await mkdir(out,{recursive:true});await writeFile(path.join(out,'results.json'),bytes);
await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E010-fixed-model-probability-stability',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
  command:'node research/experiments/E010-candidate-stability/code/evaluate.mjs'+(args.length?' --out '+args[1]:''),dataEligibility:access.receipt,
  codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','method.mjs','inputs.mjs','models.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
  modelsSha256:freeze.modelsSha256,environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,modelFits:0,networkRequests:0,elapsedMs:performance.now()-started,
  outputs:{'results.json':sha256(bytes)},evaluationRole:'45 cached development games; operational probability stability, no reserved300 access'},null,2)+'\n');
console.log(JSON.stringify({summary:result.summary,improvement:result.improvement,gates:result.gates,passed:result.passed,modelFits:0,engineSearches:0},null,2));

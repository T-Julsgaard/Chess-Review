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
const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'test'}),{prepared,freeze}=await loadInputs(access),result=evaluate(prepared,freeze),bytes=JSON.stringify(result,null,2)+'\n';
await mkdir(out,{recursive:true});await writeFile(path.join(out,'results.json'),bytes);
await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E011-locked-outcome-confirmation',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
  command:'node research/experiments/E011-outcome-confirmation/code/evaluate.mjs'+(args.length?' --out '+args[1]:''),dataEligibility:access.receipt,
  codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','method.mjs','inputs.mjs','models.mjs','prepare.mjs','queries.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
  curvesSha256:freeze.curvesSha256,environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,modelFits:0,elapsedMs:performance.now()-started,
  outputs:{'results.json':sha256(bytes)},evaluationRole:'First frozen outcome-model evaluation on predefined300 reserved games, CP-only two-budget panel'},null,2)+'\n');
console.log(JSON.stringify({diagnostics:result.diagnostics,modes:Object.fromEntries(Object.entries(result.modes).map(([m,r])=>[m,{metrics:r.metrics,fixedGain:r.fixedImprovement,constantGain:r.constantImprovement,gates:r.gates}])),stability:{successes:result.stability.successes,n:result.stability.n,lower:result.stability.lower,maximum:result.stability.maximum},gates:result.gates,passed:result.passed},null,2));

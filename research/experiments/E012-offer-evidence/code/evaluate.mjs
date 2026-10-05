import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {loadInputs} from './inputs.mjs';
import {evaluate} from './method.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
const started=performance.now(),access=await openResearchData(['D001'],{purpose:'analyze'}),{prepared,policy,board,pack}=await loadInputs(access),result=evaluate(prepared,policy,board),bytes=JSON.stringify(result,null,2)+'\n';
await mkdir(out,{recursive:true});await writeFile(path.join(out,'results.json'),bytes);
await writeFile(path.join(out,'run.json'),JSON.stringify({schema:'research-run-v1',id:'E012-frozen-offer-audit',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),command:'node research/experiments/E012-offer-evidence/code/evaluate.mjs'+(args.length?' --out '+args[1]:''),dataEligibility:access.receipt,
  codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','method.mjs','inputs.mjs','prepare.mjs','cohort.mjs','queries.mjs','policy.mjs','board.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),policySha256:sha256(JSON.stringify(policy)),packId:pack.packId,boardBlockSha256:board.blockSha256,environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,modelFits:0,humanLabelsUsed:0,elapsedMs:performance.now()-started,outputs:{'results.json':sha256(bytes)},evaluationRole:'Operational property screen on enriched D001 training cases, no human validity/confirmation'},null,2)+'\n');
console.log(JSON.stringify({diagnostics:result.diagnostics,summary:result.summary,gates:result.gates,passed:result.passed,humanReviews:0,categoryImprovementConfirmed:false},null,2));

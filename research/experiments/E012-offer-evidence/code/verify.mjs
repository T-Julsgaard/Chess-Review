import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {loadInputs,prefix} from './inputs.mjs';
import {evaluate} from './method.mjs';
import {audit} from './audit.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
const started=performance.now(),access=await openResearchData(['D001'],{purpose:'reuse'}),{prepared,policy,board,dataset}=await loadInputs(access),saved=await access.readJson(prefix+'results.json'),replay=evaluate(prepared,policy,board);
if(JSON.stringify(saved)!==JSON.stringify(replay))throw Error('Exact offer audit replay differs');const independent=audit(prepared,policy,board,saved,dataset),result={schema:'E012-verification-v1',passed:true,exactReport:true,independent,dataEligibility:access.receipt,
  sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),command:'node research/experiments/E012-offer-evidence/code/verify.mjs'+(args.length?' --out '+args[1]:''),codeSha256:Object.fromEntries(await Promise.all(['verify.mjs','audit.mjs','method.mjs','cohort.mjs','queries.mjs','prepare.mjs','inputs.mjs','policy.mjs','board.mjs'].map(async name=>[name,sha256(await readFile(new URL(name,import.meta.url)))]))),engineSearches:0,modelFits:0,elapsedMs:performance.now()-started};
await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({passed:true,exactReport:true,independent,engineSearches:0,elapsedMs:result.elapsedMs},null,2));

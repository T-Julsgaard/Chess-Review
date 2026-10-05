import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {loadInputs} from './inputs.mjs';
import {evaluate} from './method.mjs';
import {audit} from './audit.mjs';
const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'reuse'}),{high,low,freeze,metadata}=await loadInputs(access),
  result=await access.readJson('research/experiments/E010-candidate-stability/evidence/results.json'),replay=evaluate(high,low,freeze,metadata);
if(JSON.stringify(result)!==JSON.stringify(replay))throw Error('Numerical replay differs');const independent=audit(high,low,freeze,result),verified={schema:'E010-verification-v1',passed:true,exactReport:true,independent,
  codeSha256:Object.fromEntries(await Promise.all(['verify.mjs','audit.mjs','method.mjs','inputs.mjs','models.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
  dataEligibility:access.receipt,sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),command:'node research/experiments/E010-candidate-stability/code/verify.mjs'+(args.length?' --out '+args[1]:''),
  engineSearches:0,modelFits:0,elapsedMs:performance.now()-started};await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(verified,null,2)+'\n');
console.log(JSON.stringify({passed:true,exactReport:true,independent,engineSearches:0,modelFits:0,elapsedMs:verified.elapsedMs},null,2));

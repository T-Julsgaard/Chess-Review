import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {prepare} from '../../E008-human-quality-curves/code/prepare.mjs';
import {evaluate} from './evaluate.mjs';
import {audit} from './audit.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'reuse'}),dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),
  baseline=await access.readJson('research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz'),evidence=await access.readJson('research/experiments/E009-search-stability/evidence/sf19-observations.json.gz'),
  result=await access.readJson('research/experiments/E009-search-stability/evidence/results.json'),file=path.join(root,'engine/stockfish-19-lite-single.js');
prepare(baseline,dataset,await engineConfig(file,{kind:'nodes',value:20000}));
const replay=evaluate(evidence,baseline,await engineConfig(file,{kind:'nodes',value:80000}));if(JSON.stringify(result)!==JSON.stringify(replay))throw Error('Numerical replay differs');
const independent=audit(evidence,baseline,result),verification={schema:'E009-verification-v1',passed:true,exactReport:true,independent,
  codeSha256:Object.fromEntries(await Promise.all(['verify.mjs','audit.mjs','evaluate.mjs','method.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
  dataEligibility:access.receipt,sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
  command:'node research/experiments/E009-search-stability/code/verify.mjs'+(args.length?' --out '+args[1]:''),engineSearches:0,elapsedMs:performance.now()-started};
await mkdir(out,{recursive:true});await writeFile(path.join(out,'verification.json'),JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({passed:true,exactReport:true,independent,engineSearches:0,elapsedMs:verification.elapsedMs},null,2));

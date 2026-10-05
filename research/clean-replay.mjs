import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from './data-policy.mjs';
import {engineConfig} from '../tools/calibration/engine.mjs';
import {prepare} from './experiments/E008-human-quality-curves/code/prepare.mjs';
import {evaluate as evaluateCurves} from './experiments/E008-human-quality-curves/code/evaluate.mjs';
import {audit as auditCurves} from './experiments/E008-human-quality-curves/code/audit.mjs';
import {evaluate as evaluateStability} from './experiments/E009-search-stability/code/evaluate.mjs';
import {audit as auditStability} from './experiments/E009-search-stability/code/audit.mjs';

// Run only from an externally extracted Git archive. The operator supplies its
// exact commit and retains the archive command/hash alongside this receipt.
const [experiment,revision,...extra]=process.argv.slice(2),root=fileURLToPath(new URL('../',import.meta.url));
if(!['E008','E009'].includes(experiment)||!/^([a-f0-9]{40})$/.test(revision||'')||extra.length)throw Error('Use clean-replay.mjs E008|E009 <archive commit SHA>');
try{await stat(path.join(root,'.git'));throw Error('Clean replay requires a snapshot without .git');}catch(e){if(e.code!=='ENOENT')throw e;}
const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'reuse'}),
  dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),
  basePath='research/experiments/E008-human-quality-curves/',base=await access.readJson(basePath+'evidence/sf19-observations.json.gz'),
  file=path.join(root,'engine/stockfish-19-lite-single.js'),prepared=prepare(base,dataset,await engineConfig(file,{kind:'nodes',value:20000})),
  active=experiment==='E008'?basePath:'research/experiments/E009-search-stability/',run=await access.readJson(active+'evidence/run.json'),
  saved=await access.readJson(active+'evidence/results.json');
for(const [name,expected] of Object.entries(run.codeSha256)){
  if(sha256(await readFile(path.join(root,active,'code',name)))!==expected)throw Error('Clean snapshot scoring code differs from fitted run: '+name);
}
let exactPredictions=null,independent;
if(experiment==='E008'){
  const records=await access.readJson(active+'evidence/predictions.json.gz'),replay=evaluateCurves(prepared);
  if(JSON.stringify(replay.result)!==JSON.stringify(saved)||JSON.stringify(replay.records)!==JSON.stringify(records))throw Error('Clean curve replay differs');
  exactPredictions=true;independent=auditCurves(prepared,saved,records);
}else{
  const evidence=await access.readJson(active+'evidence/sf19-observations.json.gz'),replay=evaluateStability(evidence,base,await engineConfig(file,{kind:'nodes',value:80000}));
  if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean stability replay differs');independent=auditStability(evidence,base,saved);
}
const result={schema:'research-clean-replay-v1',experiment,passed:true,snapshotRevision:revision,exactReport:true,exactPredictions,independent,
  dataEligibility:access.receipt,codeSha256:sha256(await readFile(fileURLToPath(import.meta.url))),
  environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,networkRequests:0,ignoredInputs:0,nodeDependencies:0,elapsedMs:performance.now()-started};
const out=path.join(root,'research/runs/clean',experiment);await mkdir(out,{recursive:true});await writeFile(path.join(out,'clean-replay.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({experiment,passed:true,exactReport:true,exactPredictions,independent,engineSearches:0,elapsedMs:result.elapsedMs},null,2));

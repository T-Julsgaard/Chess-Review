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
import {loadInputs as loadCandidateInputs} from './experiments/E010-candidate-stability/code/inputs.mjs';
import {evaluate as evaluateCandidate} from './experiments/E010-candidate-stability/code/method.mjs';
import {audit as auditCandidate} from './experiments/E010-candidate-stability/code/audit.mjs';
import {loadInputs as loadOutcomeInputs} from './experiments/E011-outcome-confirmation/code/inputs.mjs';
import {evaluate as evaluateOutcome} from './experiments/E011-outcome-confirmation/code/method.mjs';
import {audit as auditOutcome} from './experiments/E011-outcome-confirmation/code/audit.mjs';
import {loadInputs as loadOfferInputs} from './experiments/E012-offer-evidence/code/inputs.mjs';
import {evaluate as evaluateOffer} from './experiments/E012-offer-evidence/code/method.mjs';
import {audit as auditOffer} from './experiments/E012-offer-evidence/code/audit.mjs';
import {loadInputs as loadNetInputs} from './experiments/E013-net-offer-pack/code/inputs.mjs';
import {evaluate as evaluateNet} from './experiments/E013-net-offer-pack/code/method.mjs';
import {audit as auditNet} from './experiments/E013-net-offer-pack/code/audit.mjs';
import {select as selectNet} from './experiments/E013-net-offer-pack/code/selection.mjs';
import {loadInputs as loadRootInputs} from './experiments/E014-root-pair-consistency/code/inputs.mjs';
import {evaluate as evaluateRoot,readResults as readRootResults} from './experiments/E014-root-pair-consistency/code/method.mjs';
import {audit as auditRoot} from './experiments/E014-root-pair-consistency/code/audit.mjs';
import {verifyArchivedSource} from './source-replay.mjs';

// Run only from an externally extracted Git archive. The operator supplies its
// exact commit and retains the archive command/hash alongside this receipt.
const [experiment,revision,...extra]=process.argv.slice(2),root=fileURLToPath(new URL('../',import.meta.url));
if(!['E008','E009','E010','E011','E012','E013','E014'].includes(experiment)||!/^([a-f0-9]{40})$/.test(revision||'')||extra.length)throw Error('Use clean-replay.mjs E008|E009|E010|E011|E012|E013|E014 <archive commit SHA>');
try{await stat(path.join(root,'.git'));throw Error('Clean replay requires a snapshot without .git');}catch(e){if(e.code!=='ENOENT')throw e;}
const started=performance.now(),access=await openResearchData(['E012','E013'].includes(experiment)?['D001']:['D001','D002'],{purpose:'reuse'}),
  active={E008:'research/experiments/E008-human-quality-curves/',E009:'research/experiments/E009-search-stability/',E010:'research/experiments/E010-candidate-stability/',E011:'research/experiments/E011-outcome-confirmation/',E012:'research/experiments/E012-offer-evidence/',E013:'research/experiments/E013-net-offer-pack/',E014:'research/experiments/E014-root-pair-consistency/'}[experiment],run=await access.readJson(active+'evidence/'+(experiment==='E014'?'run-SF18.json':'run.json')),
  saved=experiment==='E014'?await readRootResults(access,active):await access.readJson(active+'evidence/results.json');
for(const [name,expected] of Object.entries(run.codeSha256)){
  if(sha256(await readFile(path.join(root,active,'code',name)))!==expected)throw Error('Clean snapshot scoring code differs from fitted run: '+name);
}
let exactPredictions=null,independent;
const lineEndingEquivalence={},sourceBindings=experiment==='E014'?await access.readJson(active+'evidence/source-line-endings-SF18.json'):null;
if(sourceBindings){const other=await access.readJson(active+'evidence/source-line-endings-SF19.json');if(sourceBindings.schema!=='research-source-line-endings-v1'||JSON.stringify(sourceBindings.files)!==JSON.stringify(other.files)||Object.keys(sourceBindings.files).some(p=>!Object.hasOwn(run.sharedCodeSha256,p)||!/^.+\.(?:mjs|js)$/.test(p)))throw Error('Changed/unrecognized source newline bindings');}
for(const [file,expected] of Object.entries(run.sharedCodeSha256||{})){const bytes=await readFile(path.join(root,file));if(sha256(bytes)!==expected){if(!sourceBindings?.files[file])throw Error('Shared replay code differs: '+file);lineEndingEquivalence[file]=verifyArchivedSource(bytes,expected,sourceBindings.files[file]);}}
if(experiment==='E014'){
  const otherRun=await access.readJson(active+'evidence/run-SF19.json');if(JSON.stringify(otherRun.codeSha256)!==JSON.stringify(run.codeSha256)||JSON.stringify(otherRun.sharedCodeSha256)!==JSON.stringify(run.sharedCodeSha256))throw Error('Root-panel partition code differs');
  const input=await loadRootInputs(access),replay=evaluateRoot(input.rows,input.freeze);if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean root consistency replay differs');independent=auditRoot(input.rows,input.freeze,saved);
}else if(experiment==='E013'){
  const input=await loadNetInputs(access),replay=evaluateNet(input.prepared,input.policy,input.board),selected=selectNet(input.dataset,input.context,input.excluded,input.board);
  if(JSON.stringify(replay)!==JSON.stringify(saved)||!selected.complete||JSON.stringify(selected.selected)!==JSON.stringify(input.selected)||JSON.stringify(selected.diagnostics)!==JSON.stringify(input.key.diagnostics))throw Error('Clean net-offer/selection replay differs');independent=auditNet(input.prepared,input.policy,input.board,saved,input.dataset);
}else if(experiment==='E012'){
  const {prepared,policy,board,dataset}=await loadOfferInputs(access),replay=evaluateOffer(prepared,policy,board);
  if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean offer replay differs');independent=auditOffer(prepared,policy,board,saved,dataset);
}else if(experiment==='E011'){
  const {prepared,freeze,dataset}=await loadOutcomeInputs(access),replay=evaluateOutcome(prepared,freeze);
  if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean outcome replay differs');independent=auditOutcome(prepared,freeze,saved,dataset);
}else if(experiment==='E010'){
  const {high,low,freeze,metadata}=await loadCandidateInputs(access),replay=evaluateCandidate(high,low,freeze,metadata);
  if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean candidate replay differs');independent=auditCandidate(high,low,freeze,saved);
}else{
  const dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),base=await access.readJson('research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz'),
    file=path.join(root,'engine/stockfish-19-lite-single.js'),prepared=prepare(base,dataset,await engineConfig(file,{kind:'nodes',value:20000}));
  if(experiment==='E008'){
  const records=await access.readJson(active+'evidence/predictions.json.gz'),replay=evaluateCurves(prepared);
  if(JSON.stringify(replay.result)!==JSON.stringify(saved)||JSON.stringify(replay.records)!==JSON.stringify(records))throw Error('Clean curve replay differs');
  exactPredictions=true;independent=auditCurves(prepared,saved,records);
  }else{
  const evidence=await access.readJson(active+'evidence/sf19-observations.json.gz'),replay=evaluateStability(evidence,base,await engineConfig(file,{kind:'nodes',value:80000}));
  if(JSON.stringify(replay)!==JSON.stringify(saved))throw Error('Clean stability replay differs');independent=auditStability(evidence,base,saved);
  }
}
const result={schema:'research-clean-replay-v1',experiment,passed:true,snapshotRevision:revision,exactReport:true,exactPredictions,independent,
  ...(experiment==='E014'?{lineEndingEquivalence,sourceReplayCodeSha256:sha256(await readFile(new URL('source-replay.mjs',import.meta.url)))}:{}),
  dataEligibility:access.receipt,codeSha256:sha256(await readFile(fileURLToPath(import.meta.url))),
  environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,networkRequests:0,ignoredInputs:0,nodeDependencies:0,elapsedMs:performance.now()-started};
const out=path.join(root,'research/runs/clean',experiment);await mkdir(out,{recursive:true});await writeFile(path.join(out,'clean-replay.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({experiment,passed:true,exactReport:true,exactPredictions,independent:{...independent,certificates:undefined},engineSearches:0,elapsedMs:result.elapsedMs},null,2));

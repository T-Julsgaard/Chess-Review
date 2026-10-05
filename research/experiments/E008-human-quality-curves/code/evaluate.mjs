import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {openResearchData,sha256} from '../../../data-policy.mjs';
import {engineConfig} from '../../../../tools/calibration/engine.mjs';
import {engineExpectedPoints} from '../../../../lib/public-scoring.js';
import {prepare} from './prepare.mjs';
import {fixedCurve,fitCurve,fitChoice,predictions,metrics,assess,loss,paired} from './curves.mjs';

export const input='research/experiments/E008-human-quality-curves/evidence/sf19-observations.json.gz';
export function evaluate(prepared){
  const trainOutcomes=prepared.outcomes.filter(r=>r.split==='train'),trainChoices=prepared.choices.filter(r=>r.split==='train');
  if(trainChoices.length!==450||new Set(trainOutcomes.map(r=>r.gameId)).size!==450)throw Error('Incomplete train observations');
  const curves={fixed:fixedCurve,cp:fitCurve(trainOutcomes,'cp'),wdl:fitCurve(trainOutcomes,'wdl')},models={},records={};
  for(const [name,curve] of Object.entries(curves)){
    const choice=fitChoice(trainChoices,curve);models[name]={curve,choice};
    records[name]=predictions(prepared.outcomes,prepared.choices,curve,choice);
  }
  const roles={};
  for(const split of ['train','validation']){
    const scored=Object.fromEntries(Object.entries(records).map(([name,rs])=>[name,{outcomes:rs.outcomes.filter(r=>r.split===split),choices:rs.choices.filter(r=>r.split===split)}]));
    roles[split]={metrics:Object.fromEntries(Object.entries(scored).map(([name,r])=>[name,{outcomes:metrics(r.outcomes,['logLoss','brier']),choices:metrics(r.choices,['logLoss','uniformLogLoss'])}]))};
    if(split==='validation'){
      roles[split].comparisons={cp:assess(scored.fixed,scored.cp,models.cp,20261035),wdl:assess(scored.fixed,scored.wdl,models.wdl,20261037)};
      roles[split].cpVsWdl={outcomeGain:paired(scored.cp.outcomes,scored.wdl.outcomes,'logLoss').reduce((a,b)=>a+b,0)/150,
        choiceGain:paired(scored.cp.choices,scored.wdl.choices,'logLoss').reduce((a,b)=>a+b,0)/150};
    }
    const raw=prepared.outcomes.filter(r=>r.split===split).map(r=>{const p=engineExpectedPoints(r.score);return{gameId:r.gameId,logLoss:loss(p,r.target),brier:(p-r.target)**2};});
    roles[split].rawWdlDiagnostic={...metrics(raw,['logLoss','brier']),probabilityClip:1e-12,interpretation:'Engine expected points; not the fixed-CP primary comparator'};
  }
  const passing=['cp','wdl'].filter(name=>roles.validation.comparisons[name].passed);
  passing.sort((a,b)=>roles.validation.metrics[a].choices.logLoss-roles.validation.metrics[b].choices.logLoss);
  const result={schema:'E008-human-curves-v1',models,diagnostics:prepared.diagnostics,exclusions:prepared.exclusions,roles,
    developmentShortlist:passing[0]||null,confirmation:false,promoted:false,
    interpretation:'Training-only fits with a frozen development screen. No displayed accuracy, rating or category improvement is established.'};
  return{result,records};
}
async function main(){
  const root=fileURLToPath(new URL('../../../../',import.meta.url)),args=process.argv.slice(2);
  if(args.length&&!(args.length===2&&args[0]==='--out'&&args[1]))throw Error('Use --out <research directory>');
  const out=args.length?path.resolve(root,args[1]):fileURLToPath(new URL('../evidence/',import.meta.url));
  if(!out.startsWith(path.join(root,'research')+path.sep))throw Error('Output must stay in research');
  const started=performance.now(),access=await openResearchData(['D001','D002'],{purpose:'train'});
  const dataset=await access.readJson('research/datasets/D002-fresh-prefix/games.json.gz'),evidence=await access.readJson(input);
  const config=await engineConfig(path.join(root,'engine/stockfish-19-lite-single.js'),{kind:'nodes',value:20000});
  const prepared=prepare(evidence,dataset,config),{result,records}=evaluate(prepared);
  await mkdir(out,{recursive:true});
  const report=JSON.stringify(result,null,2)+'\n',predicted=gzipSync(JSON.stringify(records)+'\n');
  await writeFile(path.join(out,'results.json'),report);await writeFile(path.join(out,'predictions.json.gz'),predicted);
  const run={schema:'research-run-v1',id:'E008-sf19-development',date:'2026-10-05',sourceRevision:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim(),
    command:'node research/experiments/E008-human-quality-curves/code/evaluate.mjs'+(args.length?' --out '+args[1]:''),
    codeSha256:Object.fromEntries(await Promise.all(['evaluate.mjs','prepare.mjs','curves.mjs','queries.mjs'].map(async p=>[p,sha256(await readFile(new URL(p,import.meta.url)))]))),
    dataEligibility:access.receipt,environment:{node:process.version,platform:process.platform,arch:process.arch},engineSearches:0,elapsedMs:performance.now()-started,
    outputs:{'results.json':sha256(report),'predictions.json.gz':sha256(predicted)},evaluationRole:'D002 450 train /150 development; reserved300 not searched, fitted or scored'};
  await writeFile(path.join(out,'run.json'),JSON.stringify(run,null,2)+'\n');
  console.log(JSON.stringify({diagnostics:result.diagnostics,models:result.models,validation:result.roles.validation.metrics,
    gates:Object.fromEntries(Object.entries(result.roles.validation.comparisons).map(([name,r])=>[name,{outcome:r.outcomeImprovement,choice:r.choiceImprovement,gates:r.gates,passed:r.passed}])),developmentShortlist:result.developmentShortlist},null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();

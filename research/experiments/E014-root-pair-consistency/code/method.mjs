import {wilson} from '../../E009-search-stability/code/method.mjs';
export function points(score){
  if(Object.hasOwn(score,'mate')){if(!Number.isInteger(score.mate)||score.mate===0||Object.hasOwn(score,'cp'))throw Error('Ambiguous mate');return score.mate>0?1:0;}
  if(!Number.isFinite(score.cp)||!Array.isArray(score.wdl)||score.wdl.length!==3||score.wdl.some(x=>!Number.isInteger(x)||x<0)||score.wdl.reduce((a,b)=>a+b,0)!==1000)throw Error('Invalid engine points');
  return(score.wdl[0]+score.wdl[1]/2)/1000;
}
export function compare(budget,played){
  const chosen=budget.alternatives.find(a=>a.move===budget.root.bestmove),focal=budget.alternatives.find(a=>a.move===played);
  if(!chosen||!focal||budget.alternatives.length<2||new Set(budget.alternatives.map(a=>a.move)).size!==budget.alternatives.length)throw Error('Missing/duplicate restricted choice');
  const root=points(budget.root.score),best=points(chosen.query.score),p=points(focal.query.score),maximum=Math.max(...budget.alternatives.map(a=>points(a.query.score))),
    baselineResidual=root-p,candidateResidual=best-p,reference=maximum-p,baseline=budget.root.bestmove===played?0:Math.max(0,baselineResidual),candidate=Math.max(0,candidateResidual),
    baselineKeys=new Set([budget.root.key,focal.query.key]),candidateKeys=new Set([...baselineKeys,chosen.query.key]),allQueries=new Map([budget.root,...budget.alternatives.map(a=>a.query)].map(q=>[q.key,q]));
  const requests=keys=>[...keys].reduce((n,k)=>n+(allQueries.get(k).exactRecovery?2:1),0);
  return{baseline,candidate,reference,baselineError:Math.abs(baseline-reference),candidateError:Math.abs(candidate-reference),baselineResidual,candidateResidual,chosenShortfall:maximum-best,
    rootBestmove:budget.root.bestmove,rootSelectedNodes:budget.root.nodes,chosenSelectedNodes:chosen.query.nodes,rootFinalNodes:budget.root.finalNodes,chosenFinalNodes:chosen.query.finalNodes,
    rootEarlierExact:budget.root.rawInfo!==budget.root.finalSearchInfo,chosenEarlierExact:chosen.query.rawInfo!==chosen.query.finalSearchInfo,matePresent:[budget.root,...budget.alternatives.map(a=>a.query)].some(q=>q.score.mate!=null),
    workload:{baselineQueries:baselineKeys.size,candidateQueries:candidateKeys.size,fullQueries:allQueries.size,baselineRequests:requests(baselineKeys),candidateRequests:requests(candidateKeys),fullRequests:requests(new Set(allQueries.keys()))}};
}
export function interval(values,seed,iterations=10000){
  if(!values.length||values.some(v=>!Number.isFinite(v)))throw Error('Invalid paired bootstrap');let state=seed>>>0;const samples=[];
  for(let b=0;b<iterations;b++){let sum=0;for(let j=0;j<values.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}samples.push(sum/values.length);}
  samples.sort((a,b)=>a-b);return{estimate:values.reduce((a,b)=>a+b,0)/values.length,lower:samples[Math.floor(.00625*(iterations-1))],upper:samples[Math.floor(.99375*(iterations-1))],level:.9875,seed,iterations,unit:'game',interpretation:'Conditional development engine consistency; four-comparison Bonferroni percentile intervals'};
}
export function distribution(xs){if(!xs.length)throw Error('Empty distribution');const sorted=[...xs].sort((a,b)=>a-b);return{mean:xs.reduce((a,b)=>a+b,0)/xs.length,median:sorted[Math.floor((xs.length-1)*.5)],p90:sorted[Math.floor((xs.length-1)*.9)],maximum:sorted.at(-1)};}
function confusion(rows,name,t){return{falseNearBest:rows.filter(r=>r[name]<t&&r.reference>=t).length,falseNotNearBest:rows.filter(r=>r[name]>=t&&r.reference<t).length,agreement:rows.filter(r=>(r[name]<t)===(r.reference<t)).length};}
export function panelSummary(rows,gates,seed=null){const baseline=distribution(rows.map(r=>r.baselineError)),candidate=distribution(rows.map(r=>r.candidateError)),bc=confusion(rows,'baseline',gates.nearBestThreshold),cc=confusion(rows,'candidate',gates.nearBestThreshold),improvement=seed===null?null:interval(rows.map(r=>r.baselineError-r.candidateError),seed,gates.bootstrapIterations);
  return{games:rows.length,baselineError:baseline,candidateError:candidate,improvement,relativeReduction:baseline.mean>0?(baseline.mean-candidate.mean)/baseline.mean:null,baselineConfusion:bc,candidateConfusion:cc,
    baselineNegativeResiduals:rows.filter(r=>r.baselineResidual<0).length,candidateNegativeResiduals:rows.filter(r=>r.candidateResidual<0).length,chosenBelowMaximum:rows.filter(r=>r.chosenShortfall>0).length,chosenShortfall:distribution(rows.map(r=>r.chosenShortfall)),mateCases:rows.filter(r=>r.matePresent).length,
    workload:Object.fromEntries(['baselineQueries','candidateQueries','fullQueries','baselineRequests','candidateRequests','fullRequests'].map(k=>[k,rows.reduce((n,r)=>n+r.workload[k],0)])),
    exactScoreDiagnostics:{rootEarlier:rows.filter(r=>r.rootEarlierExact).length,chosenEarlier:rows.filter(r=>r.chosenEarlierExact).length,rootNodes:[Math.min(...rows.map(r=>r.rootSelectedNodes)),Math.max(...rows.map(r=>r.rootSelectedNodes))],chosenNodes:[Math.min(...rows.map(r=>r.chosenSelectedNodes)),Math.max(...rows.map(r=>r.chosenSelectedNodes))]},
    gates:seed===null?null:{practical:baseline.mean>0&&(baseline.mean-candidate.mean)>=gates.minimumRelativeReduction*baseline.mean,interval:improvement.lower>0,falseNearBest:(cc.falseNearBest-bc.falseNearBest)/rows.length<=gates.maxFalseNearBestIncrease,queryWorkload:rows.every(r=>r.workload.candidateQueries<=gates.maxQueries)}};
}
export function evaluate(input,freeze){
  const records=input.map(r=>({engine:r.engine,panel:r.panel,gameId:r.gameId,split:r.split,ply:r.ply,budgets:Object.fromEntries(freeze.budgets.map(m=>[m,compare(r.budgets[m],r.played)]))}));
  const engines=Object.fromEntries(['SF18','SF19'].map((engine,i)=>{const rs=records.filter(r=>r.engine===engine),summaries=Object.fromEntries(freeze.budgets.map((m,j)=>[m,panelSummary(rs.map(r=>r.budgets[m]),freeze.gates,freeze.gates.seeds[2*i+j])])),
    bd=rs.map(r=>Math.abs(r.budgets['20k'].baseline-r.budgets['80k'].baseline)),cd=rs.map(r=>Math.abs(r.budgets['20k'].candidate-r.budgets['80k'].candidate)),within=wilson(cd.filter(d=>d<=freeze.gates.driftTolerance).length,rs.length),
    stability={baseline:distribution(bd),candidate:distribution(cd),candidateWithinTolerance:within,rootBestChanges:rs.filter(r=>r.budgets['20k'].rootBestmove!==r.budgets['80k'].rootBestmove).length},
    gates={coverage:rs.length===(engine==='SF18'?40:45),meanDrift:stability.candidate.mean-stability.baseline.mean<=freeze.gates.maxMeanDriftIncrease,stableFraction:within.estimate>=freeze.gates.minStableFraction&&within.lower>=freeze.gates.minWilsonLower},
    groups=[...new Set(rs.map(r=>r.panel+'/'+r.split))].map(label=>({label,sparse:rs.filter(r=>r.panel+'/'+r.split===label).length<20,panels:Object.fromEntries(freeze.budgets.map(m=>[m,panelSummary(rs.filter(r=>r.panel+'/'+r.split===label).map(r=>r.budgets[m]),freeze.gates)]))}));
    return[engine,{panels:summaries,stability,gates,groups,passed:Object.values(gates).every(Boolean)&&Object.values(summaries).every(s=>Object.values(s.gates).every(Boolean))}];}));
  return{schema:'E014-root-consistency-v1',engines,records,passed:Object.values(engines).every(e=>e.passed),engineSearches:0,modelFits:0,humanLabelsUsed:0,confirmation:false,promoted:false,interpretation:'Operational development agreement with complete finite-search restricted alternatives; no human quality/accuracy/rating validity'};
}
export const partitionResult=(result,engine)=>({...result,engines:{[engine]:result.engines[engine]},records:result.records.filter(r=>r.engine===engine),passed:result.engines[engine].passed});
export async function readResults(access,prefix){const a=await access.readJson(prefix+'evidence/results-SF18.json'),b=await access.readJson(prefix+'evidence/results-SF19.json');if(Object.keys(a.engines).join()!=='SF18'||Object.keys(b.engines).join()!=='SF19'||a.records.some(r=>r.engine!=='SF18')||b.records.some(r=>r.engine!=='SF19'))throw Error('Changed partition identity');return{...a,engines:{...a.engines,...b.engines},records:[...a.records,...b.records],passed:a.passed&&b.passed};}

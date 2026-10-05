// Independent equations. Do not import scoring or summaries under assessment.
function assertClose(a,b,label){
  if(typeof a==='number'&&typeof b==='number'){if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-12)throw Error('Independent numerical mismatch: '+label);return;}
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object'){if(a!==b)throw Error('Independent mismatch: '+label);return;}
  if(JSON.stringify(Object.keys(a))!==JSON.stringify(Object.keys(b)))throw Error('Independent shape mismatch: '+label);
  for(const k of Object.keys(a))assertClose(a[k],b[k],label+'.'+k);
}
const average=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
function stats(xs){const ranked=[...xs].sort((a,b)=>a-b),n=ranked.length;return{mean:average(xs),median:ranked[Math.floor((n-1)/2)],p90:ranked[Math.floor(.9*(n-1))],maximum:ranked[n-1]};}
function value(q){const raw=/\bscore (cp|mate) (-?\d+)/.exec(q.rawInfo);if(!raw||q.score[raw[1]]!==Number(raw[2]))throw Error('Independent raw score mismatch');
  if(raw[1]==='mate'){if(Number(raw[2])===0)throw Error('Independent zero mate');return Number(raw[2])>0?1:0;}
  const w=/\bwdl (\d+) (\d+) (\d+)/.exec(q.rawInfo);if(!w||JSON.stringify(w.slice(1).map(Number))!==JSON.stringify(q.score.wdl)||w.slice(1).reduce((n,x)=>n+Number(x),0)!==1000)throw Error('Independent raw WDL mismatch');return(2*Number(w[1])+Number(w[2]))/2000;
}
function calculate(q,played){
  const moves=new Map(q.alternatives.map(a=>[a.move,a.query])),p=moves.get(played),b=moves.get(q.root.bestmove),chosen=value(b),focal=value(p),best=Math.max(...[...moves.values()].map(value)),root=value(q.root),
    reference=best-focal,baselineResidual=root-focal,candidateResidual=chosen-focal,baseline=q.root.bestmove===played?0:Math.max(baselineResidual,0),candidate=Math.max(candidateResidual,0),
    base=[q.root,p],cand=q.root.bestmove===played?base:[...base,b],all=[q.root,...moves.values()],requests=list=>list.reduce((s,x)=>s+1+Number(Boolean(x.exactRecovery)),0);
  return{baseline,candidate,reference,baselineError:Math.abs(reference-baseline),candidateError:Math.abs(reference-candidate),baselineResidual,candidateResidual,chosenShortfall:best-chosen,
    rootBestmove:q.root.bestmove,rootSelectedNodes:q.root.nodes,chosenSelectedNodes:b.nodes,rootFinalNodes:q.root.finalNodes,chosenFinalNodes:b.finalNodes,
    rootEarlierExact:q.root.rawInfo!==q.root.finalSearchInfo,chosenEarlierExact:b.rawInfo!==b.finalSearchInfo,matePresent:all.some(x=>x.score.mate!=null),
    workload:{baselineQueries:base.length,candidateQueries:cand.length,fullQueries:all.length,baselineRequests:requests(base),candidateRequests:requests(cand),fullRequests:requests(all)}};
}
function resample(xs,seed,n){let s=seed;const draws=[];for(let i=0;i<n;i++){const selected=[];for(let j=0;j<xs.length;j++){s=(s*1664525+1013904223)>>>0;selected.push(xs[Math.trunc(s/4294967296*xs.length)]);}draws.push(average(selected));}draws.sort((a,b)=>a-b);
  return{estimate:average(xs),lower:draws[Math.trunc((n-1)*.00625)],upper:draws[Math.trunc((n-1)*.99375)],level:.9875,seed,iterations:n,unit:'game',interpretation:'Conditional development engine consistency; four-comparison Bonferroni percentile intervals'};}
function panel(rs,g,seed=null){
  const baselineError=stats(rs.map(r=>r.baselineError)),candidateError=stats(rs.map(r=>r.candidateError)),confusion=name=>{let fp=0,fn=0,agreement=0;for(const r of rs){const predicted=r[name]<g.nearBestThreshold,truth=r.reference<g.nearBestThreshold;fp+=Number(predicted&&!truth);fn+=Number(!predicted&&truth);agreement+=Number(predicted===truth);}return{falseNearBest:fp,falseNotNearBest:fn,agreement};},
    bc=confusion('baseline'),cc=confusion('candidate'),improvement=seed===null?null:resample(rs.map(r=>r.baselineError-r.candidateError),seed,g.bootstrapIterations);
  return{games:rs.length,baselineError,candidateError,improvement,relativeReduction:baselineError.mean>0?(baselineError.mean-candidateError.mean)/baselineError.mean:null,baselineConfusion:bc,candidateConfusion:cc,
    baselineNegativeResiduals:rs.filter(r=>r.baselineResidual<0).length,candidateNegativeResiduals:rs.filter(r=>r.candidateResidual<0).length,chosenBelowMaximum:rs.filter(r=>r.chosenShortfall>0).length,chosenShortfall:stats(rs.map(r=>r.chosenShortfall)),mateCases:rs.filter(r=>r.matePresent).length,
    workload:Object.fromEntries(['baselineQueries','candidateQueries','fullQueries','baselineRequests','candidateRequests','fullRequests'].map(k=>[k,rs.reduce((s,r)=>s+r.workload[k],0)])),
    exactScoreDiagnostics:{rootEarlier:rs.filter(r=>r.rootEarlierExact).length,chosenEarlier:rs.filter(r=>r.chosenEarlierExact).length,rootNodes:[Math.min(...rs.map(r=>r.rootSelectedNodes)),Math.max(...rs.map(r=>r.rootSelectedNodes))],chosenNodes:[Math.min(...rs.map(r=>r.chosenSelectedNodes)),Math.max(...rs.map(r=>r.chosenSelectedNodes))]},
    gates:seed===null?null:{practical:baselineError.mean>0&&baselineError.mean-candidateError.mean>=g.minimumRelativeReduction*baselineError.mean,interval:improvement.lower>0,falseNearBest:(cc.falseNearBest-bc.falseNearBest)/rs.length<=g.maxFalseNearBestIncrease,queryWorkload:rs.every(r=>r.workload.candidateQueries<=g.maxQueries)}};
}
function coverage(k,n){const z=1.959963984540054,p=k/n,denom=1+z*z/n,radius=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom,center=(p+z*z/(2*n))/denom;return{successes:k,n,estimate:p,lower:center-radius,upper:center+radius,level:.95,method:'Wilson score; one fixed focal choice per disjoint game'};}
export function audit(input,freeze,saved){
  const records=input.map(p=>({engine:p.engine,panel:p.panel,gameId:p.gameId,split:p.split,ply:p.ply,budgets:Object.fromEntries(['20k','80k'].map(m=>[m,calculate(p.budgets[m],p.played)]))}));assertClose(records,saved.records,'records');
  const engines={};for(const [i,e] of ['SF18','SF19'].entries()){const rs=records.filter(r=>r.engine===e),panels={};for(const [j,m] of ['20k','80k'].entries())panels[m]=panel(rs.map(r=>r.budgets[m]),freeze.gates,freeze.gates.seeds[2*i+j]);
    const b=rs.map(r=>Math.abs(r.budgets['20k'].baseline-r.budgets['80k'].baseline)),c=rs.map(r=>Math.abs(r.budgets['20k'].candidate-r.budgets['80k'].candidate)),within=coverage(c.filter(x=>x<=freeze.gates.driftTolerance).length,rs.length),
      stability={baseline:stats(b),candidate:stats(c),candidateWithinTolerance:within,rootBestChanges:rs.filter(r=>r.budgets['20k'].rootBestmove!==r.budgets['80k'].rootBestmove).length},gates={coverage:rs.length===(e==='SF18'?40:45),meanDrift:stability.candidate.mean-stability.baseline.mean<=freeze.gates.maxMeanDriftIncrease,stableFraction:within.estimate>=freeze.gates.minStableFraction&&within.lower>=freeze.gates.minWilsonLower},
      groups=[...new Set(rs.map(r=>r.panel+'/'+r.split))].map(label=>({label,sparse:rs.filter(r=>r.panel+'/'+r.split===label).length<20,panels:Object.fromEntries(['20k','80k'].map(m=>[m,panel(rs.filter(r=>r.panel+'/'+r.split===label).map(r=>r.budgets[m]),freeze.gates)]))}));
    engines[e]={panels,stability,gates,groups,passed:Object.values(gates).every(Boolean)&&Object.values(panels).every(p=>Object.values(p.gates).every(Boolean))};}
  assertClose(engines,saved.engines,'engine panels');if(saved.passed!==Object.values(engines).every(e=>e.passed)||saved.confirmation||saved.promoted||saved.engineSearches!==0||saved.modelFits!==0||saved.humanLabelsUsed!==0)throw Error('Independent final claim mismatch');
  return{passed:true,sourceBoundGames:input.length,budgetComparisons:input.length*2,engineBudgetPanels:4,bootstrapReplicatesPerPanel:freeze.gates.bootstrapIterations,sourcePoints:'Independent raw WDL/mate parsing',engineSearches:0,modelFits:0,humanLabelsUsed:0};
}

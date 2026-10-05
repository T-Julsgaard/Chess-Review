// Independent equations for retained current scoring; no scoring imports.
const near=(a,b,label)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-10)throw Error('Independent '+label+' differs');};
const points=s=>s.mate!=null?Number(s.mate>0):1/(1+Math.exp(-.368208*s.cp/100));
const wdl=s=>s.mate!=null?Number(s.mate>0):(s.wdl[0]+s.wdl[1]/2)/1000;
function decision(root,alternatives,played){
  const score=alternatives.find(r=>r.move===played).score,cpResidual=points(root.score)-points(score),wdlResidual=wdl(root.score)-wdl(score),
    cpLoss=root.bestmove===played?0:Math.max(0,cpResidual),wdlLoss=root.bestmove===played?0:Math.max(0,wdlResidual),
    quality=cpLoss===0?100:Math.max(0,Math.min(100,103.1668100711649*Math.exp(-4.354415386753951*cpLoss)-3.166924740191411+1)),maximum=Math.max(...alternatives.map(r=>points(r.score)));
  return{cpLoss,wdlLoss,quality,cpResidual,wdlResidual,best:alternatives.filter(r=>points(r.score)>=maximum-.001).map(r=>r.move).sort()};
}
export function audit(evidence,baseline,result){
  const low=new Map(baseline.searches.map(r=>[r.key,r])),high=new Map(evidence.searches.map(r=>[r.key,r])),positions=new Map(evidence.positions.map(p=>[p.gameId,p]));
  let decisionChecks=0,qualityTotal=0,withinCp=0,withinWdl=0,bestOverlap=0;
  for(const r of result.records){
    const p=positions.get(r.gameId),first=decision(low.get(p.baselineRootKey),p.alternatives.map(a=>({move:a.move,score:low.get(a.baselineKey).score})),p.played),
      second=decision(high.get(p.rootKey),p.alternatives.map(a=>({move:a.move,score:high.get(a.key).score})),p.played);
    for(const [saved,reconstructed] of [[r.low,first],[r.high,second]]){
      for(const field of ['cpLoss','wdlLoss','quality','cpResidual','wdlResidual'])near(saved[field],reconstructed[field],field);
      if(JSON.stringify(saved.best)!==JSON.stringify(reconstructed.best))throw Error('Independent best set differs');decisionChecks++;
    }
    const cp=Math.abs(first.cpLoss-second.cpLoss),w=Math.abs(first.wdlLoss-second.wdlLoss),q=Math.abs(first.quality-second.quality),overlap=first.best.some(m=>second.best.includes(m));
    near(r.cpLossDrift,cp,'CP drift');near(r.wdlLossDrift,w,'WDL drift');near(r.qualityDrift,q,'quality drift');if(r.bestOverlap!==overlap)throw Error('Independent best overlap differs');
    qualityTotal+=q;withinCp+=Number(cp<=.05);withinWdl+=Number(w<=.05);bestOverlap+=Number(overlap);
  }
  near(result.summary.quality.mean,qualityTotal/result.records.length,'mean quality drift');
  for(const [field,count] of [['withinCpTolerance',withinCp],['withinWdlTolerance',withinWdl],['bestAlternativeOverlap',bestOverlap]]){
    const saved=result.summary[field],n=result.records.length,z=1.959963984540054,p=count/n,den=1+z*z/n,
      lower=(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/den;
    near(saved.successes,count,field+' count');near(saved.lower,lower,field+' Wilson lower');
  }
  return{passed:true,decisionChecks,interpretation:'Independent equations reconstruct every paired loss/quality/best set and headline tolerance counts; no independent human truth is claimed'};
}

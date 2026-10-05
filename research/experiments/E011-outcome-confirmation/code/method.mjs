import {utility,loss,metrics,paired,bootstrap,labels} from '../../E008-human-quality-curves/code/curves.mjs';
import {wilson} from '../../E009-search-stability/code/method.mjs';
export function evaluate(prepared,freeze){
  if(prepared.rows.some(r=>r.split!=='test'))throw Error('Only reserved test roots can confirm');
  const records={},modes={};
  for(const [i,mode] of ['20k','80k'].entries()){
    records[mode]={};
    for(const name of ['fixed','cp','constant'])records[mode][name]=prepared.rows.map(r=>{const p=name==='constant'?.5:utility(r.scores[mode],freeze.curves[name]);return{gameId:r.gameId,split:r.split,ply:r.ply,color:r.color,rating:r.rating,
      fixedPoints:utility(r.scores['20k'],freeze.curves.fixed),target:r.target,probability:p,logLoss:loss(p,r.target),brier:(p-r.target)**2};});
    const rs=records[mode],stats=Object.fromEntries(Object.entries(rs).map(([name,rows])=>[name,metrics(rows,['logLoss','brier'])]));
    const confirm=(values,seed)=>({...bootstrap(values,seed),interpretation:'Paired reserved-game percentile interval, conditional on the frozen development curve'}),fixedGain=confirm(paired(rs.fixed,rs.cp,'logLoss'),20261041+i),constantGain=confirm(paired(rs.constant,rs.cp,'logLoss'),20261043+i);
    const groups=[...new Set(rs.fixed.flatMap(labels))].sort().map(label=>{const select=rows=>rows.filter(r=>labels(r).includes(label)),a=metrics(select(rs.fixed),['logLoss','brier']),b=metrics(select(rs.cp),['logLoss','brier']);return{label,fixed:a,cp:b,sufficient:a.games>=30,passed:a.games>=30?b.logLoss-a.logLoss<=.03&&b.brier-a.brier<=.01:null};});
    const gates={fixedPractical:fixedGain.estimate>=.01,fixedInterval:fixedGain.lower>0,constantPractical:constantGain.estimate>=.01,constantInterval:constantGain.lower>0,
      brier:stats.cp.brier<=stats.fixed.brier,groups:groups.every(g=>g.passed!==false)};
    modes[mode]={metrics:stats,fixedImprovement:fixedGain,constantImprovement:constantGain,groups,gates,passed:Object.values(gates).every(Boolean)};
  }
  const maxDrift=new Map();for(const r of prepared.rows){const drift=Math.abs(utility(r.scores['20k'],freeze.curves.cp)-utility(r.scores['80k'],freeze.curves.cp));maxDrift.set(r.gameId,Math.max(maxDrift.get(r.gameId)||0,drift));}
  const stability=wilson([...maxDrift.values()].filter(x=>x<=.05).length,maxDrift.size),coverage=prepared.diagnostics.coveredGames>=285&&prepared.rows.length>0,
    gates={budget20k:modes['20k'].passed,budget80k:modes['80k'].passed,coverage,rootStability:stability.estimate>=.9&&stability.lower>=.8};
  return{schema:'E011-outcome-confirmation-v1',curvesSha256:freeze.curvesSha256,modes,records,diagnostics:prepared.diagnostics,exclusions:prepared.exclusions,emptyGames:prepared.emptyGames,
    stability:{...stability,maximumRootDriftByGame:[...maxDrift.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([gameId,maximum])=>({gameId,maximum})),maximum:Math.max(...maxDrift.values())},
    gates,passed:Object.values(gates).every(Boolean),choiceConfirmed:false,promoted:false,interpretation:'Frozen CP-only expected-point confirmation under the registered cohort/search conditions; no display/rating/category claim'};
}

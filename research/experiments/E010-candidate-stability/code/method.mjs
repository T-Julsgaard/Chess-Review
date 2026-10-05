import {utility,labels} from '../../E008-human-quality-curves/code/curves.mjs';
import {wilson} from '../../E009-search-stability/code/method.mjs';
export function vector(scores,model){
  if(!Array.isArray(scores)||scores.length<2||model.choice.schema!=='human-choice-v1'||!Number.isFinite(model.choice.temperature)||model.choice.temperature<0||model.choice.temperature>1000)throw Error('Invalid complete choice/model');
  const utilities=scores.map(s=>utility(s,model.curve)),maximum=Math.max(...utilities),weights=utilities.map(u=>Math.exp(model.choice.temperature*(u-maximum))),total=weights.reduce((a,b)=>a+b,0);
  return weights.map(w=>w/total);
}
export function totalVariation(a,b){
  if(a.length!==b.length||a.length<2||[a,b].some(v=>v.some(p=>!Number.isFinite(p)||p<0||p>1)||Math.abs(v.reduce((s,p)=>s+p,0)-1)>1e-12))throw Error('Unmatched/invalid probability vectors');
  return a.reduce((sum,p,i)=>sum+Math.abs(p-b[i]),0)/2;
}
export function compare(lowScores,highScores,lowRoot,highRoot,index,model){
  const low=vector(lowScores,model),high=vector(highScores,model);if(!Number.isInteger(index)||index<0||index>=low.length)throw Error('Invalid played index');
  return{low,high,tv:totalVariation(low,high),lowRoot:utility(lowRoot,model.curve),highRoot:utility(highRoot,model.curve),
    rootDrift:Math.abs(utility(lowRoot,model.curve)-utility(highRoot,model.curve)),playedLossDrift:Math.abs(Math.log(low[index])-Math.log(high[index]))};
}
export function bootstrap95(values,seed=20261039,iterations=10000){
  if(!values.length||values.some(v=>!Number.isFinite(v)))throw Error('Invalid paired bootstrap');let state=seed>>>0;const samples=[];
  for(let i=0;i<iterations;i++){let sum=0;for(let j=0;j<values.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}samples.push(sum/values.length);}
  samples.sort((a,b)=>a-b);return{estimate:values.reduce((a,b)=>a+b,0)/values.length,lower:samples[Math.floor(.025*(iterations-1))],upper:samples[Math.floor(.975*(iterations-1))],level:.95,seed,iterations,unit:'game',interpretation:'Paired operational development interval conditional on fixed models'};
}
export function summary(records){
  if(!records.length)return null;
  const distribution=(model,field)=>{const xs=records.map(r=>r[model][field]).sort((a,b)=>a-b);return{mean:xs.reduce((a,b)=>a+b,0)/xs.length,median:xs[Math.floor((xs.length-1)*.5)],p90:xs[Math.floor((xs.length-1)*.9)],maximum:xs.at(-1)};};
  return{games:records.length,...Object.fromEntries(['fixed','cp'].map(name=>[name,{tv:distribution(name,'tv'),rootDrift:distribution(name,'rootDrift'),playedLossDrift:distribution(name,'playedLossDrift'),
    withinTv:wilson(records.filter(r=>r[name].tv<=.1).length,records.length),withinRoot:wilson(records.filter(r=>r[name].rootDrift<=.05).length,records.length)}]))};
}
export function evaluate(high,low,freeze,metadata){
  if(high.positions.length!==45||high.games.length!==45||high.games.filter(g=>g.split==='train').length!==30||high.games.filter(g=>g.split==='validation').length!==15||new Set(high.games.map(g=>g.id)).size!==45)throw Error('Wrong fixed cohort/roles');
  const first=new Map(low.searches.map(r=>[r.key,r])),second=new Map(high.searches.map(r=>[r.key,r])),meta=new Map(metadata.map(r=>[r.gameId,r]));
  const records=high.positions.map(p=>{
    const m=meta.get(p.gameId);if(!m||m.split!==p.split||m.ply!==p.ply)throw Error('Unmatched metadata');
    const lowScores=p.alternatives.map(a=>first.get(a.baselineKey).score),highScores=p.alternatives.map(a=>second.get(a.key).score),index=p.legalMoves.indexOf(p.played),
      lowRoot=first.get(p.baselineRootKey).score,highRoot=second.get(p.rootKey).score;
    return{gameId:p.gameId,split:p.split,ply:p.ply,rating:m.rating,fixedPoints:m.fixedPoints,legalMoves:p.legalMoves,playedIndex:index,
      ...Object.fromEntries(Object.entries(freeze.models).map(([name,model])=>[name,compare(lowScores,highScores,lowRoot,highRoot,index,model)]))};
  });
  const stats=summary(records),improvement=bootstrap95(records.map(r=>r.fixed.tv-r.cp.tv)),gates={practical:improvement.estimate>=.05*stats.fixed.tv.mean,interval:improvement.lower>0,
    tvTolerance:stats.cp.withinTv.estimate>=.9&&stats.cp.withinTv.lower>=.8,rootTolerance:stats.cp.withinRoot.estimate>=.9&&stats.cp.withinRoot.lower>=.8};
  const groups=[...new Set(records.flatMap(labels))].sort().map(label=>{const rows=records.filter(r=>labels(r).includes(label));return{label,sparse:rows.length<20,summary:summary(rows)};});
  return{schema:'E010-probability-stability-v1',modelsSha256:freeze.modelsSha256,summary:stats,improvement,gates,passed:Object.values(gates).every(Boolean),records,groups,
    roles:Object.fromEntries(['train','validation'].map(role=>[role,summary(records.filter(r=>r.split===role))])),confirmation:false,promoted:false,
    interpretation:'Fixed-model operational development study; training overlap, no new human-validity/display/rating/category claim'};
}

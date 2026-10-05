import {fitHumanOutcome,fitHumanChoice,choiceStats} from '../../../../tools/calibration/human-policy.mjs';
import {engineExpectedPoints} from '../../../../lib/public-scoring.js';

export const fixedCurve={schema:'E008-curve-v1',kind:'cp',coefficient:.368208,boundary:null,fixed:true};
const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
export function coordinate(score,kind){
  if(score?.mate!=null)throw Error('Mate has no fitted coordinate');
  if(!Number.isFinite(score?.cp))throw Error('Missing CP');
  if(kind==='cp')return score.cp/100;
  if(kind!=='wdl')throw Error('Unknown curve kind');
  const p=Math.max(.0005,Math.min(.9995,engineExpectedPoints(score)));
  return Math.log(p)-Math.log1p(-p);
}
export function utility(score,model){
  if(model?.schema!=='E008-curve-v1'||!['cp','wdl'].includes(model.kind)||!Number.isFinite(model.coefficient)||model.coefficient<0||model.coefficient>100)throw Error('Invalid curve');
  if(score?.mate!=null){if(!Number.isInteger(score.mate)||score.mate===0)throw Error('Ambiguous mate');return score.mate>0?1:0;}
  return sigmoid(model.coefficient*coordinate(score,model.kind));
}
export function fitCurve(rows,kind){
  const fitted=fitHumanOutcome(rows.map(r=>({gameId:r.gameId,split:r.split,cp:100*coordinate(r.score,kind),target:r.target,weight:r.weight})));
  return{schema:'E008-curve-v1',kind,coefficient:fitted.slopePerPawn,boundary:fitted.boundary,observations:fitted.observations,games:fitted.games,
    coordinate:kind==='cp'?'cp/100':'logit(engine expected points clamped to [0.0005,0.9995])',criterion:fitted.criterion};
}
export function fitChoice(rows,curve){
  return fitHumanChoice(rows.map(r=>({gameId:r.gameId,split:r.split,utilities:r.scores.map(s=>utility(s,curve)),playedIndex:r.playedIndex})));
}
export function loss(p,target){
  if(!Number.isFinite(p)||p<0||p>1||!Number.isFinite(target)||target<0||target>1)throw Error('Invalid likelihood');
  const q=Math.max(1e-12,Math.min(1-1e-12,p));return-target*Math.log(q)-(1-target)*Math.log1p(-q);
}
export function predictions(outcomes,choices,curve,choice){
  return{outcomes:outcomes.map(r=>{const p=utility(r.score,curve);return{gameId:r.gameId,split:r.split,ply:r.ply,rating:r.rating,
    fixedPoints:utility(r.score,fixedCurve),probability:p,target:r.target,logLoss:loss(p,r.target),brier:(p-r.target)**2};}),
    choices:choices.map(r=>{const stats=choiceStats(r.scores.map(s=>utility(s,curve)),r.playedIndex,choice.temperature);
      return{gameId:r.gameId,split:r.split,ply:r.ply,rating:r.rating,fixedPoints:utility(r.rootScore,fixedCurve),legalMoves:r.scores.length,
        logLoss:stats.logLoss,probability:stats.probability,uniformLogLoss:Math.log(r.scores.length)};})};
}
export function perGame(rows,fields){
  const groups=new Map();for(const r of rows){if(!groups.has(r.gameId))groups.set(r.gameId,[]);groups.get(r.gameId).push(r);}
  return[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([gameId,rs])=>({gameId,...Object.fromEntries(fields.map(k=>[k,rs.reduce((s,r)=>s+r[k],0)/rs.length]))}));
}
export function metrics(rows,fields){
  if(!rows.length)return null;const games=perGame(rows,fields);
  return{games:games.length,observations:rows.length,...Object.fromEntries(fields.map(k=>[k,games.reduce((s,r)=>s+r[k],0)/games.length]))};
}
export function paired(first,second,field){
  const a=perGame(first,[field]),b=perGame(second,[field]);
  if(!a.length||a.length!==b.length||a.some((r,i)=>r.gameId!==b[i].gameId))throw Error('Unequal paired game coverage');
  return a.map((r,i)=>r[field]-b[i][field]);
}
export function bootstrap(values,seed,iterations=10000){
  if(!values.length||values.some(x=>!Number.isFinite(x))||!Number.isInteger(iterations)||iterations<2)throw Error('Invalid bootstrap');
  let state=seed>>>0;const samples=[];
  for(let i=0;i<iterations;i++){let sum=0;for(let j=0;j<values.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}samples.push(sum/values.length);}
  samples.sort((a,b)=>a-b);return{estimate:values.reduce((a,b)=>a+b,0)/values.length,lower:samples[Math.floor(.0125*(iterations-1))],upper:samples[Math.floor(.9875*(iterations-1))],
    level:.975,seed,iterations,unit:'game',interpretation:'Paired development game percentile interval, conditional on the fitted training model'};
}
export function labels(r){return['rating:'+(r.rating<1200?'<1200':r.rating<2000?'1200-1999':'>=2000'),
  'ply:'+(r.ply<=20?'<=20':r.ply<=50?'21-50':'>50'),'fixed-points:'+(r.fixedPoints<.1?'<0.1':r.fixedPoints>.9?'>0.9':'0.1-0.9')];}
export function assess(first,second,model,seed){
  const outcome=bootstrap(paired(first.outcomes,second.outcomes,'logLoss'),seed),choice=bootstrap(paired(first.choices,second.choices,'logLoss'),seed+1);
  const a=metrics(first.outcomes,['logLoss','brier']),b=metrics(second.outcomes,['logLoss','brier']);
  const groups=[...new Set([...first.outcomes,...first.choices].flatMap(labels))].sort().map(label=>{
    const select=rows=>rows.filter(r=>labels(r).includes(label)),ao=metrics(select(first.outcomes),['logLoss','brier']),bo=metrics(select(second.outcomes),['logLoss','brier']),
      ac=metrics(select(first.choices),['logLoss']),bc=metrics(select(second.choices),['logLoss']);
    const outcomePassed=ao?.games>=30?bo.logLoss-ao.logLoss<=.03&&bo.brier-ao.brier<=.01:null,
      choicePassed=ac?.games>=30?bc.logLoss-ac.logLoss<=.05:null;
    return{label,comparator:{outcomes:ao,choices:ac},candidate:{outcomes:bo,choices:bc},outcomePassed,choicePassed};
  });
  const coverage=kind=>first[kind].length===second[kind].length&&first[kind].every((r,i)=>r.gameId===second[kind][i].gameId&&r.ply===second[kind][i].ply);
  const gates={outcomePractical:outcome.estimate>=.01,outcomeInterval:outcome.lower>0,choicePractical:choice.estimate>=.02,choiceInterval:choice.lower>0,
    brier:b.brier<=a.brier,coverage:coverage('outcomes')&&coverage('choices'),interior:!model.curve.boundary&&!model.choice.boundary,
    subgroups:groups.every(g=>g.outcomePassed!==false&&g.choicePassed!==false)};
  return{outcomeImprovement:outcome,choiceImprovement:choice,groups,gates,passed:Object.values(gates).every(Boolean),sparseGroupsUnresolved:groups.some(g=>g.outcomePassed===null||g.choicePassed===null)};
}

import {hash} from './io.mjs';

// These functions accept engine scores and public game outcomes/choices only.
// They have no dependencies on application scoring or display configuration.
export const humanPolicyDefinition = {
  schema: 'human-policy-v1',
  outcome: 'Symmetric logistic expected game points, slope fitted to public human game results; cp/100 is a unit conversion.',
  choice: 'Softmax over every legal move, using human expected points as utility; inverse temperature fitted by choice likelihood.',
  quality: '100 * exp(-temperature * max(0, expected(best) - expected(played))); arithmetic mean over nonforced decisions.',
  boundaries: 'Optimal and forced moves have quality 100. Forced decisions are excluded from game aggregation. Mate signs map to 1/0.',
  targetPolicy: 'Game results and observed legal moves are targets. Player ratings are neither quality inputs nor fitting targets.',
  numericalLimits: 'Positive slope/temperature bounded at 100/1000 for optimization; a boundary optimum is explicitly reported.',
};
const sigmoid = x => x >= 0 ? 1/(1+Math.exp(-x)) : Math.exp(x)/(1+Math.exp(x));
const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
const fields = (r, required, optional=[]) => {
  if(!r || Object.keys(r).some(k=>![...required,...optional].includes(k)) || required.some(k=>!Object.hasOwn(r,k))) throw Error('Unexpected calibration observation fields');
};
const outcomeRow = r => {
  fields(r,['gameId','split','cp','target','weight']);
  if(!r.gameId||!['train','validation'].includes(r.split)||!Number.isFinite(r.cp)||!Number.isFinite(r.target)||r.target<0||r.target>1||!Number.isFinite(r.weight)||r.weight<=0)throw Error('Invalid outcome observation');
};
const choiceRow = r => {
  fields(r,['gameId','split','utilities','playedIndex']);
  if(!r.gameId||!['train','validation'].includes(r.split)||!Array.isArray(r.utilities)||r.utilities.length<2||r.utilities.some(x=>!Number.isFinite(x)||x<0||x>1)||!Number.isInteger(r.playedIndex)||r.playedIndex<0||r.playedIndex>=r.utilities.length)throw Error('Invalid choice observation');
};
function root(derivative, upper) {
  if(derivative(0)>=0)return{value:0,boundary:'lower'};
  if(derivative(upper)<=0)return{value:upper,boundary:'upper'};
  let low=0,high=upper;
  for(let i=0;i<80;i++){const mid=(low+high)/2;if(derivative(mid)>0)high=mid;else low=mid;}
  return{value:(low+high)/2,boundary:null};
}
export function fitHumanOutcome(rows) {
  if(!Array.isArray(rows)||!rows.length)throw Error('No outcome observations');
  rows.forEach(outcomeRow);
  if(rows.some(r=>r.split!=='train'))throw Error('Only training outcomes may fit the curve');
  const derivative = b => rows.reduce((s,r)=>s+r.weight*(sigmoid(b*r.cp/100)-r.target)*r.cp/100,0);
  const optimum=root(derivative,100);
  return{schema:'human-outcome-v1',slopePerPawn:optimum.value,boundary:optimum.boundary,
    observations:rows.length,games:new Set(rows.map(r=>r.gameId)).size,
    criterion:'Weighted fractional Bernoulli negative log likelihood; each game has unit total weight'};
}
export function humanExpected(score, model) {
  if(model?.schema!=='human-outcome-v1'||!Number.isFinite(model.slopePerPawn)||model.slopePerPawn<0||model.slopePerPawn>100)throw Error('Invalid human outcome model');
  if(score?.mate!=null){if(!Number.isInteger(score.mate)||score.mate===0)throw Error('Ambiguous mate score');return score.mate>0?1:0;}
  if(!Number.isFinite(score?.cp))throw Error('Missing centipawn score');
  return sigmoid(model.slopePerPawn*score.cp/100);
}
export function outcomeMetrics(rows,model) {
  if(!rows.length)throw Error('No outcome assessment rows');rows.forEach(outcomeRow);
  const weight=rows.reduce((s,r)=>s+r.weight,0);
  return{games:new Set(rows.map(r=>r.gameId)).size,observations:rows.length,
    logLoss:rows.reduce((s,r)=>{const p=Math.min(1-1e-12,Math.max(1e-12,humanExpected({cp:r.cp},model)));return s+r.weight*(-r.target*Math.log(p)-(1-r.target)*Math.log1p(-p));},0)/weight,
    brier:rows.reduce((s,r)=>s+r.weight*(humanExpected({cp:r.cp},model)-r.target)**2,0)/weight};
}
export function choiceStats(utilities,playedIndex,temperature) {
  if(!Number.isFinite(temperature)||temperature<0||temperature>1000)throw Error('Invalid choice temperature');
  choiceRow({gameId:'check',split:'train',utilities,playedIndex});
  const maximum=Math.max(...utilities),weights=utilities.map(u=>Math.exp(temperature*(u-maximum))),sum=weights.reduce((s,x)=>s+x,0);
  return{logLoss:Math.log(sum)+temperature*(maximum-utilities[playedIndex]),
    derivative:weights.reduce((s,w,i)=>s+w*utilities[i],0)/sum-utilities[playedIndex],
    probability:weights[playedIndex]/sum};
}
export function fitHumanChoice(rows) {
  if(!Array.isArray(rows)||!rows.length)throw Error('No choice observations');rows.forEach(choiceRow);
  if(rows.some(r=>r.split!=='train'))throw Error('Only training choices may fit temperature');
  if(new Set(rows.map(r=>r.gameId)).size!==rows.length)throw Error('Choice fitting needs one observation per game');
  const optimum=root(t=>rows.reduce((s,r)=>s+choiceStats(r.utilities,r.playedIndex,t).derivative,0),1000);
  return{schema:'human-choice-v1',temperature:optimum.value,boundary:optimum.boundary,games:rows.length,
    criterion:'Mean multinomial negative log likelihood, one legal move choice per game'};
}
export function choiceMetrics(rows,model) {
  if(model?.schema!=='human-choice-v1'||!rows.length)throw Error('Invalid choice assessment');rows.forEach(choiceRow);
  return{games:rows.length,logLoss:mean(rows.map(r=>choiceStats(r.utilities,r.playedIndex,model.temperature).logLoss)),uniformLogLoss:mean(rows.map(r=>Math.log(r.utilities.length)))};
}
export function humanMoveQuality(best,played,{outcome,choice},{forced=false,top=false}={}) {
  const before=humanExpected(best,outcome),after=humanExpected(played,outcome);
  if(choice?.schema!=='human-choice-v1'||!Number.isFinite(choice.temperature)||choice.temperature<0||choice.temperature>1000)throw Error('Invalid human choice model');
  const residual=before-after,loss=forced||top?0:Math.max(0,residual);
  return{quality:100*Math.exp(-choice.temperature*loss),loss,residual,eligible:!forced};
}
export function humanGameAccuracy(moves) {
  if(!Array.isArray(moves)||moves.some(m=>typeof m.eligible!=='boolean'||!Number.isFinite(m.quality)||m.quality<0||m.quality>100))throw Error('Invalid scored moves');
  return mean(moves.filter(m=>m.eligible).map(m=>m.quality));
}
export function policyVersion({outcome,choice,engineConfig,datasetSha256,selectionSha256}) {
  return hash(JSON.stringify({definition:humanPolicyDefinition,outcome,choice,engineConfig,datasetSha256,selectionSha256}));
}

import {choiceStats} from './human-policy.mjs';

export const groupedChoiceDefinition={schema:'grouped-human-choice-v1',
  observations:'All four preselected public choices per game; no ranking by scores or review labels.',
  weighting:'Each game contributes unit total weight, divided equally between its selected positions.',
  fitting:'Positive inverse temperature minimizes weighted multinomial negative log likelihood on training games only.',
};
function prepare(rows){
  if(!Array.isArray(rows)||!rows.length)throw Error('No grouped choices');
  const groups=new Map(),ids=new Set();
  for(const r of rows){
    const keys=['gameId','positionId','split','utilities','playedIndex'];
    if(Object.keys(r).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(r,k))||!r.gameId||!r.positionId||!['train','validation'].includes(r.split))throw Error('Invalid grouped choice fields');
    choiceStats(r.utilities,r.playedIndex,0);
    const id=r.gameId+':'+r.positionId;if(ids.has(id))throw Error('Duplicate position');ids.add(id);
    if(!groups.has(r.gameId))groups.set(r.gameId,[]);
    const group=groups.get(r.gameId);if(group.length&&group[0].split!==r.split)throw Error('Split crossed within game');group.push(r);
  }
  return [...groups.values()];
}
export function fitGroupedHumanChoice(rows){
  const groups=prepare(rows);if(rows.some(r=>r.split!=='train'))throw Error('Only training choices may fit temperature');
  const derivative=t=>groups.reduce((s,g)=>s+g.reduce((a,r)=>a+choiceStats(r.utilities,r.playedIndex,t).derivative,0)/g.length,0);
  let low=0,high=1000,boundary=null;
  if(derivative(low)>=0){high=0;boundary='lower';}
  else if(derivative(high)<=0){low=high;boundary='upper';}
  else for(let i=0;i<80;i++){const middle=(low+high)/2;if(derivative(middle)>0)high=middle;else low=middle;}
  return{schema:'human-choice-v1',temperature:(low+high)/2,boundary,games:groups.length,observations:rows.length,
    criterion:'Game-weighted multinomial negative log likelihood across all preselected choices',sampling:groupedChoiceDefinition};
}
export function groupedChoiceMetrics(rows,model){
  const groups=prepare(rows);if(model?.schema!=='human-choice-v1')throw Error('Invalid choice model');
  const average=fn=>groups.reduce((s,g)=>s+g.reduce((a,r)=>a+fn(r),0)/g.length,0)/groups.length;
  return{games:groups.length,observations:rows.length,logLoss:average(r=>choiceStats(r.utilities,r.playedIndex,model.temperature).logLoss),uniformLogLoss:average(r=>Math.log(r.utilities.length))};
}

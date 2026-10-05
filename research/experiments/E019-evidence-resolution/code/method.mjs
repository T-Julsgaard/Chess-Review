export const Z=2.241402727604947, WIDTHS=[.01,.02,.05,.1];
export function stats(values){
 if(values.length<2||values.some(x=>!Number.isFinite(x)))throw Error('Need finite paired observations');
 let mean=0,m2=0;values.forEach((x,i)=>{const d=x-mean;mean+=d/(i+1);m2+=d*(x-mean);});
 const sd=Math.sqrt(m2/(values.length-1)),squares=values.map(x=>(x-mean)**2).sort((a,b)=>b-a);
 return {games:values.length,mean,sampleSd:sd,hypotheticalIndependentSe:sd/Math.sqrt(values.length),
 positive:values.filter(x=>x>0).length,negative:values.filter(x=>x<0).length,zero:values.filter(x=>x===0).length,
 maxAbsoluteDifference:Math.max(...values.map(Math.abs)),largestCenteredSquares:[1,5,10].map(k=>({cases:Math.min(k,values.length),fraction:m2?squares.slice(0,k).reduce((s,x)=>s+x,0)/m2:0}))};
}
export function select(predictions){
 const rows=predictions.choices;if(!Array.isArray(rows)||rows.length!==600||new Set(rows.map(r=>r.gameId)).size!==600)throw Error('Incomplete/duplicate choices');
 for(const r of rows)if(typeof r.gameId!=='string'||!(r.role==='crossfit'&&r.split==='train'||r.role==='development'&&r.split==='validation')||[r.global?.logLoss,r.candidate?.logLoss].some(x=>!Number.isFinite(x)||x<0))throw Error('Invalid role/loss');
 const groups=Object.fromEntries(['crossfit','development'].map(role=>[role,rows.filter(r=>r.role===role).map(r=>r.global.logLoss-r.candidate.logLoss)]));
 if(groups.crossfit.length!==450||groups.development.length!==150)throw Error('Role coverage differs');return groups;
}
export function evaluate(predictions){
 const groups=select(predictions),roles=Object.fromEntries(Object.entries(groups).map(([role,v])=>[role,stats(v)])),sd=roles.development.sampleSd;
 return {schema:'E019-resolution-v1',roles,developmentNormalReference:{z:Z,level:.975,halfWidth:Z*sd/Math.sqrt(150),precisionGrid:WIDTHS.map(halfWidth=>({halfWidth,hypotheticalGames:Math.max(2,Math.ceil((Z*sd/halfWidth)**2))}))},
 exploratory:true,modelFits:0,performanceAssessments:0,engineSearches:0,humanLabelsUsed:0,confirmation:false,promoted:false,
 interpretation:'Descriptive paired variation; normal independent frozen-model planning approximation only, not achieved coverage, observed power or a revised E018 inference'};
}

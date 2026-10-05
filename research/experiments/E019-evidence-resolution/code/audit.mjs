const critical=2.241402727604947;
function close(a,b){if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-10*Math.max(1,Math.abs(a),Math.abs(b)))throw Error('Independent numeric mismatch');}
export function audit(predictions,result,previous){
 if(result.schema!=='E019-resolution-v1'||!result.exploratory||result.confirmation||result.promoted||result.modelFits!==0||result.performanceAssessments!==0||result.engineSearches!==0||result.humanLabelsUsed!==0)throw Error('Changed claim');
 const seen=new Set();for(const r of predictions.choices){if(seen.has(r.gameId))throw Error('Duplicate');seen.add(r.gameId);if(!['train','validation'].includes(r.split)||r.role!==(r.split==='train'?'crossfit':'development')||!Number.isFinite(r.global.logLoss)||!Number.isFinite(r.candidate.logLoss)||r.global.logLoss<0||r.candidate.logLoss<0)throw Error('Invalid input');}
 if(seen.size!==600)throw Error('Coverage');
 for(const role of ['crossfit','development']){
 const values=predictions.choices.filter(r=>r.role===role).map(r=>r.global.logLoss-r.candidate.logLoss),n=values.length,s=result.roles[role];
 if(n!==(role==='crossfit'?450:150)||s.games!==n)throw Error('Role coverage');
 const mean=values.reduce((a,b)=>a+b,0)/n,sumSquares=values.reduce((total,x)=>total+(x-mean)*(x-mean),0),sd=Math.sqrt(sumSquares/(n-1));
 close(s.mean,mean);close(s.mean,previous[role==='crossfit'?'crossFitImprovement':'improvement'].estimate);close(s.sampleSd,sd);close(s.hypotheticalIndependentSe,sd/Math.sqrt(n));
 const positive=values.reduce((a,x)=>a+Number(x>0),0),negative=values.reduce((a,x)=>a+Number(x<0),0);if(s.positive!==positive||s.negative!==negative||s.zero!==n-positive-negative)throw Error('Counts');close(s.maxAbsoluteDifference,values.reduce((a,x)=>Math.max(a,Math.abs(x)),0));
 const ranked=[...values].sort((a,b)=>Math.abs(b-mean)-Math.abs(a-mean));if(s.largestCenteredSquares.length!==3)throw Error('Tail count');
 [1,5,10].forEach((k,i)=>{const item=s.largestCenteredSquares[i];if(item.cases!==Math.min(k,n))throw Error('Tail k');close(item.fraction,sumSquares?ranked.slice(0,k).reduce((a,x)=>a+(x-mean)**2,0)/sumSquares:0);});
 if(role==='development'){const q=result.developmentNormalReference;if(q.z!==critical||q.level!==.975||q.precisionGrid.length!==4)throw Error('Planning definition');close(q.halfWidth,critical*sd/Math.sqrt(n));[.01,.02,.05,.1].forEach((h,i)=>{const row=q.precisionGrid[i],needed=Math.max(2,Math.ceil(critical*critical*sd*sd/(h*h)));if(row.halfWidth!==h||row.hypotheticalGames!==needed)throw Error('Planning grid');});}
 }
 return {passed:true,choices:600,crossfit:450,development:150,varianceAlgorithms:2,tailCounts:[1,5,10],planningPoints:4,previousMeansMatched:true};
}

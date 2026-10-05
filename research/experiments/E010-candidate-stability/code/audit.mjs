// Independent equations: do not import the assessment's utility/vector/TV code.
const near=(a,b,label)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-10)throw Error('Independent '+label+' differs');};
const points=(score,model)=>score.mate!=null?Number(score.mate>0):1/(1+Math.exp(-model.curve.coefficient*score.cp/100));
function vector(scores,model){const us=scores.map(s=>points(s,model)),m=Math.max(...us),xs=us.map(u=>Math.exp(model.choice.temperature*(u-m))),sum=xs.reduce((a,b)=>a+b,0);return xs.map(x=>x/sum);}
export function audit(high,low,freeze,result){
  const first=new Map(low.searches.map(r=>[r.key,r])),second=new Map(high.searches.map(r=>[r.key,r])),positions=new Map(high.positions.map(p=>[p.gameId,p])),differences=[];
  let vectors=0,tvCount=0,rootCount=0,firstTotal=0,secondTotal=0;
  for(const row of result.records){
    const p=positions.get(row.gameId),values={};
    for(const [name,model] of Object.entries(freeze.models)){
      const a=vector(p.alternatives.map(r=>first.get(r.baselineKey).score),model),b=vector(p.alternatives.map(r=>second.get(r.key).score),model),saved=row[name];
      if(a.length!==saved.low.length||b.length!==saved.high.length)throw Error('Independent vector coverage differs');
      a.forEach((v,i)=>near(v,saved.low[i],'low vector'));b.forEach((v,i)=>near(v,saved.high[i],'high vector'));vectors+=2;
      const tv=a.reduce((sum,v,i)=>sum+Math.max(0,v-b[i]),0),root=Math.abs(points(first.get(p.baselineRootKey).score,model)-points(second.get(p.rootKey).score,model)),index=p.legalMoves.indexOf(p.played),drift=Math.abs(-Math.log(a[index])+Math.log(b[index]));
      near(tv,saved.tv,'total variation');near(root,saved.rootDrift,'root drift');near(drift,saved.playedLossDrift,'played loss drift');values[name]=tv;
      if(name==='cp'){tvCount+=Number(tv<=.1);rootCount+=Number(root<=.05);secondTotal+=tv;}else firstTotal+=tv;
    }
    differences.push(values.fixed-values.cp);
  }
  const n=differences.length;near(firstTotal/n,result.summary.fixed.tv.mean,'fixed mean');near(secondTotal/n,result.summary.cp.tv.mean,'candidate mean');
  near(tvCount,result.summary.cp.withinTv.successes,'TV successes');near(rootCount,result.summary.cp.withinRoot.successes,'root successes');
  const bound=count=>{const p=count/n,z=1.959963984540054;return(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n);};
  near(bound(tvCount),result.summary.cp.withinTv.lower,'TV Wilson lower');near(bound(rootCount),result.summary.cp.withinRoot.lower,'root Wilson lower');
  let state=20261039;const samples=[];
  for(let i=0;i<10000;i++){let sum=0;for(let j=0;j<n;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=differences[Math.floor(state/4294967296*n)];}samples.push(sum/n);}
  samples.sort((a,b)=>a-b);const estimate=differences.reduce((a,b)=>a+b,0)/n,lower=samples[Math.floor(.025*9999)],upper=samples[Math.floor(.975*9999)];
  near(estimate,result.improvement.estimate,'paired estimate');near(lower,result.improvement.lower,'95% lower');near(upper,result.improvement.upper,'95% upper');
  const gates={practical:estimate>=.05*firstTotal/n,interval:lower>0,tvTolerance:tvCount/n>=.9&&bound(tvCount)>=.8,rootTolerance:rootCount/n>=.9&&bound(rootCount)>=.8};
  if(JSON.stringify(gates)!==JSON.stringify(result.gates)||Object.values(gates).every(Boolean)!==result.passed)throw Error('Independent gates differ');
  return{passed:true,vectors,pairedGames:n,bootstrapResamples:10000,interpretation:'Independent equations reconstruct vectors, mass shifts, headline intervals and gates; no fresh human confirmation'};
}

export const sigmoid=z=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function features(row,family){
  if(![row.p,row.ply,row.ownRating,row.opponentRating].every(Number.isFinite)||row.p<0||row.p>1||!['w','b'].includes(row.color))throw Error('Invalid outcome predictors');
  const p=clamp(row.p,.0005,.9995),x=Math.log(p)-Math.log1p(-p),t=clamp(row.ply/80,0,1);
  const s=clamp(((row.ownRating+row.opponentRating)/2-600)/2400,0,1),d=clamp((row.ownRating-row.opponentRating)/400,-3,3),c=row.color==='w'?1:-1;
  if(family==='scalar')return[x];
  if(family==='static')return[x,d,c];
  if(family==='phaseSkill')return[x*(1-t)*(1-s),x*(1-t)*s,x*t*(1-s),x*t*s,d,c];
  throw Error('Unknown model family');
}
export function pointLoss(p,y){
  p=clamp(p,1e-12,1-1e-12);
  return-y*Math.log(p)-(1-y)*Math.log1p(-p);
}
const logisticLoss=(z,y)=>z>=0?Math.log1p(Math.exp(-z))+(1-y)*z:Math.log1p(Math.exp(z))-y*z;
export function predict(model,row){return sigmoid(features(row,model.family).reduce((s,x,j)=>s+x*model.coefficients[j],0));}

// Convex coordinate Newton updates with nonnegative slope coordinates and objective backtracking.
export function fit(rows,family,lambda){
  if(!rows.length||lambda<=0||rows.some(r=>r.split!=='train'||!Number.isFinite(r.y)||r.y<0||r.y>1||!(r.weight>0)))throw Error('Invalid training outcomes');
  const x=rows.map(r=>features(r,family)),dimensions=x[0].length,positive=family==='phaseSkill'?4:1;
  const coefficients=Array.from({length:dimensions},(_,j)=>j<positive?.25:0);
  let z=x.map(values=>values.reduce((s,v,j)=>s+v*coefficients[j],0)),sweeps=0,converged=false;
  const total=rows.reduce((s,r)=>s+r.weight,0);
  const objective=(values,beta)=>values.reduce((s,v,i)=>s+rows[i].weight*logisticLoss(v,rows[i].y),0)+.5*lambda*beta.reduce((s,b)=>s+b*b,0);
  let value=objective(z,coefficients),maximumProjectedGradient=Infinity;
  for(;sweeps<1000;sweeps++){
    for(let j=0;j<dimensions;j++){
      let gradient=lambda*coefficients[j],hessian=lambda;
      for(let i=0;i<rows.length;i++){
        const p=sigmoid(z[i]);gradient+=rows[i].weight*(p-rows[i].y)*x[i][j];hessian+=rows[i].weight*p*(1-p)*x[i][j]**2;
      }
      let delta=-gradient/hessian;
      if(j<positive)delta=Math.max(delta,-coefficients[j]);
      if(Math.abs(delta)<1e-14)continue;
      let accepted=false;
      for(let attempt=0;attempt<40;attempt++){
        const next=coefficients.slice();next[j]+=delta;
        const nextZ=z.map((v,i)=>v+delta*x[i][j]),nextValue=objective(nextZ,next);
        if(nextValue<=value+1e-10){coefficients[j]=next[j];z=nextZ;value=nextValue;accepted=true;break;}
        delta*=.5;
      }
      if(!accepted)throw Error('Coordinate line search failed');
    }
    maximumProjectedGradient=0;
    for(let j=0;j<dimensions;j++){
      let gradient=lambda*coefficients[j];
      for(let i=0;i<rows.length;i++)gradient+=rows[i].weight*(sigmoid(z[i])-rows[i].y)*x[i][j];
      if(j<positive&&coefficients[j]<=1e-12&&gradient>=0)gradient=0;
      maximumProjectedGradient=Math.max(maximumProjectedGradient,Math.abs(gradient)/total);
    }
    if(maximumProjectedGradient<=1e-7){converged=true;sweeps++;break;}
  }
  return{schema:'practical-wdl-outcome-v1',family,lambda,coefficients,positiveSlopeCoordinates:positive,
    sweeps,converged,maximumProjectedGradient,objective:value,trainingGames:new Set(rows.map(r=>r.gameId)).size};
}

import {fit,predict,solve} from './fit-rating.mjs';
function objective(rows,model,delta){
  const residuals=rows.map(r=>Math.abs(predict(model,r)-r.ratingTarget));
  return residuals.reduce((s,r)=>s+(r<=delta?.5*r*r:delta*(r-.5*delta)),0)+.5*model.lambda*model.coefficients.slice(1).reduce((s,b)=>s+b*b,0);
}
export function fitHuber(rows,lambda,names,delta=100,maxIterations=50){
  if (!rows.length || rows.some(r => r.split !== 'train' || !Number.isFinite(r.ratingTarget) || names.some(n => !Number.isFinite(r[n])))) throw Error('Invalid training rating features');
  if(!Number.isFinite(lambda)||lambda<=0||!Number.isFinite(delta)||delta<=0||!Number.isInteger(maxIterations)||maxIterations<1)throw Error('Invalid robust fit settings');
  let model=fit(rows,lambda,names),previous=objective(rows,model,delta),converged=false,iterations=0;
  const x=rows.map(r=>[1,...names.map((n,j)=>(r[n]-model.center[j])/model.scale[j])]),p=names.length+1;
  for(;iterations<maxIterations;iterations++){
    const a=Array.from({length:p},()=>Array(p).fill(0)),b=Array(p).fill(0);
    for(let i=0;i<rows.length;i++){
      const residual=Math.abs(predict(model,rows[i])-rows[i].ratingTarget),w=residual<=delta?1:delta/residual;
      for(let j=0;j<p;j++){b[j]+=w*x[i][j]*rows[i].ratingTarget;for(let k=0;k<p;k++)a[j][k]+=w*x[i][j]*x[i][k];}
    }
    for(let j=1;j<p;j++)a[j][j]+=lambda;
    const next={...model,coefficients:solve(a,b)},value=objective(rows,next,delta);
    if(value>previous+1e-7*Math.max(1,previous))throw Error('Robust objective increased');
    model=next;
    if(Math.abs(previous-value)<=1e-7*Math.max(1,previous)){converged=true;iterations++;break;}
    previous=value;
  }
  return {...model,objective:'huber',delta,iterations,converged};
}


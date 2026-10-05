// Independent equations: do not import the curve fitter, probability or loss code.
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const near=(a,b,message,tolerance=1e-10)=>assert(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,message);
const logistic=x=>1/(1+Math.exp(-x));
function rawPoints(s){const [w,d,l]=s.wdl;assert(w+d+l===1000,'WDL audit sum');return(w+d/2)/1000;}
function x(s,kind){if(kind==='cp')return s.cp/100;const p=Math.min(.9995,Math.max(.0005,rawPoints(s)));return Math.log(p/(1-p));}
function p(s,curve){return s.mate!=null?Number(s.mate>0):logistic(curve.coefficient*x(s,curve.kind));}
function nll(probability,target){const q=Math.min(1-1e-12,Math.max(1e-12,probability));return-(target*Math.log(q)+(1-target)*Math.log(1-q));}
function choice(scores,index,model){
  const utilities=scores.map(s=>p(s,model.curve)),maximum=Math.max(...utilities),weights=utilities.map(u=>Math.exp(model.choice.temperature*(u-maximum))),total=weights.reduce((a,b)=>a+b,0);
  return{probability:weights[index]/total,logLoss:Math.log(total)+model.choice.temperature*(maximum-utilities[index]),
    gradient:weights.reduce((sum,w,i)=>sum+w*utilities[i],0)/total-utilities[index]};
}
function optimum(gradient,boundary,label){
  if(boundary===null)near(gradient,0,label+' stationarity',1e-8);
  else if(boundary==='lower')assert(gradient>=-1e-8,label+' lower boundary');
  else if(boundary==='upper')assert(gradient<=1e-8,label+' upper boundary');
  else throw Error('Invalid fit boundary');
}
export function audit(prepared,result,records){
  const train=prepared.outcomes.filter(r=>r.split==='train'),choices=prepared.choices.filter(r=>r.split==='train');
  const gradients={};let outcomeChecks=0,choiceChecks=0;
  for(const name of ['fixed','cp','wdl']){
    const model=result.models[name],rs=records[name];assert(rs.outcomes.length===prepared.outcomes.length&&rs.choices.length===prepared.choices.length,'Audit coverage');
    const gradient=train.reduce((sum,r)=>sum+r.weight*(p(r.score,model.curve)-r.target)*x(r.score,model.curve.kind),0),
      choiceGradient=choices.reduce((sum,r)=>sum+choice(r.scores,r.playedIndex,model).gradient,0);
    if(name!=='fixed')optimum(gradient,model.curve.boundary,name+' curve');
    else near(model.curve.coefficient,.368208,'Fixed comparator');
    optimum(choiceGradient,model.choice.boundary,name+' choice');gradients[name]={curve:gradient,choice:choiceGradient};
    for(let i=0;i<prepared.outcomes.length;i++){
      const source=prepared.outcomes[i],saved=rs.outcomes[i],probability=p(source.score,model.curve);
      assert(source.gameId===saved.gameId&&source.ply===saved.ply&&source.split===saved.split&&source.target===saved.target,'Outcome audit binding');
      near(probability,saved.probability,'Outcome probability');near(nll(probability,source.target),saved.logLoss,'Outcome loss',1e-9);near((probability-source.target)**2,saved.brier,'Outcome Brier');outcomeChecks++;
    }
    for(let i=0;i<prepared.choices.length;i++){
      const source=prepared.choices[i],saved=rs.choices[i],stats=choice(source.scores,source.playedIndex,model);
      assert(source.gameId===saved.gameId&&source.ply===saved.ply&&source.split===saved.split,'Choice audit binding');
      near(stats.probability,saved.probability,'Choice probability');near(stats.logLoss,saved.logLoss,'Choice loss');choiceChecks++;
    }
    for(const split of ['train','validation']){
      const out=rs.outcomes.filter(r=>r.split===split),byGame=new Map();for(const r of out){if(!byGame.has(r.gameId))byGame.set(r.gameId,[]);byGame.get(r.gameId).push(r);}
      const gameMeans=[...byGame.values()].map(rows=>({logLoss:rows.reduce((s,r)=>s+r.logLoss,0)/rows.length,brier:rows.reduce((s,r)=>s+r.brier,0)/rows.length}));
      for(const field of ['logLoss','brier'])near(gameMeans.reduce((s,r)=>s+r[field],0)/gameMeans.length,result.roles[split].metrics[name].outcomes[field],'Equal game outcome metric');
      const cs=rs.choices.filter(r=>r.split===split);near(cs.reduce((s,r)=>s+r.logLoss,0)/cs.length,result.roles[split].metrics[name].choices.logLoss,'Equal game choice metric');
    }
  }
  return{passed:true,gradients,outcomeChecks,choiceChecks,interpretation:'Independent equations check fit stationarity, every prediction and equal-game metrics; this is numerical verification, not independent scientific confirmation'};
}

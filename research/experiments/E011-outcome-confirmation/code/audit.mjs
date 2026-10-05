// Independent prediction/target/aggregation/gate equations, no scoring imports.
const near=(a,b,label)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-10)throw Error('Independent '+label+' differs');};
const point=(s,curve)=>1/(1+Math.exp(-curve.coefficient*s.cp/100));
const labels=r=>['rating:'+(r.rating<1200?'<1200':r.rating<2000?'1200-1999':'>=2000'),'ply:'+(r.ply<=20?'<=20':r.ply<=50?'21-50':'>50'),'fixed-points:'+(r.fixedPoints<.1?'<0.1':r.fixedPoints>.9?'>0.9':'0.1-0.9')];
const nll=(p,y)=>{const q=Math.max(1e-12,Math.min(1-1e-12,p));return-(y*Math.log(q)+(1-y)*Math.log(1-q));};
function means(rows){const groups=new Map();for(const r of rows){if(!groups.has(r.gameId))groups.set(r.gameId,[]);groups.get(r.gameId).push(r);}return[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([gameId,rs])=>({gameId,logLoss:rs.reduce((s,r)=>s+r.logLoss,0)/rs.length,brier:rs.reduce((s,r)=>s+r.brier,0)/rs.length}));}
function interval(xs,seed){let state=seed>>>0;const samples=[];for(let i=0;i<10000;i++){let sum=0;for(let j=0;j<xs.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=xs[Math.floor(state/4294967296*xs.length)];}samples.push(sum/xs.length);}samples.sort((a,b)=>a-b);return{estimate:xs.reduce((a,b)=>a+b,0)/xs.length,lower:samples[Math.floor(.0125*9999)],upper:samples[Math.floor(.9875*9999)]};}
export function audit(prepared,freeze,result,dataset){
  const games=new Map(dataset.filter(g=>g.split==='test').map(g=>[g.id,g])),weights=new Map();let predictions=0;
  for(const r of prepared.rows){const g=games.get(r.gameId),white=g?.result==='1-0'?1:g?.result==='0-1'?0:g?.result==='1/2-1/2'?.5:null,color=r.ply%2?'w':'b';
    if(!g||r.color!==color||r.rating!==g.players.find(p=>p.color===color)?.rating||r.target!==(color==='w'?white:1-white))throw Error('Independent target perspective differs');weights.set(r.gameId,(weights.get(r.gameId)||0)+r.weight);}
  for(const w of weights.values())near(w,1,'game unit weight');
  for(const [i,mode] of ['20k','80k'].entries()){
    const independently={};
    for(const name of ['fixed','cp','constant']){
      independently[name]=prepared.rows.map((r,index)=>{const saved=result.records[mode][name][index],p=name==='constant'?.5:point(r.scores[mode],freeze.curves[name]),l=nll(p,r.target),b=(p-r.target)**2;
        const fixedPoints=point(r.scores['20k'],freeze.curves.fixed);
        if(saved.gameId!==r.gameId||saved.ply!==r.ply||saved.split!=='test'||saved.color!==r.color||saved.rating!==r.rating||saved.target!==r.target)throw Error('Independent root coverage differs');near(fixedPoints,saved.fixedPoints,'fixed diagnostic bin');near(p,saved.probability,'root probability');near(l,saved.logLoss,'root loss');near(b,saved.brier,'Brier');predictions++;return{gameId:r.gameId,ply:r.ply,rating:r.rating,fixedPoints,logLoss:l,brier:b};});
      const ms=means(independently[name]),saved=result.modes[mode].metrics[name];near(ms.length,saved.games,'game coverage');near(ms.reduce((s,r)=>s+r.logLoss,0)/ms.length,saved.logLoss,'game mean loss');near(ms.reduce((s,r)=>s+r.brier,0)/ms.length,saved.brier,'game mean Brier');
    }
    const c=means(independently.cp);
    const groupLabels=[...new Set(independently.fixed.flatMap(labels))].sort(),savedGroups=result.modes[mode].groups;
    if(groupLabels.length!==savedGroups.length)throw Error('Independent subgroup coverage differs');
    for(const [j,label] of groupLabels.entries()){
      const saved=savedGroups[j];if(saved.label!==label)throw Error('Independent subgroup label differs');
      const stats={};for(const name of ['fixed','cp']){const rows=independently[name].filter(r=>labels(r).includes(label)),ms=means(rows);stats[name]={games:ms.length,observations:rows.length,logLoss:ms.reduce((s,r)=>s+r.logLoss,0)/ms.length,brier:ms.reduce((s,r)=>s+r.brier,0)/ms.length};for(const key of Object.keys(stats[name]))near(stats[name][key],saved[name][key],'subgroup '+key);}
      const sufficient=stats.fixed.games>=30,passed=sufficient?stats.cp.logLoss-stats.fixed.logLoss<=.03&&stats.cp.brier-stats.fixed.brier<=.01:null;
      if(sufficient!==saved.sufficient||passed!==saved.passed)throw Error('Independent subgroup guard differs');
    }
    for(const [name,seed,saved] of [['fixed',20261041+i,result.modes[mode].fixedImprovement],['constant',20261043+i,result.modes[mode].constantImprovement]]){
      const b=means(independently[name]);if(b.some((r,j)=>r.gameId!==c[j].gameId))throw Error('Independent game pairing differs');const expected=interval(b.map((r,j)=>r.logLoss-c[j].logLoss),seed);for(const key of ['estimate','lower','upper'])near(expected[key],saved[key],'paired '+key);
    }
  }
  const maxima=new Map();for(const r of prepared.rows){const d=Math.abs(point(r.scores['20k'],freeze.curves.cp)-point(r.scores['80k'],freeze.curves.cp));maxima.set(r.gameId,Math.max(maxima.get(r.gameId)||0,d));}
  const n=maxima.size,count=[...maxima.values()].filter(x=>x<=.05).length,p=count/n,z=1.959963984540054,lower=(p+z*z/(2*n)-z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n)))/(1+z*z/n);
  near(count,result.stability.successes,'panel stability count');near(lower,result.stability.lower,'panel Wilson bound');
  const budgetPass=mode=>{const r=result.modes[mode],g={fixedPractical:r.fixedImprovement.estimate>=.01,fixedInterval:r.fixedImprovement.lower>0,constantPractical:r.constantImprovement.estimate>=.01,constantInterval:r.constantImprovement.lower>0,brier:r.metrics.cp.brier<=r.metrics.fixed.brier,groups:r.groups.every(x=>x.passed!==false)};
    if(JSON.stringify(g)!==JSON.stringify(r.gates))throw Error('Independent budget gates differ');return Object.values(g).every(Boolean);};
  const gates={budget20k:budgetPass('20k'),budget80k:budgetPass('80k'),coverage:n>=285&&prepared.rows.length>0,rootStability:p>=.9&&lower>=.8};if(JSON.stringify(gates)!==JSON.stringify(result.gates)||Object.values(gates).every(Boolean)!==result.passed)throw Error('Independent joint gates differ');
  return{passed:true,predictions,gameWeightChecks:weights.size,bootstrapResamples:40000,interpretation:'Independent equations check target orientation, weights, predictions, paired intervals and joint gates; scope is CP-only'};
}

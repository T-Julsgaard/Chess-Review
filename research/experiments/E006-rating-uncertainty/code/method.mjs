import {fitHuber} from '../../../../tools/calibration/fit-huber.mjs';
import {fit as ridge,predict} from '../../../../tools/calibration/fit-rating.mjs';
import {featuresFor,baseNames} from '../../E002-nonlinear-rating/code/evaluate.mjs';
import {playerComponents,playerRoleOverlap} from '../../E001-evidence-audit/code/audit.mjs';
import {sha256} from '../../../data-policy.mjs';

export const scaleNames=['decisionsLog','contestedFraction','legalChoicesLog','topRate','logRmsLoss','prediction'];
export function rowsFor(evidence){return evidence.rows.map(r=>({...r,...featuresFor(r),decisions:r.contextMoves.filter(m=>m.eligible).length}));}
export function foldMaps(games){
  const maps={outer:new Map(),inner:new Map()};
  for(const component of playerComponents(games)){
    if(component.length!==1)throw Error('E006 requires unique players across games');
    for(const id of component){maps.outer.set(id,parseInt(sha256('E006-outer-v1:'+component[0]).slice(0,8),16)%5);maps.inner.set(id,parseInt(sha256('E006-scale-v1:'+component[0]).slice(0,8),16)%3);}
  }
  if(playerRoleOverlap(games,g=>maps.outer.get(g.id)))throw Error('Player leakage');
  return maps;
}
export function partition(rows,maps,fold){
  const fit=[],calibration=[],test=[];
  for(const r of rows){const f=maps.outer.get(r.gameId);if(f==null)throw Error('Unassigned game');const role=f===fold?'test':f===(fold+1)%5?'calibration':'fit';({fit,calibration,test})[role].push({...r,role});}
  if(!fit.length||!calibration.length||!test.length)throw Error('Empty partition');
  return{fit,calibration,test};
}
export function fitPoint(rows,engine){
  if(rows.some(r=>r.role!=='fit'||r.split!=='train'))throw Error('Only fit roles may train a model');
  const model=fitHuber(rows,engine==='sf18'?1:10,baseNames,engine==='sf18'?100:250);
  if(!model.converged)throw Error('Point fit did not converge');
  return model;
}
export function fitScale(rows,maps,engine){
  const scored=[],innerModels=[];
  for(let fold=0;fold<3;fold++){
    const train=rows.filter(r=>maps.inner.get(r.gameId)!==fold),test=rows.filter(r=>maps.inner.get(r.gameId)===fold);
    if(!train.length||!test.length)throw Error('Empty scale fold');
    const point=fitPoint(train,engine);
    innerModels.push({fold,point,trainingGames:[...new Set(train.map(r=>r.gameId))].sort()});
    for(const row of test){const prediction=predict(point,row);scored.push({...row,prediction,ratingTarget:Math.log1p(Math.abs(prediction-row.ratingTarget))});}
  }
  const model=ridge(scored,10,scaleNames);
  return{model,innerModels,innerOOFHash:sha256(JSON.stringify(scored.map(r=>({gameId:r.gameId,color:r.color,prediction:r.prediction,target:r.ratingTarget}))))};
}
export function scaleAt(model,row,point){return Math.max(50,Math.min(1000,Math.expm1(predict(model,{...row,prediction:point}))));}
export function gameScores(rows,point,scale=null){
  const byGame=new Map();
  for(const row of rows){const p=predict(point,row),s=scale?scaleAt(scale,row,p):1,score=Math.abs(p-row.ratingTarget)/s;byGame.set(row.gameId,Math.max(byGame.get(row.gameId)||0,score));}
  return [...byGame.entries()].sort(([a],[b])=>a.localeCompare(b));
}
export function quantile(scores,alpha=.1){
  if(!scores.length||scores.some(s=>!Number.isFinite(s)||s<0)||!(alpha>0&&alpha<1))throw Error('Invalid calibration scores');
  const rank=Math.ceil((scores.length+1)*(1-alpha)),ordered=scores.slice().sort((a,b)=>a-b);
  return{q:rank>ordered.length?Infinity:ordered[rank-1],rank,n:scores.length,alpha};
}
export function intervalScore(y,lower,upper){if(![y,lower,upper].every(Number.isFinite)||lower>upper)throw Error('Invalid interval');return upper-lower+20*Math.max(lower-y,y-upper,0);}
export function perGame(records,name){
  const groups=new Map();
  for(const row of records){if(!groups.has(row.gameId))groups.set(row.gameId,[]);groups.get(row.gameId).push(row);}
  return[...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([gameId,rows])=>{
    const widths=rows.map(r=>r[name][1]-r[name][0]),covered=rows.map(r=>r.ratingTarget>=r[name][0]&&r.ratingTarget<=r[name][1]);
    return{gameId,coverage:Number(covered.every(Boolean)),sideCoverage:covered.filter(Boolean).length/rows.length,
      width:widths.reduce((a,b)=>a+b,0)/rows.length,score:rows.reduce((s,r)=>s+intervalScore(r.ratingTarget,...r[name]),0)/rows.length,
      mae:rows.reduce((s,r)=>s+Math.abs(r.point-r.ratingTarget),0)/rows.length};
  });
}
export function summary(records,name){
  if(!records.length)return null;const games=perGame(records,name),widths=records.map(r=>r[name][1]-r[name][0]).sort((a,b)=>a-b);
  const average=k=>games.reduce((s,g)=>s+g[k],0)/games.length;
  return{games:games.length,sides:records.length,coverage:average('coverage'),sideCoverage:average('sideCoverage'),meanWidth:average('width'),intervalScore:average('score'),pointMAE:average('mae'),
    medianSideWidth:widths[Math.floor((widths.length-1)*.5)],sideWidth90:widths[Math.floor((widths.length-1)*.9)]};
}
export function bootstrap(values,seed,iterations=10000){
  let state=seed>>>0;const samples=[];
  for(let i=0;i<iterations;i++){let sum=0;for(let j=0;j<values.length;j++){state=(Math.imul(state,1664525)+1013904223)>>>0;sum+=values[Math.floor(state/4294967296*values.length)];}samples.push(sum/values.length);}
  samples.sort((a,b)=>a-b);
  return{estimate:values.reduce((a,b)=>a+b,0)/values.length,lower:samples[Math.floor(.0125*(iterations-1))],upper:samples[Math.floor(.9875*(iterations-1))],level:.975,seed,iterations,unit:'game',interpretation:'Development paired game percentile interval; not full cross-fitting uncertainty'};
}
export function groupLabels(row){const r=row.ratingTarget,d=row.decisions,p=row.point;return['rating:'+(r<1000?'<1000':r<1500?'1000-1499':r<2000?'1500-1999':r<2500?'2000-2499':'>=2500'),
  'decisions:'+(d<20?'10-19':d<40?'20-39':'40+'),'predicted:'+(p<1200?'<1200':p<2000?'1200-1999':'>=2000')];}

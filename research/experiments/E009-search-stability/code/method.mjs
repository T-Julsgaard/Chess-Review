import {sha256} from '../../../data-policy.mjs';
import {sf19MoveQuality,engineExpectedPoints,expectedPoints,SF19_OUTCOME} from '../../../../lib/public-scoring.js';
export function selectGames(games){
  if(games.some(g=>!['train','validation'].includes(g.split)))throw Error('Reserved/unknown game role');
  return['train','validation'].flatMap(role=>{
    const group=games.filter(g=>g.split===role).map(g=>({game:g,key:sha256('E009-games-v1:'+g.id)})).sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0),n=role==='train'?30:15;
    if(group.length<n)throw Error('Insufficient role games');return group.slice(0,n).map(r=>r.game);
  });
}
export function wilson(successes,n){
  if(!Number.isInteger(n)||n<1||!Number.isInteger(successes)||successes<0||successes>n)throw Error('Invalid binomial counts');
  const z=1.959963984540054,p=successes/n,d=1+z*z/n,center=(p+z*z/(2*n))/d,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
  return{successes,n,estimate:p,lower:center-half,upper:center+half,level:.95,method:'Wilson score; one fixed focal choice per disjoint game'};
}
export function decision(root,alternatives,played){
  const chosen=alternatives.find(r=>r.move===played);if(!chosen||alternatives.length<2)throw Error('Missing/nonforced decision');
  const cp=sf19MoveQuality(root.score,chosen.score,{top:root.bestmove===played}),residual=engineExpectedPoints(root.score)-engineExpectedPoints(chosen.score),
    points=alternatives.map(r=>expectedPoints(r.score,SF19_OUTCOME)),maximum=Math.max(...points),best=alternatives.filter((r,i)=>points[i]>=maximum-.001).map(r=>r.move).sort();
  return{cpLoss:cp.loss,quality:cp.quality,wdlLoss:root.bestmove===played?0:Math.max(0,residual),cpResidual:cp.residual,wdlResidual:residual,
    best,bestmove:root.bestmove,rootMate:root.score.mate??null,playedMate:chosen.score.mate??null,fixedPoints:expectedPoints(root.score,SF19_OUTCOME)};
}
export function drift(game,position,low,high){
  const player=game.players.find(p=>p.color===position.color);if(!Number.isFinite(player?.rating))throw Error('Missing diagnostic rating');
  return{gameId:game.id,split:game.split,ply:position.ply,rating:player.rating,fixedPoints:low.fixedPoints,low,high,
    cpLossDrift:Math.abs(low.cpLoss-high.cpLoss),wdlLossDrift:Math.abs(low.wdlLoss-high.wdlLoss),qualityDrift:Math.abs(low.quality-high.quality),
    bestOverlap:low.best.some(m=>high.best.includes(m)),sameBestSet:JSON.stringify(low.best)===JSON.stringify(high.best),
    rootBestChanged:low.bestmove!==high.bestmove,mateTransition:low.rootMate!==high.rootMate||low.playedMate!==high.playedMate};
}
export function summary(rows){
  if(!rows.length)return null;
  const distribution=field=>{const xs=rows.map(r=>r[field]).sort((a,b)=>a-b);return{mean:xs.reduce((a,b)=>a+b,0)/xs.length,median:xs[Math.floor((xs.length-1)*.5)],p90:xs[Math.floor((xs.length-1)*.9)],maximum:xs.at(-1)};};
  const cp=wilson(rows.filter(r=>r.cpLossDrift<=.05).length,rows.length),wdl=wilson(rows.filter(r=>r.wdlLossDrift<=.05).length,rows.length),best=wilson(rows.filter(r=>r.bestOverlap).length,rows.length),quality=distribution('qualityDrift');
  const gate=x=>x.estimate>=.9&&x.lower>=.8,gates={cpLoss:gate(cp),wdlLoss:gate(wdl),bestAlternative:gate(best),displayedQuality:quality.mean<=5};
  return{games:rows.length,cpLoss:distribution('cpLossDrift'),wdlLoss:distribution('wdlLossDrift'),quality,withinCpTolerance:cp,withinWdlTolerance:wdl,bestAlternativeOverlap:best,
    sameBestSets:rows.filter(r=>r.sameBestSet).length,rootBestChanges:rows.filter(r=>r.rootBestChanged).length,mateTransitions:rows.filter(r=>r.mateTransition).length,
    negativeCpResiduals:{low:rows.filter(r=>r.low.cpResidual<0).length,high:rows.filter(r=>r.high.cpResidual<0).length},
    negativeWdlResiduals:{low:rows.filter(r=>r.low.wdlResidual<0).length,high:rows.filter(r=>r.high.wdlResidual<0).length},gates,passed:Object.values(gates).every(Boolean)};
}

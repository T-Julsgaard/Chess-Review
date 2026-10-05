import {Chess} from '../../../../lib/chess.js';
const values={p:1,n:3,b:3,r:5,q:9,k:0},near=(a,b,label)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-10)throw Error('Independent '+label+' differs');};
export function exchange(board,square,state={nodes:0,maxNodes:16384}){
  if(++state.nodes>state.maxNodes)return null;const legal=board.moves({verbose:true}),captures=legal.filter(m=>m.to===square&&m.captured);if(!captures.length)return 0;
  let result=legal.length>captures.length?0:-Infinity;
  for(const m of captures){const reply=exchange(new Chess(m.after),square,state);if(reply===null)return null;result=Math.max(result,values[m.captured]+(m.promotion?values[m.promotion]-1:0)-reply);}return result;
}
const points=s=>s.mate!=null?(s.mate>0?1:0):(s.wdl[0]+s.wdl[1]/2)/1000;
const value=s=>s.mate!=null?[s.mate>0?2:0,-s.mate]:[1,s.cp];
const ordering=(a,b)=>{const x=value(a.score),y=value(b.score);return y[0]-x[0]||y[1]-x[1]||a.move.localeCompare(b.move);};
function independentProperties(scores,t){
  const ordered=[...scores.alternatives].sort(ordering),played=scores.alternatives[scores.playedIndex],best=ordered[0],other=ordered.find(r=>r.move!==played.move),maximum=Math.max(...ordered.map(r=>points(r.score))),p=points(played.score),root=points(scores.root),loss=Math.max(0,maximum-p),rootPairLoss=Math.max(0,root-p),s=played.score,
    lowLoss=loss<t.nearBest,sound=s.mate!=null?s.mate>0:s.cp>=t.minPlayedCp,winning=best.score.mate!=null?best.score.mate>0:best.score.cp>=t.clearlyWinningCp,
    competitive=!winning||(other.score.mate!=null?other.score.mate<0:other.score.cp<t.clearlyWinningCp),mateMaintained=!(best.score.mate>0)||(s.mate>0&&s.mate<=best.score.mate);
  return{bestMove:best.move,bestScore:best.score,playedScore:s,otherMove:other.move,otherScore:other.score,maximumPoints:maximum,playedPoints:p,unrestrictedPoints:root,loss,rootPairLoss,rootPairNearBest:rootPairLoss<t.nearBest,rootInconsistency:maximum-root>t.nearBest,lowLoss,sound,competitive,mateMaintained,eligible:lowLoss&&sound&&competitive&&mateMaintained};
}
function wilson(successes,n){const z=1.959963984540054,p=successes/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,e=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return{successes,n,estimate:p,lower:c-e,upper:c+e};}
export function audit(prepared,policy,board,result,dataset){
  const byGame=new Map(dataset.map(g=>[g.id,g]));let checked=0,exchangeChecks=0,referenceUnknown=0,budgetUnknown=0;const records=[];
  for(const [i,c] of prepared.cases.entries()){
    const game=byGame.get(c.gameId);if(!game||game.split!=='train'||game.moves[c.ply-1]!==c.played||JSON.stringify(game.moves.slice(0,c.ply-1))!==JSON.stringify(c.history))throw Error('Independent source/history differs');
    const b=new Chess(),fens=[b.fen()];for(const m of c.history){b.move({from:m.slice(0,2),to:m.slice(2,4),promotion:m[4]});fens.push(b.fen());}
    if(b.fen()!==c.move.before||b.turn()!==c.color||c.move.prior!==(c.ply>=2?fens[c.ply-2]:null))throw Error('Independent board/prior perspective differs');
    const legal=b.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).sort();if(JSON.stringify(legal)!==JSON.stringify(c.legalMoves))throw Error('Independent legal coverage differs');
    const m=b.move({from:c.played.slice(0,2),to:c.played.slice(2,4),promotion:c.played[4]});if(b.fen()!==c.move.after||m.color!==c.move.color||m.piece!==c.move.piece||(m.captured||null)!==c.move.captured||(m.promotion||null)!==c.move.promotion)throw Error('Independent played move differs');
    for(const piece of b.board().flat().filter(p=>p&&p.color===c.color&&['n','b','r','q'].includes(p.type)&&b.attackers(p.square,b.turn()).length)){
      const reference=exchange(new Chess(c.move.after),piece.square),frozen=board.exchangeGain(new Chess(c.move.after),piece.square,{nodes:0,maxNodes:128});
      if(reference===null){referenceUnknown++;continue;}if(frozen===null){budgetUnknown++;continue;}near(reference,frozen,'complete local exchange');exchangeChecks++;
    }
    const saved=result.records[i],modes={};for(const mode of ['20k','80k']){modes[mode]=independentProperties(c.scores[mode],policy.thresholds);for(const [k,v] of Object.entries(modes[mode])){
      if(typeof v==='number')near(v,saved.modes[mode][k],'engine property '+k);else if(JSON.stringify(v)!==JSON.stringify(saved.modes[mode][k]))throw Error('Independent engine property '+k+' differs');}checked++;}
    const localOffer=board.isSacrifice(c.move),stable=modes['20k'].eligible===modes['80k'].eligible,status=!stable?'unstable':localOffer&&modes['20k'].eligible?'supported':'unsupported';
    for(const [k,v] of Object.entries({caseId:c.caseId,gameId:c.gameId,split:'train',stratum:c.stratum,localOffer,stable,status,movedPieceOffer:c.movedPieceOffer}))if(saved[k]!==v)throw Error('Independent case status/binding differs');records.push({...c,localOffer,modes,stable,status});
  }
  const offerCount=records.filter(r=>r.stratum==='offer'&&r.status==='supported').length,stableCount=records.filter(r=>r.stable).length;
  for(const [key,expected] of [['offerSupport',wilson(offerCount,8)],['engineDecisionStability',wilson(stableCount,24)]])for(const [k,v] of Object.entries(expected))near(v,result.summary[key][k],'Wilson '+k);
  const gates={complete:records.length===24,offerEvidence:offerCount>=policy.thresholds.offersRequired,engineDecisionStability:stableCount>=policy.thresholds.stableCasesRequired};if(JSON.stringify(gates)!==JSON.stringify(result.gates)||Object.values(gates).every(Boolean)!==result.passed)throw Error('Independent screen gates differ');
  for(const s of ['offer','loss','control'])for(const status of ['supported','unsupported','unstable'])near(records.filter(r=>r.stratum===s&&r.status===status).length,result.summary.statuses[s][status],'status count');
  for(const mode of ['20k','80k'])near(records.filter(r=>r.modes[mode].rootInconsistency).length,result.summary.rootInconsistencies[mode],'root inconsistency count');
  return{passed:true,sourceHistoryChecks:records.length,enginePropertyChecks:checked,independentCompleteExchangeChecks:exchangeChecks,referenceUnknown,budgetUnknown,frozenBoardReplay:true,
    interpretation:'Independent source/engine-property/equation checks and completed local-exchange recurrence; the full offer predicate is replayed from frozen B000, not independent human truth'};
}

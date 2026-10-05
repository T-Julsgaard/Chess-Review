import {engineExpectedPoints} from '../../../../lib/public-scoring.js';
import {wilson} from '../../E009-search-stability/code/method.mjs';
export function rank(score){if(score.mate!=null)return[score.mate>0?2:0,-score.mate];return[1,score.cp];}
const compare=(a,b)=>{const x=rank(a.score),y=rank(b.score);return y[0]-x[0]||y[1]-x[1]||a.move.localeCompare(b.move);};
export function properties(scores,thresholds){
  const ordered=[...scores.alternatives].sort(compare),best=ordered[0],played=scores.alternatives[scores.playedIndex],other=ordered.find(r=>r.move!==played.move),p=engineExpectedPoints(played.score),maximum=Math.max(...ordered.map(r=>engineExpectedPoints(r.score))),root=engineExpectedPoints(scores.root),loss=Math.max(0,maximum-p),rootPairLoss=Math.max(0,root-p),s=played.score;
  const lowLoss=loss<thresholds.nearBest,sound=s.mate!=null?s.mate>0:s.cp>=thresholds.minPlayedCp,
    winning=best.score.mate!=null?best.score.mate>0:best.score.cp>=thresholds.clearlyWinningCp,
    competitive=!winning||(other.score.mate!=null?other.score.mate<0:other.score.cp<thresholds.clearlyWinningCp),
    mateMaintained=!(best.score.mate>0)||(s.mate>0&&s.mate<=best.score.mate),eligible=lowLoss&&sound&&competitive&&mateMaintained;
  return{bestMove:best.move,bestScore:best.score,playedScore:s,otherMove:other.move,otherScore:other.score,maximumPoints:maximum,playedPoints:p,unrestrictedPoints:root,loss,rootPairLoss,
    rootPairNearBest:rootPairLoss<thresholds.nearBest,rootInconsistency:maximum-root>thresholds.nearBest,lowLoss,sound,competitive,mateMaintained,eligible};
}
export function evaluate(prepared,policy,board){
  if(board.blockSha256!==policy.boardBlockSha256||prepared.cases.length!==24||prepared.cases.some(c=>c.split!=='train'))throw Error('Changed frozen board/cohort');
  const records=prepared.cases.map(c=>{const localOffer=board.isSacrifice(c.move),modes=Object.fromEntries(['20k','80k'].map(mode=>[mode,properties(c.scores[mode],policy.thresholds)])),stable=modes['20k'].eligible===modes['80k'].eligible,status=!stable?'unstable':localOffer&&modes['20k'].eligible?'supported':'unsupported';
    return{caseId:c.caseId,gameId:c.gameId,split:c.split,stratum:c.stratum,movedPieceOffer:c.movedPieceOffer,localOffer,modes,stable,status};});
  const offers=records.filter(r=>r.stratum==='offer'),supported=offers.filter(r=>r.status==='supported').length,stable=records.filter(r=>r.stable).length,
    gates={complete:records.length===24,offerEvidence:supported>=policy.thresholds.offersRequired,engineDecisionStability:stable>=policy.thresholds.stableCasesRequired};
  return{schema:'E012-offer-audit-v1',diagnostics:prepared.diagnostics,records,summary:{offerSupport:wilson(supported,8),engineDecisionStability:wilson(stable,24),statuses:Object.fromEntries(['offer','loss','control'].map(s=>[s,Object.fromEntries(['supported','unsupported','unstable'].map(status=>[status,records.filter(r=>r.stratum===s&&r.status===status).length]))])),rootInconsistencies:Object.fromEntries(['20k','80k'].map(m=>[m,records.filter(r=>r.modes[m].rootInconsistency).length]))},
    gates,passed:Object.values(gates).every(Boolean),humanReviews:0,categoryImprovementConfirmed:false,promoted:false,interpretation:'Offer-evidence operational development screen, not Brilliant labels or independent human validity'};
}

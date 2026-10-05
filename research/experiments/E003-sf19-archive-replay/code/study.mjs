// Retrospective replay logic derived from the local SF19 study, without collection.
// Original source SHA-256: 104ac29324dcfba846b15ce606314ae1c64214e907efe59f7594940f87781a3f
import {Chess} from '../../../../lib/chess.js';
import {hash} from '../../../../tools/calibration/io.mjs';
import {assertDisjoint,gameBootstrap} from '../../../../tools/calibration/core.mjs';
import {fitHumanOutcome,humanExpected,outcomeMetrics,choiceStats} from '../../../../tools/calibration/human-policy.mjs';
import {fitGroupedHumanChoice,groupedChoiceMetrics} from '../../../../tools/calibration/grouped-human-choice.mjs';
const uci = move => move.from + move.to + (move.promotion || '');

export function qualityObservations(evidence) {
  const config=evidence.engineConfig;
  if(config?.majorVersion!==19 || config.budget?.kind!=='nodes' || config.budget.value!==20000
    || config.options?.Hash!==32 || config.options?.MultiPV!==1 || config.options?.['Skill Level']!==20
    || config.loaderSha256!=='d3344124ab067fb0b90ee77873bb8e9fbf5fc01bc525fe714b0f942581e889e6'
    || config.wasmSha256!=='57ac2d72312aba346760e3f173f687a8c211208e97a87268436f7f0e10bb5387') throw Error('SF19 study search protocol differs');
  assertDisjoint(evidence.games);
  const cache = new Map();
  for (const row of evidence.searches) {
    const key = JSON.stringify([row.history,row.played]);
    if (cache.has(key) || row.played && row.bestmove !== row.played || !row.rawInfo
      || row.pv.split(' ')[0]!==row.bestmove || /\b(?:lowerbound|upperbound)\b/.test(row.rawInfo)) throw Error('Invalid search evidence');
    cache.set(key,row);
  }
  const get = (history,played=null) => {
    const row=cache.get(JSON.stringify([history,played]));
    if(!row) throw Error('Missing search evidence'); return row;
  };
  const outcomes=[];
  for(const game of evidence.games) {
    const target={'1-0':1,'0-1':0,'1/2-1/2':.5}[game.result], rows=[];
    if(target==null) throw Error('Missing game outcome');
    for(const ply of evidence.protocol.outcomePlies) {
      if(ply>game.moves.length) continue;
      const score=get(game.moves.slice(0,ply-1)).score;
      if(score.cp!=null) rows.push({gameId:game.id,split:game.split,cp:(ply%2?1:-1)*score.cp,target,weight:1});
    }
    outcomes.push(...rows.map(row=>({...row,weight:1/rows.length})));
  }
  const choices=evidence.positions.map(p=>{
    const game=evidence.games.find(g=>g.id===p.gameId), chess=new Chess();
    if(!game || game.split!==p.split || game.moves[p.ply-1]!==p.played || JSON.stringify(game.moves.slice(0,p.ply-1))!==JSON.stringify(p.history)) throw Error('Choice binding differs');
    for(const move of p.history) chess.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
    if(JSON.stringify(chess.moves({verbose:true}).map(uci).sort())!==JSON.stringify(p.legalMoves)) throw Error('Incomplete legal alternatives');
    return {...p,scores:p.legalMoves.map(move=>get(p.history,move).score)};
  });
  return {outcomes,choices};
}
const mappedChoices=(rows,outcome)=>rows.map(p=>({gameId:p.gameId,positionId:String(p.ply),split:p.split==='test'?'validation':p.split,
  utilities:p.scores.map(score=>humanExpected(score,outcome)),playedIndex:p.legalMoves.indexOf(p.played)}));
const oldOutcome={schema:'human-outcome-v1',slopePerPawn:.368208};
export function baselineSf19MoveQuality(best, played, {forced=false,top=false}={}) {
  const residual=humanExpected(best,oldOutcome)-humanExpected(played,oldOutcome);
  const loss=forced||top?0:Math.max(0,residual);
  const quality=loss===0?100:Math.max(0,Math.min(100,103.1668100711649*Math.exp(-4.354415386753951*loss)-3.166924740191411+1));
  return {quality,loss,residual,eligible:!forced};
}
function oldChoiceLoss(p) {
  // Convert the old display formula into relative legal-choice weights. This
  // evaluates an explicit baseline policy, not a probability the old UI claimed.
  const best=p.scores.reduce((a,b)=>humanExpected(a,oldOutcome)>=humanExpected(b,oldOutcome)?a:b);
  const weights=p.scores.map(score=>Math.max(1e-12,baselineSf19MoveQuality(best,score).quality/100));
  return Math.log(weights.reduce((a,b)=>a+b,0))-Math.log(weights[p.legalMoves.indexOf(p.played)]);
}
export function fitQualityStudy(evidence) {
  const {outcomes,choices}=qualityObservations(evidence);
  const outcome=evidence.protocol.modelKind==='choice-only'?{...oldOutcome,
    source:'Retained public Lichess centipawn curve; not an SF19-fitted human outcome curve.'}:fitHumanOutcome(outcomes.filter(r=>r.split==='train'));
  const choice=fitGroupedHumanChoice(mappedChoices(choices.filter(r=>r.split==='train'),outcome));
  if(outcome.boundary || choice.boundary) throw Error('Boundary optimum cannot be adopted');
  return {schema:'engine-quality-v1',candidateVersion:hash(JSON.stringify({protocol:evidence.protocol,config:evidence.engineConfig,
    dataset:evidence.datasetSha256,selection:evidence.selectionSha256,outcome,choice})),outcome,choice,engineConfig:evidence.engineConfig,
    aggregation:'Arithmetic mean of fitted move qualities over nonforced decisions.',protocol:evidence.protocol};
}
export function assessQualityStudy(evidence,model,split) {
  const data=qualityObservations(evidence), outcomes=data.outcomes.filter(r=>r.split===split).map(r=>({...r,split:'validation'}));
  const choices=data.choices.filter(r=>r.split===split), mapped=mappedChoices(choices,model.outcome);
  const candidate=outcomeMetrics(outcomes,model.outcome), baseline=outcomeMetrics(outcomes,oldOutcome);
  const choiceCandidate=groupedChoiceMetrics(mapped,model.choice);
  const oldLoss=choices.reduce((sum,p)=>sum+oldChoiceLoss(p),0)/choices.length;
  const outcomeRows=outcomes.map(r=>{
    const loss=m=>{const p=Math.max(1e-12,Math.min(1-1e-12,humanExpected({cp:r.cp},m)));return -r.target*Math.log(p)-(1-r.target)*Math.log1p(-p);};
    return {gameId:r.gameId,weight:r.weight,difference:loss(model.outcome)-loss(oldOutcome)};
  });
  const choiceRows=choices.map((p,i)=>({gameId:p.gameId,weight:1,
    difference:choiceStats(mapped[i].utilities,mapped[i].playedIndex,model.choice.temperature).logLoss-oldChoiceLoss(p)}));
  const statistic=rows=>rows.reduce((s,r)=>s+r.weight*r.difference,0)/rows.reduce((s,r)=>s+r.weight,0);
  const intervals={outcome:gameBootstrap(outcomeRows,statistic,2000),choice:gameBootstrap(choiceRows,statistic,2000)};
  const outcomePassed=evidence.protocol.modelKind==='choice-only'
    ? candidate.logLoss===baseline.logLoss && candidate.brier===baseline.brier
    : candidate.logLoss<baseline.logLoss && candidate.brier<baseline.brier && intervals.outcome.upper<0;
  return {split,outcome:{candidate,baseline},choice:{...choiceCandidate,baselineLogLoss:oldLoss},pairedDifference:intervals,
    passed:outcomePassed && choiceCandidate.logLoss<oldLoss && choiceCandidate.logLoss<choiceCandidate.uniformLogLoss && intervals.choice.upper<0};
}


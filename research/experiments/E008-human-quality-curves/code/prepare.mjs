import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
import {selection,queryKey,validateSearch,outcomePlies} from './queries.mjs';

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const play=(board,move)=>board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
export function prepare(evidence,dataset,expectedConfig){
  if(evidence.schema!=='E008-engine-observations-v1'||!evidence.complete||evidence.smoke)throw Error('Incomplete/smoke evidence');
  if(!same(evidence.engineConfig,expectedConfig)||evidence.configHash!==sha256(JSON.stringify(expectedConfig))||expectedConfig.majorVersion!==19||expectedConfig.budget.kind!=='nodes'||expectedConfig.budget.value!==20000)throw Error('Wrong frozen engine configuration');
  if(!same(evidence.protocol,{outcomePlies,choiceSeed:'E008-choice-v1:',choicesPerGame:1}))throw Error('Changed observation protocol');
  const games=dataset.filter(g=>['train','validation'].includes(g.split));
  if(games.length!==600||games.filter(g=>g.split==='train').length!==450||games.filter(g=>g.split==='validation').length!==150||!same(evidence.games,games))throw Error('Changed or reserved game cohort');
  const expected=selection(games);if(evidence.positions.length!==600)throw Error('Missing choice positions');
  const queries=new Map(),used=new Set(),fens=new Map(),outcomes=[],choices=[];
  for(const r of evidence.searches){
    if(queries.has(r.key)||r.key!==queryKey(evidence.configHash,r.history,r.restricted))throw Error('Duplicate/changed search key');
    validateSearch(r);
    const nodes=Number(/\bnodes (\d+)/.exec(r.rawInfo)?.[1]),depth=Number(/\bdepth (\d+)/.exec(r.rawInfo)?.[1]),finalNodes=Number(/\bnodes (\d+)/.exec(r.finalSearchInfo)?.[1]);
    if(r.nodes!==nodes||r.depth!==depth||r.finalNodes!==finalNodes||!Number.isInteger(finalNodes)||finalNodes<1||r.pv!==/\bpv (.+)$/.exec(r.rawInfo)?.[1])throw Error('Raw search diagnostics differ');
    queries.set(r.key,r);
  }
  function lookup(key,history,restricted,fen){
    const row=queries.get(key);
    if(!row||key!==queryKey(evidence.configHash,history,restricted)||!same(row.history,history)||row.restricted!==restricted)throw Error('Observation/query binding differs');
    if(fens.has(key)&&fens.get(key)!==fen)throw Error('Inconsistent history board');
    fens.set(key,fen);used.add(key);return row.score;
  }
  let excludedMates=0;const exclusions=[];
  for(let i=0;i<games.length;i++){
    const game=games[i],position=evidence.positions[i],want=expected[i],core=Object.fromEntries(Object.keys(want).map(k=>[k,position[k]]));
    if(!same(core,want)||!same(position.outcomes.map(r=>r.ply),want.outcomePlies)||!same(position.alternatives.map(r=>r.move),want.legalMoves))throw Error('Changed selection or incomplete alternatives');
    const board=new Chess(),boards=new Map(),needed=new Set([...want.outcomePlies,want.ply]);
    for(let ply=1;ply<=Math.max(...needed);ply++){if(needed.has(ply))boards.set(ply,{fen:board.fen(),color:board.turn()});play(board,game.moves[ply-1]);}
    const points=game.result==='1-0'?1:game.result==='0-1'?0:game.result==='1/2-1/2'?.5:null;if(points===null)throw Error('Unknown result');
    const rating=color=>{const player=game.players.find(p=>p.color===color);if(!Number.isFinite(player?.rating))throw Error('Missing rating group metadata');return player.rating;};
    const gameRows=[];
    for(const root of position.outcomes){
      const context=boards.get(root.ply),score=lookup(root.key,game.moves.slice(0,root.ply-1),null,context.fen);
      if(score.mate!=null){excludedMates++;exclusions.push({gameId:game.id,ply:root.ply,reason:'root-mate'});continue;}
      gameRows.push({gameId:game.id,split:game.split,ply:root.ply,color:context.color,score,target:context.color==='w'?points:1-points,rating:rating(context.color)});
    }
    if(!gameRows.length)throw Error('Game has no eligible outcome roots');
    outcomes.push(...gameRows.map(r=>({...r,weight:1/gameRows.length})));
    const rootScore=lookup(position.rootKey,want.history,null,boards.get(want.ply).fen);
    const scores=position.alternatives.map(r=>lookup(r.key,want.history,r.move,boards.get(want.ply).fen));
    choices.push({gameId:game.id,split:game.split,ply:want.ply,rating:rating(want.color),rootScore,scores,playedIndex:want.legalMoves.indexOf(want.played)});
  }
  if(used.size!==queries.size)throw Error('Unused/injected search evidence');
  for(const [key,r] of queries){const board=new Chess(fens.get(key));for(const move of r.pv.split(' '))play(board,move);}
  return{outcomes,choices,exclusions,diagnostics:{games:games.length,outcomeRoots:outcomes.length,excludedMates,choicePositions:choices.length,uniqueSearches:queries.size,
    earlierExactScores:evidence.searches.filter(r=>r.rawInfo!==r.finalSearchInfo).length,finalBoundScores:evidence.searches.filter(r=>/\b(lowerbound|upperbound)\b/.test(r.finalSearchInfo)).length,
    exactRecoveries:evidence.searches.filter(r=>r.exactRecovery).length,
    selectedNodes:[Math.min(...evidence.searches.map(r=>r.nodes)),Math.max(...evidence.searches.map(r=>r.nodes))],
    finalNodes:[Math.min(...evidence.searches.map(r=>r.finalNodes)),Math.max(...evidence.searches.map(r=>r.finalNodes))]}};
}

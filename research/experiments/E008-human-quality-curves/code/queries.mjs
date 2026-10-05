import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
export const outcomePlies=[10,11,30,31,50,51,70,71];
const uci=m=>m.from+m.to+(m.promotion||'');
export function selection(games){
  if(games.some(g=>!['train','validation'].includes(g.split)))throw Error('Reserved/unknown roles cannot be collected');
  return games.map(game=>{
    const chess=new Chess(),eligible=[];
    for(let i=0;i<Math.min(80,game.moves.length);i++){
      if(i>=10&&chess._moves().length>1)eligible.push({ply:i+1,key:sha256('E008-choice-v1:'+game.id+':'+(i+1))});
      chess.move({from:game.moves[i].slice(0,2),to:game.moves[i].slice(2,4),promotion:game.moves[i][4]});
    }
    eligible.sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0);if(!eligible.length)throw Error('No eligible legal choice');
    const ply=eligible[0].ply,history=game.moves.slice(0,ply-1),board=new Chess();
    for(const move of history)board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]});
    const legalMoves=board.moves({verbose:true}).map(uci).sort(),played=game.moves[ply-1];
    if(!legalMoves.includes(played)||legalMoves.length<2)throw Error('Illegal selected move');
    return{gameId:game.id,split:game.split,ply,history,played,legalMoves,color:board.turn(),
      outcomePlies:outcomePlies.filter(p=>p<=game.moves.length)};
  });
}
export function queryKey(configHash,history,restricted=null){
  if(!/^[a-f0-9]{64}$/.test(configHash)||history.some(m=>!/^([a-h][1-8]){2}[qrbn]?$/.test(m))||restricted!==null&&!/^([a-h][1-8]){2}[qrbn]?$/.test(restricted))throw Error('Invalid query');
  return sha256(JSON.stringify({configHash,history,restricted}));
}
export function validateSearch(record){
  if(!record.rawInfo||/\b(lowerbound|upperbound)\b/.test(record.rawInfo)||record.pv?.split(' ')[0]!==record.bestmove||record.restricted&&record.bestmove!==record.restricted)throw Error('Invalid exact search binding');
  const score=/\bscore (cp|mate) (-?\d+)/.exec(record.rawInfo),wdl=/\bwdl (\d+) (\d+) (\d+)/.exec(record.rawInfo);
  if(!score||record.score[score[1]]!==Number(score[2])||score[1]==='mate'&&Number(score[2])===0)throw Error('Raw score differs');
  if(score[1]==='cp'&&!wdl)throw Error('Missing WDL');
  if(wdl){const values=wdl.slice(1).map(Number);if(values.reduce((a,b)=>a+b,0)!==1000||JSON.stringify(values)!==JSON.stringify(record.score.wdl))throw Error('Raw WDL differs');}
  if(!Number.isInteger(record.nodes)||record.nodes<1||!Number.isFinite(record.elapsedMs)||!record.finalSearchInfo)throw Error('Missing search diagnostics');
  return true;
}

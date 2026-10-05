import {Chess} from '../../../../lib/chess.js';
import {sha256} from '../../../data-policy.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),uci=m=>m.from+m.to+(m.promotion||''),values={p:1,n:3,b:3,r:5,q:9,k:100};
export function cohort(pack,key,dataset){
  if(pack.schema!=='E005-review-pack-v1'||key.schema!=='E005-private-selection-v1'||pack.packId!==key.packId||pack.packId!==sha256(JSON.stringify(pack.cases))||pack.cases.length!==24||key.cases.length!==24||new Set(pack.cases.map(c=>c.caseId)).size!==24||new Set(key.cases.map(c=>c.gameId)).size!==24)throw Error('Changed blinded pack/key identity');
  const byId=new Map(dataset.map(g=>[g.id,g])),selected=[];
  for(const item of pack.cases){
    const info=key.cases.find(c=>c.caseId===item.caseId),game=byId.get(info?.gameId);
    if(!game||game.split!=='train'||!Number.isInteger(info.ply)||info.ply<1||info.ply>game.moves.length||item.caseId!=='CR-'+sha256('E005-case-v1:'+game.id+':'+info.ply).slice(0,12))throw Error('Changed/nontraining source');
    const board=new Chess(),fens=[board.fen()],san=[],history=game.moves.slice(0,info.ply-1);
    for(const move of history){san.push(board.move({from:move.slice(0,2),to:move.slice(2,4),promotion:move[4]}).san);fens.push(board.fen());}
    const legalMoves=board.moves({verbose:true}).map(uci).sort(),played=game.moves[info.ply-1],m=board.move({from:played.slice(0,2),to:played.slice(2,4),promotion:played[4]});
    if(legalMoves.length<2||board.isGameOver()||item.before!==m.before||item.after!==m.after||item.san!==m.san||item.color!==m.color||item.from!==m.from||item.to!==m.to||!same(item.history,san))throw Error('Changed legal/history/presentation binding');
    const target=(8-Number(m.to[1]))*16+m.to.charCodeAt(0)-97,movedPieceOffer=board._moves().some(r=>r.to===target&&r.captured&&values[r.captured]>values[r.piece]);
    if(!['offer','loss','control'].includes(info.stratum)||info.offered!==(info.stratum==='offer')||info.stratum==='offer'&&!movedPieceOffer)throw Error('Changed source stratum');
    selected.push({caseId:item.caseId,gameId:game.id,split:'train',ply:info.ply,stratum:info.stratum,color:m.color,history,played,legalMoves,movedPieceOffer,
      move:{before:m.before,after:m.after,color:m.color,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,prior:info.ply>=2?fens[info.ply-2]:null}});
  }
  for(const s of ['offer','loss','control'])if(selected.filter(c=>c.stratum===s).length!==8)throw Error('Changed frozen stratum coverage');return selected;
}

import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const route=(id,start,moves,played,expected,comparisonHistory)=>{const c=new Chess(start);for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen:start,moves},move:played,expected,comparisonHistory};};
const knight=boardFen({a1:'K',a2:'P',b1:'N',h7:'k'});
const walk=boardFen({a1:'K',b2:'P',h8:'k',d1:'n',h7:'p'});
const start=new Chess().fen(),alternate={fen:start,moves:['d2d4','d7d5','g1f3','g8f6']};
export const fixtures=[
 route('knight-tour',knight,['b1c3','h7g7','c3e4','g7h7'],'e4f6',['recorded-knight-maneuver','recorded-knight-rerouting','recorded-knight-tour']),
 route('route-without-check',knight,['b1c3','h7g7','c3e4','g7h7'],'e4c5',[]),
 route('king-walk',walk,['a1b1','h8g8','b1c1','g8h8'],'c1d1',['recorded-king-walk']),
 route('king-noncapturing',walk,['a1b1','h8g8','b1c1','g8h8'],'c1c2',[]),
  route('different-counters',start,['g1f3','g8f6','d2d4'],'d7d5',[],alternate),
 route('transposition',start,['g1f3','g8f6','c2c4','c7c5','d2d4'],'d7d5',['exact-history-transposition','transposed-move-order'],{fen:start,moves:['c2c4','c7c5','g1f3','g8f6','d2d4','d7d5']}),
 route('identical-route',start,['g1f3','g8f6','d2d4'],'d7d5',[],{fen:start,moves:['g1f3','g8f6','d2d4','d7d5']}),
 route('different-position',start,['g1f3','g8f6','d2d4'],'d7d5',[],{fen:start,moves:['e2e4','e7e5','g1f3','g8f6']}),
];
export const bothColors=fixtures.filter(f=>!f.comparisonHistory).flatMap(f=>{
 const other=reflect(f),c=new Chess(other.history.fen);for(const m of other.history.moves)c.move(m);other.fen=c.fen();return[f,other];
});
bothColors.push(...fixtures.filter(f=>f.comparisonHistory));

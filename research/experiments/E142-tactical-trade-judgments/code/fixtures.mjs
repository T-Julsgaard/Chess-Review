import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const own={g1:'K',h5:'Q',g6:'B',f2:'P',g2:'P',h2:'P'},good={...own,h7:'R',h8:'k',e3:'q',h6:'r'},bad={...own,g5:'R',h8:'k',e3:'q',g4:'r',a8:'r',a6:'n',h7:'p'};
function fixture(id,p,init,move,expected){const start=boardFen(p,'b'),c=new Chess(start);c.move(init);return{id,fen:c.fen(),history:{fen:start,moves:[init]},move,tacticalTradeTags:true,tradeMatePlies:1,scanReplies:false,expected};}
const a=fixture('authored-good-trade',good,'h6h7','h5h7',['tactical-good-trade','tactical-trade-while-ahead']),b=fixture('authored-bad-trade',bad,'g4g5','h5g5',['tactical-bad-trade']),k={...b,id:'authored-keep-behind',move:'h5h7',expected:['tactical-keep-while-behind']};
const roots=[a,b,k,{...a,id:'missing-history',history:undefined,expected:[]},{...a,id:'short-bound',tradeMatePlies:0,expected:[]},{...b,id:'zero-budget',maxTradeNodes:0,expected:[]}];
export const fixtures=roots.flatMap(x=>{const r=reflect(x);if(r.history){const c=new Chess(r.history.fen);for(const m of r.history.moves)c.move(m);r.fen=c.fen();}return[x,r];});

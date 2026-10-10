import {boardFen,reflect,flip} from '../../FRIEND-shared/lib.mjs';import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const fen=boardFen({a6:'K',c7:'P',a2:'P',h2:'P',g8:'B',e8:'k',h8:'n',a7:'p',h7:'p'}),r={id:'open-bishop',input:{fen,move:'g8e6',history:{fen,moves:[]}},options:{enabled:true,pawn:'c7',contextMoves:[{from:'a2',to:'d6'},{from:'h2',to:'e4'},{from:'a7',to:'d7'},{from:'h7',to:'e5'}],plies:2}};
const b=reflect({id:r.id,...r.input}),c=legalPosition(b.history.fen);for(const m of b.history.moves)c.move(m);
export const roots=[r,{id:b.id,input:{fen:c.fen(),move:b.move,history:b.history},options:{...r.options,pawn:flip(r.options.pawn),contextMoves:r.options.contextMoves.map(m=>({from:flip(m.from),to:flip(m.to)}))}}];

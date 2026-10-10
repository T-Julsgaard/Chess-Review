import {boardFen,reflect,flip} from '../../FRIEND-shared/lib.mjs';import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const fen=boardFen({h1:'K',g7:'P',d3:'P',e3:'P',c4:'N',e8:'k',a1:'b',d4:'p',e4:'p'}),r={id:'closed-knight',input:{fen,move:'c4e5',history:{fen,moves:[]}},options:{enabled:true,pawn:'g7',contextMoves:[{from:'d3',to:'g6'},{from:'e3',to:'h2'},{from:'d4',to:'a7'},{from:'e4',to:'b7'}],plies:2}};
const b=reflect({id:r.id,...r.input}),c=legalPosition(b.history.fen);for(const m of b.history.moves)c.move(m);
export const roots=[r,{id:b.id,input:{fen:c.fen(),move:b.move,history:b.history},options:{...r.options,pawn:flip(r.options.pawn),contextMoves:r.options.contextMoves.map(m=>({from:flip(m.from),to:flip(m.to)}))}}];

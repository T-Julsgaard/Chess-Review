import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',a8:'k',...men}),move,expected});
export const fixtures=[
 f('ram-breakthrough',{g6:'P',g7:'p',f7:'p'},'g6f7',['certified-pawn-breakthrough','realized-candidate-passer','pawn-ending-breakthrough']),
 f('surplus-breakthrough',{g6:'P',b2:'P',c2:'P',g7:'p',f7:'p'},'g6f7',['certified-pawn-breakthrough','certified-extra-pawn-conversion']),
 f('preexisting-straight-route',{g6:'P',f7:'p'},'g6f7',[]),
 f('capturable-promotion',{a8:null,g8:'k',g6:'P',g7:'p',f7:'p'},'g6f7',[]),
 f('remaining-blocker',{g6:'P',g7:'p',f7:'p',e8:'r'},'g6f7',[]),
 f('advance-surplus',{a8:null,f4:'k',a6:'P',b2:'P',h7:'p'},'a6a7',['certified-extra-pawn-conversion']),
 f('no-surplus',{a8:null,f4:'k',a6:'P',h7:'p'},'a6a7',[]),
 f('ordinary',{a8:null,h8:'k',b2:'P',b7:'p'},'b2b3',[]),
];
export const bothColors=fixtures.flatMap(f=>[f,reflect(f)]);

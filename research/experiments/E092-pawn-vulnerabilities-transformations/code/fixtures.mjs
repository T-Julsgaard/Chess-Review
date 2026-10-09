import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[],absent=[],extra={})=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected,absent,extra});
const h=(f,start,moves)=>{const c=new Chess(start);for(const m of moves)c.move(m);return{...f,fen:c.fen(),history:{fen:start,moves}};};
export const fixtures=[
 f('backward-pawn',{e1:'R',c5:'p',d6:'p',e5:'p',h2:'P'},'e1d1',['certified-backward-pawn','certified-pawn-target-selection']),
 f('defended-advance',{e1:'R',c5:'p',d6:'p',e5:'p',e6:'q',h2:'P'},'e1d1',[],['certified-backward-pawn']),
 f('neighbor-behind',{e1:'R',c7:'p',d6:'p',e5:'p',h2:'P'},'e1d1',[],['certified-backward-pawn','certified-pawn-target-selection']),
 h(f('repeated-pawn',{},'a2a3',['repeated-certified-pawn-target']),boardFen({h1:'K',a1:'R',h8:'k',a7:'p',h2:'P'}),['a1a2','h8g8']),
 h(f('previous-check-is-not-actor-turn-contact',{},'d7d6',[]),boardFen({a1:'K',d1:'R',h7:'k',a7:'p',h2:'P'}),['d1d7','h7h8']),
 h(f('repeat-after-unrelated-capture',{},'a2a3',['repeated-certified-pawn-target']),boardFen({f1:'K',a1:'R',g7:'k',h8:'r',a7:'p',h2:'P'}),['a1a2','h8h2']),
 f('undouble-promotion',{h8:null,a8:'k',g6:'P',g5:'P',g7:'p',f7:'p'},'g6f7',['certified-structural-transformation','certified-passed-pawn-imbalance']),
 f('majority-promotion',{h8:null,a8:'k',g6:'P',h5:'P',h4:'P',g7:'p',f7:'p'},'g6f7',['majority-to-certified-passer','certified-passed-pawn-imbalance']),
 f('unsafe-transformation',{h8:null,g8:'k',g6:'P',g5:'P',g7:'p',f7:'p'},'g6f7',[],['certified-structural-transformation','certified-passed-pawn-imbalance']),
 f('route-refuted-by-rook',{h8:null,a8:'k',e8:'r',g6:'P',g5:'P',g7:'p',f7:'p'},'g6f7',[],['certified-structural-transformation','certified-passed-pawn-imbalance']),
 f('changed-structure-imbalance',{a1:null,h1:'K',a3:'R',b2:'P',a7:'p',c7:'p'},'b2b3',[],['legal-pawn-structure-imbalance']),
 f('undoubled-target-imbalance',{a1:null,h1:'K',d1:'R',b2:'P',b3:'P',a3:'n',c5:'p',d6:'p',e5:'p'},'b2a3',['legal-pawn-structure-imbalance']),
 f('legal-ep-imbalance',{b2:'P',a4:'p'},'b2b4',['legal-pawn-structure-imbalance'],['certified-passed-pawn-imbalance']),
 f('ordinary',{b2:'P',b7:'p'},'b2b3',[]),
 f('friend-wedge',{a1:null,h8:null,e1:'K',e8:'k',d5:'P',e5:'P',a7:'p',g7:'p',h7:'p'},'e5e6',['pawn-wedge'],[],{wedgeTags:true}),
];
export const bothColors=fixtures.flatMap(f=>{const mirrored=reflect(f);if(mirrored.history){const c=new Chess(mirrored.history.fen);for(const m of mirrored.history.moves)c.move(m);mirrored.fen=c.fen();}return[f,mirrored];});






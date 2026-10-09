import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[],absent=[])=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected,absent});
const history=(f,start,moves)=>{const c=new Chess(start);for(const m of moves)c.move(m);return{...f,fen:c.fen(),history:{fen:start,moves}};};
export const fixtures=[
 f('liquidation',{a8:'R',f7:'B',g8:'r',e7:'n',h7:'p',h2:'P'},'a8g8',['forced-tactical-liquidation']),
 f('defensive-liquidation',{a1:null,g2:'K',a8:'R',f7:'B',g8:'r',e7:'n',h7:'p',h2:'P'},'a8g8',['forced-tactical-liquidation','defensive-material-combination']),
 f('retreat-gain',{a7:'R',b4:'P',h5:'q',h7:'r',h8:null,b5:'k'},'a7a5',['profitable-tactical-retreat']),
 history(f('recover-bishop',{},'a7a5',['profitable-tactical-retreat','forced-material-recovery','expiring-material-compensation']),boardFen({a1:'K',a7:'R',b4:'P',h5:'B',f5:'q',h7:'r',b5:'k'},'b'),['f5h5']),
 f('bad-simplification',{a7:'n',b7:'r',h2:'P',a1:'R',h1:'K'},'a1a7',['simplification-material-loss']),
 f('ordinary-capture',{a7:'n',h2:'P',a1:'R',h1:'K'},'a1a7',[],['forced-tactical-liquidation']),
 f('liquidation-extra-family',{a8:'R',f7:'B',g8:'r',e7:'n',c6:'n',h7:'p',h2:'P'},'a8g8',[],['forced-tactical-liquidation']),
 f('undefended-retreat',{a7:'R',h5:'q',h7:'r',h8:null,b5:'k'},'a7a5',[],['profitable-tactical-retreat']),
 history(f('too-large-prior-loss',{},'a7a5',['profitable-tactical-retreat'],['forced-material-recovery','expiring-material-compensation']),boardFen({a1:'K',a7:'R',b4:'P',h5:'Q',f5:'q',h7:'r',b5:'k'},'b'),['f5h5']),
 f('ordinary-retreat',{a7:'R',h7:'p'},'a7a5',[],['profitable-tactical-retreat']),
 f('terminal-mate',{a1:null,f6:'K',g6:'Q'},'g6g7',[]),
];
export const bothColors=fixtures.flatMap(f=>{const mirrored=reflect(f);if(mirrored.history){const c=new Chess(mirrored.history.fen);for(const m of mirrored.history.moves)c.move(m);mirrored.fen=c.fen();}return[f,mirrored];});




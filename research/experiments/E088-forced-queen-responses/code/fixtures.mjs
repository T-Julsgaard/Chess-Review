import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {Chess} from '../../../../lib/chess.js';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',a2:'P',h8:'k',...men}),move,expected});
export const fixtures=[
  f('old-noncontact',{b2:'N',e7:'q'},'b2c4',[]),
 f('knight-queen-pressure',{b2:'N',d6:'q'},'b2c4',['forced-queen-response']),
 f('pawn-queen-pressure',{d4:'P',e6:'q'},'d4d5',['forced-queen-response']),
 f('material-counterplay',{b2:'N',d6:'q',f8:'r',f2:'Q'},'b2c4',[]),
 f('nondefensive-check',{b2:'N',d6:'q',b8:'r'},'b2c4',[]),
 f('no-queen',{b2:'N',e7:'r'},'b2c4',[]),
 f('unchanged-rook-contact',{d1:'R',d6:'q'},'d1d2',[]),
 f('existing-contact',{c4:'N',e7:'q'},'c4d6',[]),
 f('hanging-reuse',{a1:null,e1:'K',f2:'Q',f4:'n',h7:'p'},'f2e2',[],{reusedHanging:true}),
];
// Nc4 attacks e5; the queen evades to e4, then Nd6 attacks it again.
const start=boardFen({a2:'K',a3:'P',b2:'N',e5:'q',h8:'k'}),h=new Chess(start);h.move('b2c4');h.move('e5e4');
fixtures.push({id:'repeated-queen-pressure',fen:h.fen(),history:{fen:start,moves:['b2c4','e5e4']},move:'c4d6',expected:['forced-queen-response','certified-queen-harassment']});
export const bothColors=fixtures.flatMap(f=>{const mirrored=reflect(f);if(mirrored.history){const c=new Chess(mirrored.history.fen);for(const m of mirrored.history.moves)c.move(m);mirrored.fen=c.fen();}return[f,mirrored];});

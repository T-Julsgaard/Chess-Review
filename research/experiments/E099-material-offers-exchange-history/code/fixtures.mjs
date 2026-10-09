import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,pieces,move,expected=[],absent=[])=>({id,fen:boardFen(pieces),move,expected,absent});
const history=(id,pieces,moves,move,expected=[],absent=[])=>{const start=boardFen(pieces,moves[0].startsWith('a8')||id.startsWith('winning')||id==='counter-offer'?'b':'w'),c=new Chess(start);for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen:start,moves},move,expected,absent};};
export const fixtures=[
 f('rook-pawn',{h1:'K',h8:'k',a1:'R',a7:'p',b7:'r',h2:'P'},'a1a7',['certified-unrecovered-offer','certified-rook-for-pawn-offer']),
 f('knight-offer',{h1:'K',h8:'k',d2:'N',g4:'p',a2:'P'},'d2f3',['certified-unrecovered-offer']),
 f('refutable-offer',{h1:'K',h8:'k',d2:'N',g3:'r',g2:'P',a2:'P'},'d2f3',[],['certified-unrecovered-offer']),
 f('ordinary',{a1:'K',h8:'k',e2:'P'},'e2e4',[],['certified-unrecovered-offer']),
 history('bishop-two-pawns',{a1:'K',h8:'k',c1:'B',f4:'p',e5:'p',d5:'r',h2:'P'},['c1f4','h8h7'],'f4e5',['certified-bishop-for-two-pawns-offer']),
 history('return-exchange',{a1:'K',h8:'k',a2:'Q',b2:'r',g1:'R',g5:'n',f6:'b',h2:'P'},['a2b2','h8h7'],'g1g5',['certified-return-of-recorded-gain','certified-give-back-exchange']),
 history('return-too-much',{a1:'K',h8:'k',a2:'Q',b2:'p',g1:'R',g5:'n',f6:'b',h2:'P'},['a2b2','h8h7'],'g1g5',['certified-unrecovered-offer'],['certified-return-of-recorded-gain','certified-give-back-exchange']),
 history('counter-offer',{h1:'K',h8:'k',d2:'N',g4:'p',e4:'P',f7:'p',a2:'P'},['f7f5'],'d2f3',['certified-counter-offer']),
 history('winning-exchange',{h1:'K',g8:'k',a8:'r',a4:'N',h4:'R',a2:'P'},['a8a4'],'h4a4',['recorded-winning-exchange']),
 history('winning-exchange-refuted',{h1:'K',g8:'k',a8:'r',b5:'b',a4:'N',h4:'R',a2:'P'},['a8a4'],'h4a4',[],['recorded-winning-exchange']),
 history('mass-exchanges',{g1:'K',g8:'k',a1:'R',h1:'R',a4:'n',h4:'n',d7:'b',e7:'b',c3:'P'},['a1a4','d7a4','h1h4'],'e7h4',['recorded-mass-exchange-sequence']),
 f('terminal',{f6:'K',h8:'k',g6:'Q'},'g6g7',[],['certified-unrecovered-offer']),
];
fixtures.push(history('bishop-pair-intervening-loss',{h1:'K',h8:'k',c1:'B',f4:'p',e5:'p',d5:'r',a5:'R',h2:'P'},['c1f4','d5a5'],'f4e5',['certified-bishop-for-two-pawns-offer']));
export const bothColors=fixtures.flatMap(f=>{const m=reflect(f);if(m.history){const c=new Chess(m.history.fen);for(const code of m.history.moves)c.move(code);m.fen=c.fen();}return[f,m];});

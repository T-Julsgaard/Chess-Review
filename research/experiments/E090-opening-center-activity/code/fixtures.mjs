import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[],absent=[])=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected,absent});
const opening=(id,moves,move,expected)=>{const c=new Chess(),start=c.fen();for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen:start,moves},move,expected,absent:[]};};
export const fixtures=[
 opening('open-pair',['e2e4'],'e7e5',['recorded-open-game']),
 opening('semi-open-pair',['e2e4'],'c7c5',['recorded-semi-open-game']),
 opening('closed-pair',['d2d4'],'d7d5',['recorded-closed-game']),
 opening('semi-closed-pair',['d2d4'],'g8f6',['recorded-semi-closed-game']),
 opening('other-origin',['g1f3'],'g8f6',[]),
 opening('later-opening-ply',['e2e4','e7e5'],'g1f3',['new-legal-center-control']),
 f('active-piece',{d2:'N',f6:'p'},'d2e4',['active-piece-center'],['new-legal-center-control']),
 f('center-contact',{c2:'N',d5:'p'},'c2e3',['new-legal-center-control']),
 f('quiet-piece-center',{d2:'N',h7:'p'},'d2e4',[],['active-piece-center']),
 f('open-slider',{c1:'B',e5:'n'},'c1f4',['legal-open-center-access','new-legal-center-control']),
 f('blocked-slider',{c1:'B',e5:'n',d6:'P'},'c1f4',['new-legal-center-control'],['legal-open-center-access']),
 f('mobile-center',{d2:'P',e4:'P',h7:'p'},'d2d4',['legal-mobile-center']),
 f('blocked-center',{d2:'P',e4:'P',d5:'p',e5:'p'},'d2d4',['new-legal-center-control'],['legal-mobile-center','currently-fixed-center']),
 f('fixed-rams',{c2:'P',d5:'P',c5:'p',d6:'p'},'c2c4',['currently-fixed-center']),
 f('ram-capture-available',{c2:'P',d5:'P',c5:'p',d6:'p',b5:'p'},'c2c4',[],['currently-fixed-center']),
 f('pinned-center',{a1:null,d1:'K',d4:'N',d8:'r',e6:'p',h2:'P'},'h2h3',[],['active-piece-center']),
];
export const bothColors=fixtures.flatMap(f=>f.history?[f]:[f,reflect(f)]);


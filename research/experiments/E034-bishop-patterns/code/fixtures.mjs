import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a1:null,h1:'K',h8:null,h7:'k',a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' ')});
export const fixtures=[
 f('queenside-fianchetto',{c1:'B',b3:'P'},'c1b2',['prepared-fianchetto','open-bishop-diagonal']),
 f('kingside-fianchetto',{f1:'B',g3:'P'},'f1g2',['prepared-fianchetto']),
 f('double-fianchetto',{c1:'B',b3:'P',g2:'B',g3:'P'},'c1b2',['prepared-fianchetto','double-fianchetto']),
 f('pawn-opens-long-diagonal',{b2:'B',c3:'P'},'c3c4',['open-bishop-diagonal','opened-bishop-diagonal']),
 f('long-diagonal-still-blocked',{b2:'B',c3:'P',f6:'p'},'c3c4',[],['open-bishop-diagonal','opened-bishop-diagonal']),
 f('bad-bishop-fixed-pawns',{c1:'B',c3:'P',e3:'P',c4:'p',e4:'p'},'c1d2',['bishop-color-pattern']),
 f('good-bishop-opposite-pawns',{f1:'B',c3:'P',e3:'P'},'f1e2',['bishop-color-pattern']),
 f('mixed-pawn-colors',{f1:'B',c3:'P',e4:'P'},'f1e2',[],['bishop-color-pattern']),
 f('mobile-same-color-pawns',{c1:'B',c3:'P',e3:'P'},'c1d2',[],['bishop-color-pattern']),
 f('unprepared-flank',{c1:'B',f2:'P'},'c1b2',[],['prepared-fianchetto']),
 f('flank-from-another-square',{d4:'B',b3:'P'},'d4b2',[],['prepared-fianchetto']),
];

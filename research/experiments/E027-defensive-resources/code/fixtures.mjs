import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' ')});
export const fixtures=[
 f('save-rook-by-moving',{a1:null,h1:'K',b1:'R',b8:'r',h2:'P'},'b1c1',['saving-piece']),
 f('unchanged-rook-threat',{a1:null,h1:'K',b1:'R',b8:'r',h2:'P'},'h2h3',[],['saving-piece','defending-piece']),
 f('defend-rook-with-knight',{a1:null,h1:'K',b1:'R',b8:'r',e2:'N',h2:'P'},'e2c3',['defending-piece']),
 f('pinned-recapturer',{a1:null,b1:'K',a3:'Q',e3:'R',b3:'p',a8:'r',b8:'r',h2:'P'},'e3b3',[],['defending-piece']),
 f('capture-rook-attacker',{a1:null,h1:'K',b1:'R',b8:'r',c7:'B',h2:'P'},'c7b8',['defending-piece','eliminating-attacker','active-defense']),
 f('defensive-pawn-support',{a1:null,h1:'K',b5:'R',b8:'r',a3:'P',h2:'P'},'a3a4',['defending-piece','defensive-pawn-move']),
 f('file-check-block',{a1:null,e1:'K',e8:'r',d1:'B',h2:'P'},'d1e2',['line-interposition','blocking-file','closing-line']),
 f('diagonal-check-block',{a1:null,e1:'K',h4:'b',g2:'R',h2:'P'},'g2g3',['line-interposition','blocking-diagonal','closing-line']),
 f('king-escape',{a1:null,e1:'K',e8:'r',h2:'P'},'e1f1',['king-escape']),
 f('quiet-king-not-escape',{a1:null,e1:'K',a8:'r',h2:'P'},'e1f1',[],['king-escape','line-interposition']),
 f('adjacent-check-capture',{a1:null,e1:'K',e2:'r',h2:'P'},'e1e2',['king-escape'],['line-interposition']),
 f('file-attack-block',{a1:null,h1:'K',b1:'R',b8:'r',c1:'B',h2:'P'},'c1b2',['blocking-file','closing-line','defending-piece']),
 f('back-rank-luft',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',a8:'r'},'h2h3',['escape-square','luft']),
 f('escape-without-old-mate',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',a8:'n'},'h2h3',['escape-square'],['luft']),
 f('escape-square-still-attacked',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',a8:'r',c7:'b'},'h2h3',[],['escape-square','luft']),
 f('old-square-not-king-step',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',b2:'P',a8:'r'},'b2b3',[],['escape-square','luft']),
 f('escape-but-mate-remains',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',a8:'r',a6:'b',e2:'q'},'g2g3',['escape-square'],['luft']),
 f('another-capture-attacker',{a1:null,h1:'K',b1:'R',b8:'r',c8:'r',h2:'P'},'b1c1',[],['saving-piece']),
 f('capture-mate-persists',{a1:null,h1:'K',b1:'R',b8:'r',c8:'r',g2:'P',h2:'P'},'b1c1',[],['saving-piece']),
 f('already-recapturable',{b1:'R',b8:'r',h2:'P'},'b1c1',[],['saving-piece']),
];

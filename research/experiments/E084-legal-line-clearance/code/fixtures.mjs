import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected});
export const fixtures=[
 f('file-check',{h8:null,e8:'k',e1:'R',e2:'B'},'e2f3',['legal-file-opening','checking-king-piece-alignment']),
 f('queen-check',{h8:null,e8:'k',e1:'Q',e2:'B'},'e2f3',['checking-queen-king-alignment']),
 f('rook-queen',{e1:'R',e2:'N',e7:'q'},'e2c3',['legal-rook-queen-alignment','legal-file-opening']),
 f('diagonal-contact',{c1:'B',d2:'N',g5:'r'},'d2b3',['legal-line-clearance','legal-alignment']),
 f('remaining-blocker',{e1:'R',e2:'N',e4:'P',e7:'q'},'e2c3'),
 f('existing-line',{e1:'R',c2:'N',e7:'q'},'c2b4'),
 f('slider-moves',{e1:'R',e7:'q'},'e1e2'),
 f('pinned-slider',{a1:null,e1:'K',e2:'B',e3:'N',e8:'r',h5:'q'},'e3c4'),
 f('ordinary',{b2:'P'},'b2b3'),
];
export const bothColors=fixtures.flatMap(f=>[f,reflect(f)]);

import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const core={c5:'K',c7:'P',d4:'R',f7:'k',c1:'r'},start={c8:'K',c7:'P',d4:'R',f7:'k',c1:'r'},moves=['c8b7','c1b1','b7c6','b1c1','c6b5','c1b1','b5c5','b1c1'];
const f=(id,p,move,H,expected=[],extra={})=>({id,fen:boardFen(p),move,rookBridgeTags:true,rookBridgePlies:H,expected,scanReplies:false,...extra});
const authored=[
 f('completed-bridge',core,'d4c4',4,['completed-rook-bridge']),
 f('recorded-lucena',core,'d4c4',4,['completed-rook-bridge','recorded-lucena-bridge'],{history:{fen:boardFen(start),moves},fen:'8/2P2k2/8/2K5/3R4/8/8/2r5 w - - 8 5'}),
 f('short-bound',core,'d4c4',0),
 f('pawn-captured-despite-shield',{c5:'K',c7:'P',e4:'R',d7:'k',c1:'r'},'e4c4',4),
 f('wrong-shield-rank',{...core,d4:undefined,d3:'R'},'d3c3',4),
 f('rook-pawn',{a5:'K',a7:'P',d4:'R',f7:'k',a1:'r'},'d4a4',4),
 f('no-pawn',{...core,c7:undefined},'d4c4',4),
 f('extra-piece',{...core,h2:'N'},'d4c4',4),
 f('zero-budget',core,'d4c4',4,[],{maxRookBridgeNodes:0}),
 f('clock-terminal',core,'d4c4',4,[],{fen:'8/2P2k2/8/2K5/3R4/8/8/2r5 w - - 99 1'}),
];
export const fixtures=authored.flatMap(x=>[x,reflect(x)]);

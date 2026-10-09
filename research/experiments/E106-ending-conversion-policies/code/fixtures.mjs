import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const transition='pawn-ending-conversion-transition',simple='conversion-backed-simplification',bishop='rook-bishop-conversion',knight='rook-knight-conversion',all=[transition,simple,bishop,knight];
const f=(id,pieces,move,H,expected=[],extra={})=>({id,fen:boardFen(pieces),move,expected,absent:all.filter(x=>!expected.includes(x)),extra:{endingConversionPlies:H,...extra}}),pawn={c6:'K',e6:'P',h8:'k',d7:'n'},rook={f6:'K',e4:'R',f7:'P',h8:'k'};
export const fixtures=[f('transition',pawn,'e6d7',2,[transition,simple]),f('rook-bishop',{...rook,e7:'b'},'e4e7',4,[bishop]),f('rook-knight',{...rook,e7:'n'},'e4e7',4,[knight]),f('short-rook-bound',{...rook,e7:'n'},'e4e7',0),f('no-capture',pawn,'c6b5',2),f('extra-piece',{...pawn,a1:'R'},'e6d7',2),f('zero-horizon',pawn,'e6d7',0),f('zero-budget',pawn,'e6d7',2,[],{maxEndingConversionNodes:0})];
export const bothColors=fixtures.flatMap(f=>[f,reflect(f)]);

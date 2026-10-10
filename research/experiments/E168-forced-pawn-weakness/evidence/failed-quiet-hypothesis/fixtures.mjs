import {boardFen,reflect,flip} from '../../FRIEND-shared/lib.mjs';
const fen=boardFen({a1:'K',g5:'Q',a5:'R',g1:'R',e7:'N',e4:'N',h8:'k',g7:'p',f6:'p'}),base={id:'forced-g-pawn-capture-isolates-f6',fen,history:{fen,moves:[]},move:'g5h6',forcedWeaknessTags:true,weaknessPawn:'f6',weaknessQuiet:'g5f4',scanReplies:false,expected:['forced-new-isolated-pawn-exploitation']};
const extra=boardFen({a1:'K',g5:'Q',a5:'R',g1:'R',e7:'N',e4:'N',h8:'k',g8:'n',g7:'p',f6:'p'});
const isolated=boardFen({a1:'K',g5:'Q',a5:'R',g1:'R',e7:'N',e4:'N',h8:'k',h6:'p',f6:'p'});
export const white=[base,{...base,id:'nonpawn-defense-preserves-structure',fen:extra,history:{fen:extra,moves:[]},expected:[]},{...base,id:'insufficient-mate-bound',weaknessMatePlies:0,expected:[]},{...base,id:'already-isolated-root',fen:isolated,history:{fen:isolated,moves:[]},expected:[]},{...base,id:'missing-history',history:undefined,expected:[]},{...base,id:'missing-target',weaknessPawn:undefined,expected:[]},{...base,id:'zero-budget',maxForcedWeaknessNodes:0,expected:[]}];
const move=m=>flip(m.slice(0,2))+flip(m.slice(2,4))+m.slice(4);
export const fixtures=white.flatMap(f=>[f,{...reflect(f),weaknessPawn:f.weaknessPawn&&flip(f.weaknessPawn),weaknessQuiet:move(f.weaknessQuiet)}]);

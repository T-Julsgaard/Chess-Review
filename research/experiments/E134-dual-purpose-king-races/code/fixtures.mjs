import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const ids = ['adaptive-dual-purpose-king-race'],core = {f5:'K',c6:'P',b5:'k',d3:'p'};
const f = (id,p,move,H,expected=[],extra={}) => ({id,fen:boardFen(p),move,kingRacePlies:H,expected,kingRaceTags:true,scanReplies:false,...extra});
const authored = [
  f('original-hypothesis-unmet',{h8:'K',c6:'P',a6:'k',h5:'p'},'h8g7',10),
  f('same-file-queen-recapture',{...core,d3:undefined,c3:'p'},'f5e4',4),
  f('adaptive-distinct-files',core,'f5e4',4,ids),
  f('short-bound',core,'f5e4',0),
  f('wrong-geometry',core,'f5g4',4),
  f('zero-budget',core,'f5e4',4,[],{maxKingRaceNodes:0}),
];
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

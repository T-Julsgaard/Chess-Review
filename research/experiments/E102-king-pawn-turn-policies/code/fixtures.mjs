import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,pieces,move,expected=[],absent=[],plies=8)=>({id,fen:boardFen(pieces),move,expected,absent,extra:{kingPawnPlies:plies}});
const full='full-king-pawn-queen-policy',king='required-king-continuation',key='bounded-key-square-entry',zug='bounded-defender-zugzwang',mutual='bounded-mutual-turn-disadvantage',center='central-king-full-route-support';
export const fixtures=[
 f('king-key-entry',{b5:'K',c8:'k',c5:'P'},'b5b6',[full,king,key],[],10),
 f('king-key-short-bound-negative',{b5:'K',c8:'k',c5:'P'},'b5b6',[],[full],8),
 f('original-turn-negative',{b5:'K',c7:'k',c6:'P'},'b5c5',[],[full,zug,mutual],10),
 f('original-center-negative',{f5:'K',e7:'k',e6:'P'},'f5e5',[],[full,center,zug,mutual],10),
 f('full-opposition-continuation',{d6:'K',e8:'k',e5:'P'},'d6e6',[full,king],[],12),
 f('near-promotion-turn-comparison',{a6:'K',c8:'k',c7:'P'},'a6b6',[full,king,key,zug,mutual],[],6),
 f('near-promotion-longer-bound',{a6:'K',c8:'k',c7:'P'},'a6b6',[full,king,key,zug,mutual],[],8),
 f('central-full-continuation',{d4:'K',h8:'k',c4:'P'},'d4d5',[full,king,key,center],[],12),
 f('central-budget-exhausted',{d4:'K',c8:'k',c4:'P'},'d4d5',[],[full],12),
 f('pawn-only-suffices',{a1:'K',h8:'k',c7:'P'},'a1b1',[full],[king,key,zug],2),
 f('rook-pawn-corner-stalemate',{f6:'K',h8:'k',h7:'P'},'f6g6',[],[full]),
 f('zero-horizon',{b5:'K',c7:'k',c6:'P'},'b5c5',[],[full],0),
 f('extra-pawn-unavailable',{b5:'K',c7:'k',c6:'P',a7:'p'},'b5c5',[],[full]),
];
const start=boardFen({a6:'K',c8:'k',c7:'P'}),historyMoves=['a6a5','c8d7','a5a6','d7c8'],c=new Chess(start);for(const m of historyMoves)c.move(m);fixtures.push({...f('known-twofold-history',{a6:'K',c8:'k',c7:'P'},'a6b6',[full,king,key,zug,mutual],[],6),fen:c.fen(),history:{fen:start,moves:historyMoves}});
const clock=f('near-fifty-move-limit',{a6:'K',c8:'k',c7:'P'},'a6b6',[],[],6);clock.fen=clock.fen.replace(' 0 1',' 97 1');fixtures.push(clock);
export const bothColors=fixtures.flatMap(f=>[f,reflect(f)]);

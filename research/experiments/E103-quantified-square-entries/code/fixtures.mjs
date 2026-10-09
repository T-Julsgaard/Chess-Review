import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const full='quantified-occupied-square',entry='causal-tactical-entry-square',pawn='profitable-pawn-resistant-square',protectedId='quantified-protected-knight-outpost';
const pieces={g3:'K',a8:'k',g7:'N',f3:'B',f4:'P',g4:'P',h4:'P',e4:'P',e7:'r',h6:'r',a4:'P'};
const f=(id,p,move='g7f5',expected=[],absent=[],extra={})=>({id,fen:boardFen(p),move,expected,absent,extra});
export const fixtures=[
 f('supported-f5',pieces,'g7f5',[full,entry,pawn,protectedId]),
 f('existing-pawn-cannot-reach',{...pieces,h5:'p'},'g7f5',[full,entry,pawn,protectedId]),
 f('potential-pawn-challenge',{...pieces,d7:'p'},'g7f5',[full,entry],[pawn,protectedId]),
 f('no-legal-pawn-support',{...Object.fromEntries(Object.entries(pieces).filter(([s])=>s!=='e4'&&s!=='a8')),a7:'k',g4:'B'},'g7f5',[full,entry],[pawn,protectedId]),
 f('queen-check-refutation',{...pieces,h6:'q'},'g7f5',[],[full,entry,pawn,protectedId]),
 f('lower-rank-rook-fork',{g1:'K',a8:'k',g5:'N',f1:'B',f2:'P',g2:'P',h2:'P',e5:'r',h4:'r',a2:'P'},'g5f3',[full],[entry,pawn,protectedId]),
 f('queen-forces-other-capturer',{g1:'K',a8:'k',g5:'N',f1:'B',f2:'P',g2:'P',h2:'P',e5:'r',h4:'q',a2:'P'},'g5f3',[],[full]),
 f('promotion-counter-refutation',{...pieces,h3:'p'},'g7f5',[],[full,pawn,protectedId]),
 f('zero-budget',pieces,'g7f5',[],[full,entry,pawn,protectedId],{maxSquarePolicyNodes:0}),
 f('quiet-nonfork',{...pieces,e7:undefined,h6:undefined,b7:'r'},'g7f5',[],[full]),
 f('pawn-move-unavailable',pieces,'a4a5',[],[full,entry,pawn,protectedId]),
];
const startPieces={...pieces,h5:'N'};delete startPieces.g7;const start=boardFen(startPieces),moves=['h5g7','a8a7'],c=new Chess(start);for(const m of moves)c.move(m);fixtures.push({...f('known-full-history',{...pieces,a8:undefined,a7:'k'},'g7f5',[full,entry,pawn,protectedId]),fen:c.fen(),history:{fen:start,moves}});
export const bothColors=fixtures.flatMap(f=>[f,reflect(f)]);

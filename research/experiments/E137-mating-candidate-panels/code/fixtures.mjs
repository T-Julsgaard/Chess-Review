import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const core={g6:'K',g5:'Q',h8:'k'},both=['mating-candidate-comparison','shortest-mate-filter'],all=[...both,'longest-mating-defense','mating-principal-variation'];
const f=(id,p,move,H,expected=[],extra={})=>({id,fen:boardFen(p),move,candidatePanelTags:true,candidateMatePlies:H,expected,scanReplies:false,...extra});
const authored=[
 f('complete-candidates',core,'g5e7',2,all),
 f('quiet-alternative',core,'g5f5',2,all),
 f('original-branching-hypothesis',{f6:'K',c5:'Q',g8:'k'},'c5g5',2,both),
 f('branching-defenses',{f6:'K',c5:'Q',g8:'k'},'c5c7',2,all),
 f('original-illegal-endpoint',core,'g5g7',2,[],{inputError:'Illegal move: g5g7'}),
 f('actual-mate',core,'g5d8',2,[...both,'mating-principal-variation']),
 f('short-bound',core,'g5e7',0,both),
 f('neutral-no-certified',{a1:'K',a2:'R',h8:'k'},'a2b2',0),
 f('zero-budget',core,'g5e7',2,[],{maxCandidatePanelNodes:0}),
 f('claim-clock',core,'g5e7',2,[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
];
export const fixtures=authored.flatMap(x=>{const b=reflect(x);if(b.inputError)b.inputError='Illegal move: '+b.move;return [x,b];});

import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const oldRoot={a2:'K',a3:'P',c2:'k',b2:'p',a1:'r'},oldPrior={a2:'K',a3:'P',a1:'R',c2:'k',b2:'p',h1:'r'},root={a2:'K',a4:'P',c3:'k',b2:'p',a3:'r'},prior={a2:'K',a4:'P',a3:'R',c3:'k',b2:'p',b3:'r'},two={f6:'K',e7:'Q',h8:'k'};
const f=(id,p,move,H,expected=[],extra={})=>({id,fen:boardFen(p),move,mateDistanceTags:true,mateDistancePlies:H,expected,scanReplies:false,...extra});
const authored=[
 f('original-illegal-hypothesis',oldRoot,'a2a1',3,[],{history:{fen:boardFen(oldPrior,'b'),moves:['h1a1']},fen:'8/8/8/8/8/P7/Kpk5/r7 w - - 0 2',inputError:'Illegal move: a2a1'}),
 f('original-stalemate-hypothesis',two,'e7f7',3,[],{mateDistanceSide:'actor'}),
 f('lost-pawn-exchange',root,'a2a3',3,['exact-mate-distance','entered-lost-pawn-ending'],{history:{fen:boardFen(prior,'b'),moves:['b3a3']},fen:'8/8/8/8/P7/r1k5/Kp6/8 w - - 0 2'}),
 f('no-history-distance-only',root,'a2a3',3,['exact-mate-distance']),
 f('second-distance-hypothesis-unresolved',two,'e7e6',3,[],{mateDistanceSide:'actor'}),
 f('distance-two',{g6:'K',g5:'Q',h8:'k'},'g5e7',3,['exact-mate-distance'],{mateDistanceSide:'actor'}),
 f('short-bound',root,'a2a3',0),
 f('nonmating-bound',{a1:'K',h8:'k',a2:'R'},'a2b2',2,[],{mateDistanceSide:'actor'}),
 f('zero-budget',root,'a2a3',3,[],{maxMateDistanceNodes:0}),
 f('claim-clock',two,'e7e6',3,[],{mateDistanceSide:'actor',fen:'7k/4Q3/5K2/8/8/8/8/8 w - - 99 1'}),
 f('actual-mate-zero',two,'e7g7',0,['exact-mate-distance'],{mateDistanceSide:'actor'}),
];
export const fixtures=authored.flatMap(x=>{const b=reflect(x);if(b.inputError)b.inputError='Illegal move: '+b.move;if(b.history&&x.history.moves.length%2&&x.history.fen.split(' ')[1]==='b'){const a=b.history.fen.split(' ');a[5]=String(+a[5]+1);b.history.fen=a.join(' ');}return [x,b];});

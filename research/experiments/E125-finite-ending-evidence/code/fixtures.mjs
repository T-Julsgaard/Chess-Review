import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const core = {a1:'K',a2:'P',b2:'P',b1:'N',f1:'N',h8:'k',c4:'r',g4:'r'};
const pawn = {c6:'K',d7:'P',h8:'k'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'f1e3',endingEvidenceTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('fork',core,['ending-knight-fork']),
  f('same-wing',{...core,g4:undefined,c2:'r'},['ending-knight-fork']),
  f('one-target',{...core,g4:undefined}),
  f('countercheck',{...core,b1:undefined}),
  f('root-loss',{...core,c1:'R',h8:undefined,c8:'k'}),
  f('old-pressure',{...core,f1:'B',e3:'N'},[],{move:'f1g2'}),
  f('queen-profile',{...core,g4:'q'}),
  f('extra-pawn',{...core,a3:'P'}),
  f('tempo',pawn,['bounded-conversion-tempo-count'],{move:'c6c7'}),
  f('short-bound',pawn,[],{move:'c6c7',endingPlies:1}),
  f('zero-bound',pawn,[],{move:'c6c7',endingPlies:0}),
  f('exact-bound',pawn,['bounded-conversion-tempo-count'],{move:'c6c7',endingPlies:2}),
  f('pawn-move',{c6:'K',d6:'P',h8:'k'},['bounded-conversion-tempo-count'],{move:'d6d7',endingPlies:2}),
  f('promotion',pawn,[],{move:'d7d8q'}),
  f('no-own-pawn',{c6:'K',h8:'k',a7:'p'},[],{move:'c6c7'}),
  f('multiple-pawns',{...pawn,a2:'P'},[],{move:'c6c7'}),
  f('zero-budget',core,[],{maxEndingEvidenceNodes:0}),
  f('atomic-budget',pawn,[],{move:'c6c7',maxEndingEvidenceNodes:1}),
  f('parent-exhausted',core,[],{maxBothWingNodes:0}),
  f('clock-draw',pawn,[],{move:'c6c7',fen:boardFen(pawn).replace(' 0 1',' 99 1')}),
];
const history = {fen:boardFen(core),moves:['b1c3','h8h7','c3b1','h7h8']},c = legalPosition(history.fen); for (const move of history.moves) c.move(move);
authored.push(f('known-history',core,['ending-knight-fork'],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
// Authored deterministic discovery family; selected after registration, development only.
const core = {d1:'K',g1:'k',d4:'P',d5:'p'};
const ids = ['locked-pawn-corresponding-square-system'];
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'d1e1',correspondenceTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('linked-system',core,ids),
  f('diagonal-system',core,ids,{move:'d1e2'}),
  f('left-side-system',{c1:'K',a2:'k',d4:'P',d5:'p'},ids,{move:'c1c2'}),
  f('far-king',{...core,g1:undefined,h8:'k'}),
  f('unblocked',{...core,d5:undefined,e5:'p'}),
  f('missing-pawn',{...core,d5:undefined}),
  f('extra-pawn',{...core,a2:'P'}),
  f('piece-profile',{...core,h1:'N'}),
  f('zero-budget',core,[],{maxCorrespondenceNodes:0}),
  f('atomic-budget',core,[],{maxCorrespondenceNodes:63811}),
  f('inherited-trebuchet',{f6:'K',c5:'k',d5:'P',d6:'p'},[],{move:'f6e6',reserveTempoTags:true,maxCorrespondenceNodes:0}),
  f('clock-draw',core,[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
  f('draw-replies',core,[],{fen:boardFen(core).replace(' 0 1',' 98 1')}),
  f('insufficient-clock',core,[],{fen:boardFen(core).replace(' 0 1',' 95 1')}),
];
const history = {fen:boardFen(core),moves:['d1c1','g1h1','c1d1','h1g1']},c = legalPosition(history.fen); for (const move of history.moves) c.move(move);
authored.push(f('repeated-history',core,[],{history,fen:c.fen()}));
// Distinct two-ply history ends at the same discovery board without repetition.
const fresh = {fen:boardFen({c1:'K',h1:'k',d4:'P',d5:'p'}),moves:['c1d1','h1g1']},p = legalPosition(fresh.fen); for (const move of fresh.moves) p.move(move);
authored.push(f('known-history',core,ids,{history:fresh,fen:p.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

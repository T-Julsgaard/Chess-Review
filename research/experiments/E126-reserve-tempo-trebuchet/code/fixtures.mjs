import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
// Authored constrained family: adjacent blocked pawns, two kings each contacting both.
const core = {e6:'K',d5:'P',c5:'k',d6:'p'},reserve = {...core,a2:'P'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'a2a3',reserveTempoTags:true,scanReplies:false,expected,...extra});
const tempo = ['certified-reserve-pawn-tempo'],trebuchet = ['reciprocal-trebuchet-pawn-loss'];
const authored = [
  f('reserve-step',reserve,tempo),
  f('reserve-double',reserve,[],{move:'a2a4'}),
  f('reserve-countercapture',{...core,b2:'P'},[],{move:'b2b4'}),
  f('trebuchet-entry',{...core,e6:undefined,f6:'K'},trebuchet,{move:'f6e6'}),
  f('enemy-reserve',{...reserve,h7:'p'}),
  f('guards-missing',{...reserve,c5:undefined,b5:'k'}),
  f('pair-unblocked',{...reserve,d6:undefined,d4:'p'}),
  f('king-extra-army',reserve,[],{move:'e6f6'}),
  f('piece-profile',{...reserve,h1:'N'}),
  f('excess-pawns',{...reserve,b2:'P',g7:'p',h7:'p'}),
  f('zero-budget',reserve,[],{maxReserveTempoNodes:0}),
  f('atomic-budget',reserve,[],{maxReserveTempoNodes:1}),
  f('inherited-conversion',{c6:'K',d7:'P',h8:'k'},[],{move:'c6c7',endingEvidenceTags:true,maxReserveTempoNodes:0}),
  f('clock-draw',{...core,e6:undefined,f6:'K'},[],{move:'f6e6',fen:boardFen({...core,e6:undefined,f6:'K'}).replace(' 0 1',' 99 1')}),
  f('certificate-draw',{...core,e6:undefined,f6:'K'},[],{move:'f6e6',fen:boardFen({...core,e6:undefined,f6:'K'}).replace(' 0 1',' 98 1')}),
];
const history = {fen:boardFen(reserve),moves:['e6f6','c5b5','f6e6','b5c5']},c = legalPosition(history.fen); for (const move of history.moves) c.move(move);
authored.push(f('known-history',reserve,tempo,{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

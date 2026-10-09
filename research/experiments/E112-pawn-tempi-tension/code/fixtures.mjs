import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const spare = ['conversion-spare-pawn-tempo','conversion-passing-move'], tension = ['conversion-maintained-pawn-tension'];
const f = (id,pieces,move,H,expected=[],extra={}) => ({id,fen:boardFen(pieces),move,
  pawnTempoTags:true,pawnTempoPlies:H,scanReplies:false,expected,...extra});
const reserve = {c6:'K',d7:'P',a2:'P',b8:'k'}, exchange = {c6:'K',d7:'P',a2:'P',f8:'k',b3:'p'};
const authored = [
  f('spare-single',reserve,'a2a3',4,spare),
  f('spare-double',reserve,'a2a4',4,spare),
  f('short-bound',reserve,'a2a3',0),
  f('no-failing-king',{...reserve,b8:undefined,h8:'k'},'a2a3',2),
  f('conversion-fails',{d6:'K',e6:'P',a2:'P',d8:'k'},'a2a3',4),
  f('tension',exchange,'c6c7',2,tension),
  f('capture-alternative-succeeds',exchange,'c6c7',4),
  f('actual-pawn-exchange',exchange,'a2b3',2),
  f('actual-promotion',exchange,'d7d8q',2),
  f('extra-piece',{...reserve,h1:'R'},'a2a3',4),
  f('single-own-pawn',{c6:'K',d7:'P',h8:'k',b3:'p'},'c6c7',2),
  f('zero-budget',reserve,'a2a3',4,[],{maxPawnTempoNodes:0}),
  f('atomic-budget',reserve,'a2a3',4,[],{maxPawnTempoNodes:30}),
  f('clock-draw',exchange,'c6c7',2,[],{fen:boardFen(exchange).replace(' 0 1',' 99 1')}),
];
const history = {fen:boardFen(reserve),moves:['c6c5','b8a8','c5c6','a8b8']};
const historic = legalPosition(history.fen);
for (const code of history.moves) historic.move(code);
authored.push(f('known-history',reserve,'a2a3',4,spare,{fen:historic.fen(),history}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

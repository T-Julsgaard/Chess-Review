import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const advanced = 'causal-pawn-overextension-mate',grab = 'pawn-capture-allows-proved-mate';
const core = {g1:'K',f1:'R',h1:'R',f2:'N',g2:'P',a8:'k',h4:'q'};
const f = (id,p,move,expected=[],extra={}) => ({id,fen:boardFen(p),move,pawnRiskTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('advanced-pawn-exposure',core,'g2g4',[advanced]),
  f('pawn-capture-exposure',{...core,h3:'p'},'g2h3',[grab]),
  f('rook-can-answer',{...core,g2:'R',g4:'p'},'g2g4'),
  f('no-mating-force',{...core,h4:undefined},'g2g4'),
  f('king-escape-available',{...core,f1:undefined},'g2g4'),
  f('below-advanced-rank',core,'g2g3'),
  f('restoration-still-loses',{...core,g2:undefined,g4:'P'},'g4g5'),
  f('other-piece-exposure',core,'f2h3'),
  f('zero-depth',core,'g2g4',[],{defenseChoicePlies:0}),
  f('parent-exhausted',core,'g2g4',[],{maxDefenseChoiceNodes:0}),
  f('zero-budget',core,'g2g4',[],{maxPawnRiskNodes:0}),
  f('atomic-budget',core,'g2g4',[],{maxPawnRiskNodes:54}),
];
const history = {fen:boardFen(core),moves:['f1e1','a8b8','e1f1','b8a8']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,'g2g4',[advanced],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

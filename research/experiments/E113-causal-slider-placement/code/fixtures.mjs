import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const rook = {f6:'K',f7:'B',f3:'R',h8:'k'},queen = {c3:'K',h4:'Q',d5:'k',c6:'p',d6:'p',e6:'p'};
const f = (id,p,move,H,expected=[],extra={}) => ({id,fen:boardFen(p),move,sliderPlacementTags:true,
  sliderPlacementPlies:H,scanReplies:false,expected,...extra});
const lift = ['causal-rook-lift-mate'],central = ['causal-queen-centralization-mate'];
const authored = [
  f('rook-third',rook,'f3h3',0,lift),
  f('rook-fourth',{...rook,f3:undefined,f4:'R'},'f4h4',0,lift),
  f('nonterminal-rook',{...rook,h7:'p'},'f3h3',2,lift),
  f('nonterminal-short-bound',{...rook,h7:'p'},'f3h3',0),
  f('queen-center',queen,'h4d4',0,central),
  f('queen-no-policy',{...queen,e6:undefined},'h4d4',2),
  f('restoration-still-mates',{...rook,f3:undefined,a3:'R'},'a3b3',2),
  f('wrong-rank',{...rook,f3:undefined,f2:'R'},'f2h2',0),
  f('vertical-rook',rook,'f3f4',2),
  f('noncentral-queen',queen,'h4h3',0),
  f('queen-already-central',{c3:'K',d4:'Q',h7:'k'},'d4e4',0),
  f('actual-capture',{...rook,h3:'n'},'f3h3',0),
  f('zero-budget',rook,'f3h3',0,[],{maxSliderPlacementNodes:0}),
  f('atomic-budget',rook,'f3h3',0,[],{maxSliderPlacementNodes:4}),
  f('clock-draw',{...rook,h7:'p'},'f3h3',2,[],{fen:boardFen({...rook,h7:'p'}).replace(' 0 1',' 99 1')}),
];
const historyRoot = {f6:'K',a3:'R',h8:'k'};
const h = {fen:boardFen(historyRoot),moves:['a3a4','h8h7','a4a3','h7h8']};
const c = legalPosition(h.fen); for (const code of h.moves) c.move(code);
authored.push(f('known-history',historyRoot,'a3b3',2,[],{fen:c.fen(),history:h}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

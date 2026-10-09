import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const storm = 'recorded-joint-piece-storm',superior = 'causal-local-numerical-superiority';
const core = {h1:'K',b3:'Q',f5:'N',h8:'k',f8:'r',g7:'p',h7:'p',b7:'p'};
function f(id,p,moves,expected=[],extra={}) {
  const history = {fen:boardFen(p),moves},c = legalPosition(history.fen); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),history,move:'b3g8',pieceStormTags:true,scanReplies:false,expected,...extra};
}
const authored = [
  f('joint-arrivals',core,['f5h6','b7b6'],[storm,superior]),
  f('local-tie',{...core,g6:'n'},['f5h6','b7b6'],[storm]),
  f('enemy-local-majority',{...core,g6:'n',f6:'b'},['f5h6','b7b6'],[storm]),
  f('extra-knight-refutes-mate',{...core,g6:'n',f6:'n'},['f5h6','b7b6']),
  f('different-origin',{...core,f5:undefined,g4:'N'},['g4h6','b7b6'],[storm,superior]),
  f('longer-history',core,['h1g1','b7b6','f5h6','b6b5'],[storm,superior]),
  f('capture-arrival',{...core,h6:'p'},['f5h6','b7b6']),
  f('king-history', {...core,f5:undefined,h6:'N'},['h1g1','b7b6']),
  f('pawn-history', {...core,f5:undefined,h6:'N',a2:'P'},['a2a3','b7b6']),
  f('same-queen-arrives-twice',{...core,b3:undefined,b2:'Q',f5:undefined,h6:'N'},['b2b3','b7b6']),
  f('enemy-king-relocation',{...core,f5:undefined,g4:'N',h8:undefined,h7:'k'},['g4h6','h7h8']),
  f('parent-short-bound',core,['f5h6','b7b6'],[],{attackEntryPlies:0}),
  f('parent-exhausted',core,['f5h6','b7b6'],[],{maxAttackEntryNodes:0}),
  f('zero-budget',core,['f5h6','b7b6'],[],{maxPieceStormNodes:0}),
  f('atomic-budget',core,['f5h6','b7b6'],[],{maxPieceStormNodes:42}),
];
const noHistory = {...authored[0],id:'missing-history',expected:[]}; delete noHistory.history;
const shortHistory = {...authored[0],id:'empty-history',history:{fen:authored[0].fen,moves:[]},expected:[]};
authored.push(noHistory,shortHistory);
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

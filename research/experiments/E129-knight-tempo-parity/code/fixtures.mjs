import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const ids = ['knight-only-odd-tempo-impossibility'],core = {a1:'K',a2:'P',g1:'N',h8:'k'};
function f(id,p,moves,move,expected=[],extra={}) {
  const history = {fen:boardFen(p),moves},c = legalPosition(history.fen); for (const code of moves) c.move(code);
  return {id,fen:c.fen(),history,move,knightTempoTags:true,scanReplies:false,expected,...extra};
}
const route = ['g1f3','h8h7','f3h4','h7h8'];
const authored = [
  f('three-knight-moves',core,route,'h4f5',ids),
  f('multiple-knights',{...core,b1:'N'},['b1c3','h8h7','g1f3','h7h8'],'c3b1',ids),
  f('enemy-knight-return',{...core,b8:'n'},['g1f3','b8c6','f3h4','c6b8'],'h4f5',ids),
  f('five-knight-moves',core,[...route,'h4f5','h8h7','f5h6','h7h8'],'h6f7',ids,{knightTempoMoves:5}),
  f('enemy-not-returned',core,['g1f3','h8h7','f3h4','h7h6'],'h4f5'),
  f('mixed-own-king',core,['g1f3','h8h7','a1b1','h7h8'],'f3h4'),
  f('mixed-own-pawn',core,['g1f3','h8h7','a2a3','h7h8'],'f3h4'),
  f('history-capture',{...core,h4:'p'},route,'h4f5'),
  f('actual-capture',{...core,f5:'p'},route,'h4f5'),
  f('piece-profile',{...core,c1:'B'},route,'h4f5'),
  f('missing-history',core,[],'g1f3',[],{history:undefined}),
  f('short-history',core,['g1f3','h8h7'],'f3h4'),
  f('longer-window-unavailable',core,route,'h4f5',[],{knightTempoMoves:5}),
  f('zero-budget',core,route,'h4f5',[],{maxKnightTempoNodes:0}),
  f('atomic-budget',core,route,'h4f5',[],{maxKnightTempoNodes:408}),
  f('clock-draw',core,route,'h4f5',[],{history:{fen:boardFen(core).replace(' 0 1',' 95 1'),moves:route},fen:boardFen({a1:'K',a2:'P',h4:'N',h8:'k'}).replace(' 0 1',' 99 3')}),
];
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

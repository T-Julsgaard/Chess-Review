import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const ids = ['proved-mating-move-order','forcing-check-move-order'];
const core = {f6:'K',a1:'R',h5:'B',g5:'P',h8:'k',c2:'n'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'a1a8',orderFollowup:'h5g6',moveOrderTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('forcing-order',core,ids),
  f('reverse-also-wins',{...core,c2:undefined}),
  f('escape-after-followup',{...core,g5:undefined}),
  f('already-mate',{...core,h5:undefined,b1:'B'},[],{orderFollowup:'b1g6'}),
  f('bishop-blocks-rook',{...core,h5:undefined,b3:'B'},[],{orderFollowup:'b3g8'}),
  f('followup-illegal',core,[],{orderFollowup:'h5h6'}),
  f('same-piece',core,[],{orderFollowup:'a1a7'}),
  f('pawn-followup',{...core,b2:'P'},[],{orderFollowup:'b2b3'}),
  f('capturing-followup',{...core,g6:'n'}),
  f('first-not-check',core,[],{move:'a1a7'}),
  f('zero-budget',core,[],{maxMoveOrderNodes:0}),
  f('atomic-budget',core,[],{maxMoveOrderNodes:39}),
  f('clock-draw',core,[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
  f('tail-one',core,ids,{orderTailPlies:1}),
  f('block-check-alternative',{...core,d6:'n'}),
];
const history = {fen:boardFen(core),moves:['a1a2','c2b4','a2a1','b4c2']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,ids,{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,{...reflect(x),orderFollowup:x.orderFollowup.slice(0,1)+(9-+x.orderFollowup[1])+x.orderFollowup.slice(2,3)+(9-+x.orderFollowup[3])+x.orderFollowup.slice(4)}]);

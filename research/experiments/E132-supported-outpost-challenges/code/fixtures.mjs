import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const ids = ['stops-secure-supported-knight-outpost'],core = {a1:'K',f1:'B',h8:'k',f6:'n',e6:'p'};
const f = (id,p,move,expected=[],extra={}) => ({id,fen:boardFen(p),move,expected,outpostChallengeTags:true,scanReplies:false,...extra});
const history = {fen:boardFen(core),moves:['f1e2','h8g8','e2f1','g8h8']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
const authored = [
  f('equal-exchange-challenge',core,'f1g2',ids),
  f('two-knight-entries',{...core,b6:'n'},'f1g2',ids),
  f('removed-supporter-terminal',{...core,f1:undefined,h3:'B'},'h3e6'),
  f('removed-supporter',{...core,f1:undefined,h3:'B',h7:'p'},'h3e6',ids),
  f('full-history',core,'f1g2',ids,{fen:c.fen(),history}),
  f('no-pawn-support',{...core,e6:undefined},'f1g2'),
  f('future-pawn-challenger',{...core,c2:'P'},'f1g2'),
  f('already-capturable',{...core,f1:undefined,g2:'B',b1:'R'},'b1b2'),
  f('no-new-capture',core,'f1e2'),
  f('losing-queen-exchange',{...core,f1:'Q'},'f1g2'),
  f('wrong-king',core,'a1b1'),
  f('wrong-pawn',{...core,a2:'P'},'a2a3'),
  f('clock-terminal',{...core},'f1g2',[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
  f('zero-budget',core,'f1g2',[],{maxOutpostChallengeNodes:0}),
  f('tiny-budget',core,'f1g2',[],{maxOutpostChallengeNodes:5}),
];
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const id = ['necessary-both-wing-capture-policy'];
const core = {a1:'K',a2:'P',b2:'P',b1:'N',f1:'N',h8:'k',c4:'r',g4:'r'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'f1e3',bothWingTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('both-wings-required',core,id),
  f('same-wing-targets',{...core,g4:undefined,c2:'r'}),
  f('one-target',{...core,g4:undefined}),
  f('countercheck',{...core,b1:undefined}),
  f('root-material-loss',{...core,c1:'R',h8:undefined,c8:'k'}),
  f('old-pressure',{...core,f1:'B',e3:'N'},[],{move:'f1g2'}),
  f('wrong-entry',core,[],{move:'f1h2'}),
  f('pawn-move',core,[],{move:'a2a3'}),
  f('already-mate',{f6:'K',f7:'B',f3:'R',h8:'k'},[],{move:'f3h3'}),
  f('zero-budget',core,[],{maxBothWingNodes:0}),
  f('atomic-budget',core,[],{maxBothWingNodes:637}),
  f('clock-draw',core,[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
];
const history = {fen:boardFen(core),moves:['b1c3','h8h7','c3b1','h7h8']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,id,{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

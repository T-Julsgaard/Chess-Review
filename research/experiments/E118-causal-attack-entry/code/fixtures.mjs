import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const reinforce = 'causal-mating-reinforcement',infiltrate = 'causal-queen-infiltration',switchWing = 'causal-mating-wing-switch',switchAttack = 'causal-attack-switch-with-prior-contact';
const core = {h1:'K',b3:'Q',h6:'N',h8:'k',f8:'r',g7:'p',h7:'p',b7:'p'};
const f = (id,p,move,expected=[],extra={}) => ({id,fen:boardFen(p),move,attackEntryTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('queen-infiltration-switch',core,'b3g8',[reinforce,infiltrate,switchWing,switchAttack]),
  f('no-prior-contact',{...core,b7:undefined},'b3g8',[reinforce,infiltrate,switchWing]),
  f('queen-high-origin',{...core,b3:undefined,d5:'Q'},'d5g8',[reinforce]),
  f('prior-knight-target',{...core,b7:'n'},'b3g8',[reinforce,infiltrate,switchWing,switchAttack]),
  f('prior-two-targets',{...core,c3:'n'},'b3g8',[reinforce,infiltrate,switchWing,switchAttack]),
  f('multiple-local-partners',{...core,f6:'N'},'b3g8',[reinforce,infiltrate,switchWing,switchAttack]),
  f('no-partner',{...core,h6:undefined},'b3g8'),
  f('partner-too-far',{...core,h6:undefined,a2:'N'},'b3g8'),
  f('partner-is-pawn',{...core,h6:'P'},'b3g8'),
  f('already-near',{...core,b3:undefined,f6:'Q'},'f6g6'),
  f('capturing-entry',{...core,g8:'n'},'b3g8'),
  f('nonentry',core,'b3b4'),
  f('wrong-piece',core,'h1g1'),
  f('short-bound',core,'b3g8',[],{attackEntryPlies:1}),
  f('zero-bound',core,'b3g8',[],{attackEntryPlies:0}),
  f('no-mate',{...core,h6:undefined,f6:'N'},'b3g8'),
  f('zero-budget',core,'b3g8',[],{maxAttackEntryNodes:0}),
  f('atomic-budget',core,'b3g8',[],{maxAttackEntryNodes:35}),
  f('clock-draw',core,'b3g8',[],{fen:boardFen(core).replace(' 0 1',' 99 1')}),
  f('actual-mate',{f6:'K',f7:'B',f3:'R',h8:'k'},'f3h3'),
];
const history = {fen:boardFen(core),moves:['h1g1','b7b6','g1h1','b6b5']};
const c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,'b3g8',[reinforce,infiltrate,switchWing,switchAttack],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

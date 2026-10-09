import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const control = 'causal-central-king-flight-control',fluid = 'fluid-legal-central-pawn-choices',fixed = 'causal-enemy-pawn-restraint',color = 'bishop-color-pawn-fixation',entry = 'new-all-reply-piece-entry';
const core = {a1:'K',h7:'k',b2:'B',g2:'N',e3:'P',e5:'p'};
const f = (id,p,move,expected=[],extra={}) => ({id,fen:boardFen(p),move,centerRestraintTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('fixed-color-entry',core,'e3e4',[fixed,color,entry]),
  f('no-entrant',{...core,g2:undefined},'e3e4',[fixed,color]),
  f('no-bishop',{...core,b2:undefined},'e3e4',[fixed,entry]),
  f('wrong-bishop-color',{...core,b2:undefined,d1:'B'},'e3e4',[fixed,entry]),
  f('already-pinned-pawn',{...core,h7:undefined,h8:'k'},'e3e4',[entry]),
  f('unsafe-entry-and-capture',{...core,d5:'n'},'e3e4',[fixed]),
  f('capturable-blocker',{...core,f5:'b'},'e3e4',[entry]),
  f('central-knight',{a1:'K',f5:'k',b1:'N',h2:'P'},'b1c3',[control]),
  f('illegal-control-frame',{a1:'K',f5:'k',b1:'N',h2:'P',d4:'b'},'b1c3'),
  f('central-pawn',{a1:'K',e6:'k',g2:'N',e3:'P'},'e3e4',[control,entry]),
  f('fluid',{a1:'K',h8:'k',d4:'P',e4:'P',c5:'p',e5:'p'},'a1b1',[fluid]),
  f('single-pawn-no-fluid',{a1:'K',h8:'k',d4:'P',e5:'p'},'a1b1'),
  f('fluid-duplicate-profiles',{},'h8h7',[fluid],{fen:boardFen({a1:'K',b2:'P',d2:'P',e4:'P',c3:'n',h8:'k'},'b')}),
  f('nonpawn-entry-move',core,'g2h4'),
  f('actual-pawn-capture',{a1:'K',h8:'k',e3:'P',d4:'n'},'e3d4'),
  f('zero-budget',core,'e3e4',[],{maxCenterRestraintNodes:0}),
  f('atomic-budget',core,'e3e4',[],{maxCenterRestraintNodes:50}),
];
const history = {fen:boardFen(core),moves:['a1b1','h7h8','b1a1','h8h7']};
const c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,'e3e4',[fixed,color,entry],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

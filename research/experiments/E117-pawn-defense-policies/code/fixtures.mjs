import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const weak = 'all-defense-profitable-pawn-capture',cover = 'causal-bounded-pawn-cover';
const core = {a1:'K',h7:'k',b2:'B',e3:'P',e5:'p'};
const shelter = {g1:'K',h8:'k',f2:'P',g2:'P',h2:'P',g4:'q',f3:'b'};
const legalShelter = {g1:'K',a8:'k',f2:'P',g2:'P',h2:'P',h4:'q',g3:'b',f8:'r'};
const f = (id,p,move,expected=[],extra={}) => ({id,fen:boardFen(p),move,pawnDefenseTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('weak-fixed-pawn',core,'e3e4',[weak]),
  f('weak-extra-attacker',{...core,g2:'N'},'e3e4',[weak]),
  f('failed-pawn-before-success',{...core,a6:'p'},'e3e4',[weak]),
  f('varying-capturers-unrelated-loss',{a1:'K',h7:'k',c4:'N',c6:'N',e3:'P',e4:'p',e5:'p',d5:'b'},'a1b1'),
  f('pawn-can-advance',{...core,e3:undefined,d2:'P'},'a1b1'),
  f('capture-recovered',{...core,d5:'n'},'e3e4'),
  f('attacker-removed',{...core,f5:'b'},'e3e4'),
  f('pawn-can-capture-blocker',{...core,d5:'p'},'e3e4'),
  f('no-enemy-pawn',{...core,e5:undefined},'e3e4'),
  f('cover-removal-mate',legalShelter,'f2f3',[cover]),
  f('cover-other-advance',legalShelter,'h2h3',[cover]),
  f('illegal-removal-frame',shelter,'g2g3'),
  f('alternative-defense',{...legalShelter,f1:'N'},'f2f3'),
  f('existing-mate',{...legalShelter,f1:'R'},'f2f3'),
  f('cover-zero-horizon',shelter,'g2g3',[],{pawnCoverPlies:0}),
  f('no-mating-force',{...shelter,g4:undefined,f3:undefined},'g2g3'),
  f('outside-cover',{...shelter,a2:'P'},'a2a3'),
  f('outside-home-file',{h1:'K',a8:'k',g2:'P',h2:'P',h4:'q',g3:'b'},'h2h3'),
  f('cover-pawn-two-square',{...shelter,g4:undefined,d4:'q'},'g2g4'),
  f('zero-budget-weak',core,'e3e4',[],{maxPawnDefenseNodes:0}),
  f('zero-budget-cover',shelter,'g2g3',[],{maxPawnDefenseNodes:0}),
  f('atomic-budget-cover',shelter,'g2g3',[],{maxPawnDefenseNodes:5}),
];
const history = {fen:boardFen(core),moves:['a1b1','h7h8','b1a1','h8h7']};
const c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,'e3e4',[weak],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

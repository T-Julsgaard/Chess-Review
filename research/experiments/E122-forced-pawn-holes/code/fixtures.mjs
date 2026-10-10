import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const forced = 'causal-forced-pawn-response',hole = 'forced-irreversible-pawn-hole';
const core = {a8:'K',f5:'B',e2:'N',h1:'k',g1:'b',h2:'p',f4:'p'};
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'f5e4',forcedPawnTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('forced-permanent-hole',core,[forced,hole]),
  f('no-knight',{...core,e2:undefined},[forced]),
  f('unsafe-entry',{...core,e2:undefined,c2:'N'},[forced]),
  f('rank-bound-unavailable',{...core,g4:'p'},[forced]),
  f('remaining-pawn-attacks-target',{...core,h4:'p'},[forced]),
  f('other-pawn-block',{...core,g3:'p'},[forced]),
  f('nonpawn-defense',{...core,g1:'r'}),
  f('king-escape',{...core,h2:undefined}),
  f('wrong-actual-piece',core,[],{move:'e2c3'}),
  f('not-quiet-piece',{...core,a2:'P'},[],{move:'a2a3'}),
  f('zero-budget',core,[],{maxForcedPawnNodes:0}),
  f('atomic-budget',core,[],{maxForcedPawnNodes:20}),
];
const history = {fen:boardFen(core),moves:['a8b8','g1f2','b8a8','f2g1']},c = legalPosition(history.fen); for (const code of history.moves) c.move(code);
authored.push(f('known-history',core,[forced,hole],{history,fen:c.fen()}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

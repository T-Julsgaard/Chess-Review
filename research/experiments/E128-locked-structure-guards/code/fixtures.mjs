import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const core = {a5:'K',a3:'k',d3:'P',d5:'p'},guard = {e1:'K',g1:'k',d4:'P',d5:'p'};
const fixed = ['causal-blocked-pawn-fixation','locked-static-pawn-weakness','locked-structural-pawn-weakness'],guardIds = ['unique-locked-pawn-penetration-guard'];
const f = (id,p,expected=[],extra={}) => ({id,fen:boardFen(p),move:'d3d4',lockedStructureTags:true,scanReplies:false,expected,...extra});
const authored = [
  f('static-fixation',core,fixed),
  f('near-fixation',{c5:'K',c3:'k',d3:'P',d5:'p'},fixed),
  f('turn-dependent-fixation',{d8:'K',d6:'k',d3:'P',d5:'p'},['causal-blocked-pawn-fixation']),
  f('actual-safe',{e1:'K',g1:'k',d3:'P',d5:'p'}),
  f('escape-unsafe',{c6:'K',h1:'k',d3:'P',d5:'p'}),
  f('unique-guard',guard,guardIds,{fen:boardFen(guard,'b'),move:'g1g2'}),
  f('nonunique-guard',{...guard,g1:undefined,h8:'k'},[],{fen:boardFen({...guard,g1:undefined,h8:'k'},'b'),move:'h8g7'}),
  f('losing-guard',guard,[],{fen:boardFen(guard,'b'),move:'g1h1'}),
  f('clock-boundary-guard',guard,guardIds,{fen:boardFen(guard,'b').replace(' 0 1',' 90 1'),move:'g1g2'}),
  f('insufficient-clock',guard,[],{fen:boardFen(guard,'b').replace(' 0 1',' 91 1'),move:'g1g2'}),
  f('unlocked',{...core,d5:undefined,d6:'p'}),
  f('extra-pawn',{...core,h2:'P'}),
  f('zero-budget',core,[],{maxLockedStructureNodes:0}),
  f('atomic-budget',core,[],{maxLockedStructureNodes:130624}),
  f('inherited-correspondence',{d1:'K',g1:'k',d4:'P',d5:'p'},[],{move:'d1e1',correspondenceTags:true,maxLockedStructureNodes:0}),
  f('actual-draw',guard,[],{fen:boardFen(guard,'b').replace(' 0 1',' 99 1'),move:'g1g2'}),
];
const history = {fen:boardFen(core),moves:['a5b5','a3b3','b5a5','b3a3']},c = legalPosition(history.fen); for (const move of history.moves) c.move(move);
authored.push(f('irreversible-history-reset',core,fixed,{history,fen:c.fen()}));
const old = {fen:boardFen(guard,'b'),moves:['g1h1','e1d1','h1g1','d1e1']},p = legalPosition(old.fen); for (const move of old.moves) p.move(move);
authored.push(f('guard-history-unavailable',guard,[],{history:old,fen:p.fen(),move:'g1g2'}));
export const fixtures = authored.flatMap(x => [x,reflect(x)]);

import {Chess} from '../../../../lib/chess.js';
import {isDeepStrictEqual} from 'node:util';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkWitness as tempoCheck} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {checkWitness as defenseCheck} from '../../E169-passive-defense-counterplay/code/check-witness.mjs';
import {describe,flags} from '../../E152-causal-space-room/code/panel.mjs';
import {plain} from './plain.mjs';
const admitted=[];
export function controls(source,input,options){
  if(!['tempo','defense'].includes(source))throw Error('Expected tempo or defense source');
  if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['priorAlternative','priorPlies','priorTree','maxTurnoverNodes'].includes(k)))throw Error('Invalid turnover options');
  const limit=options.maxTurnoverNodes===undefined?50000:options.maxTurnoverNodes,H=options.priorPlies===undefined?0:options.priorPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000||!Number.isSafeInteger(H)||H<0||H>3)throw Error('Invalid turnover budget/horizon');
  if(options.priorAlternative!==undefined&&(typeof options.priorAlternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(options.priorAlternative)))throw Error('priorAlternative must be UCI');
  if(options.priorTree!==undefined&&(!options.priorTree||typeof options.priorTree!=='object'||Array.isArray(options.priorTree)))throw Error('Expected complete priorTree');
  const enabled=source==='tempo'?'forcingTempoTags':'defenseComparisonTags',cap=source==='tempo'?'maxForcingTempoNodes':'maxDefenseComparisonNodes';
  if(input[enabled]!==true)throw Error('Explicit enabled source required');
  const sourceCap=input[cap]===undefined?50000:input[cap];if(!Number.isSafeInteger(sourceCap)||sourceCap<0||sourceCap>50000)throw Error('Invalid source cap');
  const horizons=source==='tempo'?[['forcingTempoPlies',2,2]]:[['counterplayPlies',2,3],['passiveLossPlies',3,3]];
  for(const [key,fallback,max]of horizons){const h=input[key]===undefined?fallback:input[key];if(!Number.isSafeInteger(h)||h<0||h>max)throw Error('Invalid source horizon');}
  return{limit,H,key:source==='tempo'?'forcingTempoAnalysis':'defenseComparisonAnalysis'};
}
export function admit(source,input,result,w){
  const entry=[source,input,result];plain(entry);
  if(admitted.some(snapshot=>isDeepStrictEqual(snapshot,entry)))return;
  if(source==='tempo')tempoCheck(w,result,input);else defenseCheck(input,result);
  admitted.push(structuredClone(entry));
}
export function historyContext(input,H,alternative){
  const h=validateHistory(input);if(!h)return{status:'history-prerequisite'};
  if(!h.moves.length)return{status:'history-span-prerequisite'};
  const c=new Chess(h.start);for(const move of h.moves.slice(0,-1))c.move(move);
  const previousActor=c.turn(),prior={fen:c.fen(),actor:previousActor,flags:flags(c)};
  const priorInput={fen:c.fen(),history:{fen:input.history.fen,moves:h.moves.slice(0,-1)},move:alternative,retrogradeCalculationPlies:H};
  const preceding=h.moves.at(-1),actual=c.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===preceding);
  const previous=describe(actual);c.move(preceding);
  const actor=c.turn(),king=c.board().flat().find(p=>p?.type==='k'&&p.color===actor).square;
  const currentBefore={fen:c.fen(),actor,checked:c.isCheck(),flags:flags(c),checkers:c.attackers(king,previousActor).sort().map(square=>({square,...c.get(square)}))};
  const current=c.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===input.move);if(!current)throw Error('Current move must be legal');
  c.move(input.move);const currentAfter={fen:c.fen(),turn:c.turn(),flags:flags(c),checked:c.isCheck()};
  let status='ready',priorMove=null;
  if(alternative===undefined)status='prior-alternative-prerequisite';
  else if(alternative===preceding)status='prior-contrast-prerequisite';
  else{
    const earlier=new Chess(input.history.fen);for(const move of h.moves.slice(0,-1))earlier.move(move);
    const legal=earlier.moves({verbose:true}).find(m=>m.from+m.to+(m.promotion||'')===alternative);if(!legal)throw Error('Prior alternative must be legal');
    priorMove=describe(legal);earlier.move(alternative);if(!earlier.isCheck())status='prior-checking-prerequisite';
  }
  return{status,work:h.moves.length+1,actor,previousActor,priorInput,prior,previous,currentBefore,current:describe(current),currentAfter,priorMove};
}

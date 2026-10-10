import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function context(input,H){
  const h=validateHistory(input);if(!h)return{status:'history-prerequisite',work:3};
  const work=3+h.moves.length;
  for(const k of ['weaknessPawn','weaknessQuiet'])if(input[k]===undefined)return{status:k+'-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);
  if(c.isGameOver())return{status:'not-live',work};
  const actor=c.turn(),pawn=c.get(input.weaknessPawn),moves=c.moves({verbose:true});
  if(!pawn||pawn.type!=='p'||pawn.color===actor)throw Error('weaknessPawn must name enemy pawn');
  const actual=moves.find(m=>uci(m)===input.move),quiet=moves.find(m=>uci(m)===input.weaknessQuiet);
  if(!actual||!quiet||uci(actual)===uci(quiet)||actual.from!==quiet.from||quiet.captured||quiet.promotion||/[+#]/.test(quiet.san))throw Error('weaknessQuiet must be distinct legal quiet same-unit move');
  if(!/[+#]/.test(actual.san))return{status:'checking-move-prerequisite',work};
  const neighbors=c.board().flat().filter(p=>p&&p.type==='p'&&p.color===pawn.color&&Math.abs(p.square.charCodeAt(0)-input.weaknessPawn.charCodeAt(0))===1);
  if(!neighbors.length)return{status:'new-weakness-prerequisite',work};
  return{status:'ready',work,H,actor,input:{fen:input.fen,history:input.history,move:input.move,weaknessQuiet:input.weaknessQuiet,weaknessPawn:input.weaknessPawn,weaknessMatePlies:H}};
}

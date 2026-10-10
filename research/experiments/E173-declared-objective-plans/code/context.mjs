import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function context(i,H){
  const h=validateHistory(i),work=3+(h?.moves.length||0);
  if(!h)return{status:'history-prerequisite',work};
  for(const k of ['planObjective','planAlternative'])if(i[k]===undefined)return{status:k+'-prerequisite',work};
  if(i.planObjective.kind!=='rook-seventh-rank')return{status:'objective-kind-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);
  if(c.isGameOver())return{status:'not-live',work};
  const actor=c.turn(),unit=i.planObjective.unit;
  if(c.get(unit)?.type!=='r'||c.get(unit)?.color!==actor)throw Error('Objective unit must be own root rook');
  if(unit[1]===(actor==='w'?'7':'2'))return{status:'objective-already-met',work};
  const legal=c.moves({verbose:true}),actual=legal.find(m=>uci(m)===i.move),alt=legal.find(m=>uci(m)===i.planAlternative);
  if(!actual||!alt||i.move===i.planAlternative||actual.from!==alt.from||[actual,alt].some(m=>m.captured||m.promotion||/[+#]/.test(m.san)))throw Error('Plan requires distinct quiet same-unit first moves');
  return{status:'ready',work,actor,config:{fen:i.fen,history:i.history,move:i.move,alternative:i.planAlternative,objective:i.planObjective,plies:H}};
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function context(i){
  const h=validateHistory(i),work=3+(h?.moves.length||0);if(!h)return{status:'history-prerequisite',work};
  for(const k of ['improvementTarget','improvementAlternative'])if(i[k]===undefined)return{status:k+'-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);if(c.isGameOver())return{status:'not-live',work};
  if(c.get(i.improvementTarget)?.type!=='p'||c.get(i.improvementTarget)?.color===c.turn())throw Error('improvementTarget must name enemy pawn');
  const legal=c.moves({verbose:true}),a=legal.find(m=>uci(m)===i.move),b=legal.find(m=>uci(m)===i.improvementAlternative);
  if(!a||!b||i.move===i.improvementAlternative||a.from!==b.from||[a,b].some(m=>!['n','b','r','q'].includes(m.piece)||m.captured||m.promotion||/[+#]/.test(m.san)))throw Error('Improvement requires distinct quiet same-unit piece moves');
  return{status:'ready',work};
}

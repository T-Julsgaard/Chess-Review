import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function context(i,H){
  const h=validateHistory(i),work=3+(h?.moves.length||0);if(!h)return{status:'history-prerequisite',work};for(const k of ['counterthreatVictim','counterthreatAlternative'])if(i[k]===undefined)return{status:k+'-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);if(c.isGameOver())return{status:'not-live',work};if(c.isCheck())return{status:'quiet-root-prerequisite',work};
  const actor=c.turn(),target=c.get(i.counterthreatVictim);if(!target||target.color!==actor||target.type==='k')throw Error('counterthreatVictim must name own nonking piece');
  const rootAttackers=c.attackers(i.counterthreatVictim,actor==='w'?'b':'w').sort().map(square=>({square,type:c.get(square).type}));if(!rootAttackers.length)return{status:'attacked-victim-prerequisite',work};
  const legal=c.moves({verbose:true}),pair=[i.move,i.counterthreatAlternative].sort().map(code=>legal.find(m=>uci(m)===code));if(pair.some(m=>!m)||i.move===i.counterthreatAlternative||pair[0].from!==pair[1].from||pair.some(m=>m.from===i.counterthreatVictim||m.captured||m.promotion||/[+#]/.test(m.san)))throw Error('Counterthreat pair must be distinct legal quiet same-unit moves preserving victim');
  return{status:'ready',work,config:{fen:i.fen,history:i.history,moves:pair.map(uci),victim:i.counterthreatVictim,plies:H},rootAttackers};
}

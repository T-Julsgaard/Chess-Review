import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function panelContexts(input,H){
  const h=validateHistory(input);if(!h)return null;const c=legalPosition(h.start);for(const move of h.moves)c.move(move);
  const current={fen:c.fen(),history:input.history,move:input.move,forcingTempoPlies:H};let previous=null;
  if(h.records.length>=2){const r=h.records.at(-2);if(r.move.color!==c.turn())throw Error('Previous decision actor differs');previous={fen:r.before,history:{fen:h.start,moves:h.moves.slice(0,-2)},move:uci(r.move),forcingTempoPlies:H};}
  return{current,previous,actor:c.turn(),live:!c.isGameOver()};
}

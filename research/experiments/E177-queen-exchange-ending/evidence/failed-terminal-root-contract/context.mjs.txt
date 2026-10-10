import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function context(i,H){
  const h=validateHistory(i),work=3+(h?.moves.length||0);
  if(!h)return{status:'history-prerequisite',work};
  if(i.endingAlternative===undefined)return{status:'alternative-prerequisite',work};
  if(H!==2)return{status:'horizon-prerequisite',work};
  const c=legalPosition(h.start);for(const m of h.moves)c.move(m);
  if(c.isGameOver())return{status:'not-live',work};
  const actor=c.turn(),army=c.board().flat().filter(Boolean);
  if(army.length!==5||army.filter(p=>p.type==='q'&&p.color===actor).length!==1||army.filter(p=>p.type==='q'&&p.color!==actor).length!==1||army.filter(p=>p.type==='r'&&p.color===actor).length!==1)return{status:'material-prerequisite',work};
  const legal=c.moves({verbose:true}),a=legal.find(m=>uci(m)===i.move),b=legal.find(m=>uci(m)===i.endingAlternative);
  if(!a||!b||i.move===i.endingAlternative||a.piece!=='q'||a.captured!=='q'||a.promotion||b.captured||b.promotion)throw Error('Ending comparison requires actual queen capture and distinct noncapture alternative');
  return{status:'ready',work,actor,config:{fen:i.fen,history:i.history,move:i.move,alternative:i.endingAlternative,plies:H}};
}

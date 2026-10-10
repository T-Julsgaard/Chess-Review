import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
function claims(c,n,tick){
  tick();if(n.kind==='draw')return c.isDrawByFiftyMoves()||c.isThreefoldRepetition();if(['mate','limit'].includes(n.kind))return false;
  let yes=false;for(const b of n.child?[{move:n.move,child:n.child}]:n.branches){tick();c.move(b.move);try{yes=claims(c,b.child,tick)||yes;}finally{c.undo();}}return yes;
}
export function collectPanel(input,H,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('forcing-tempo-budget');};
  tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){tick();c.move(m);}
  const traced=winner=>{const searchTrace=[];let searchClaim=false;const q=query(c,winner,H,{tick(){tick();searchTrace.push(c.fen());if(!c.isCheckmate()&&(c.isDrawByFiftyMoves()||c.isThreefoldRepetition()))searchClaim=true;}});return{...q,searchTrace,searchClaim};};
  const actor=c.turn(),opponent=actor==='w'?'b':'w',panel={schema:'E143-complete-mate-panel-v2',before:c.fen(),actor,history:input.history||null,plies:H,rows:[],claimContext:null,nodes:0};
  for(const m of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){
    tick();c.move(uci(m));try{
      const row={move:uci(m),san:m.san,after:c.fen(),from:m.from,piece:m.piece,capture:!!m.captured,promotion:!!m.promotion,check:c.isCheck(),mate:c.isCheckmate(),actor:traced(actor),opponent:traced(opponent)};panel.rows.push(row);
      const ownClaim=claims(c,row.actor.tree,tick),enemyClaim=claims(c,row.opponent.tree,tick);if(ownClaim||enemyClaim||row.actor.searchClaim||row.opponent.searchClaim){panel.claimContext=row.move;break;}
    }finally{c.undo();}
  }
  tick();panel.nodes=nodes;return panel;
}

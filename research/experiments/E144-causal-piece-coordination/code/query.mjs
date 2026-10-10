import {query} from '../../E029-forced-mates/code/mates.mjs';
export function tracedQuery(c,winner,H,tick){
  const searchTrace=[];let searchClaim=false;
  const proof=query(c,winner,H,{tick(){tick();searchTrace.push(c.fen());if((c.isDrawByFiftyMoves()||c.isThreefoldRepetition())&&!c.isCheckmate())searchClaim=true;}});
  return{...proof,searchTrace,searchClaim};
}

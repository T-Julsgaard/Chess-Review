import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export function collectTree(input,H,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('retrograde-budget');};tick();const h=validateHistory(input);if(!h)throw Error('Full history required');const c=legalPosition(h.start);for(const move of h.moves){tick();c.move(move);}if(c.isGameOver())throw Error('History-terminal position');const before=c.fen(),actor=c.turn();tick();const played=c.move(input.move),after=c.fen(),tree=[],claimNodes=[];
  function visit(remaining){
    tick();const id=tree.length,n={id,fen:c.fen(),turn:c.turn(),remaining,kind:null,outcome:null,edges:[]};tree.push(n);
    if(c.isCheckmate()){n.kind='mate';n.outcome=c.turn()==='w'?'b':'w';}
    else if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition()){n.kind='claim';claimNodes.push(id);}
    else if(c.isStalemate()||c.isInsufficientMaterial()){n.kind='draw';n.outcome='draw';}
    else if(!remaining)n.kind='limit';
    else{n.kind='branch';tick();for(const m of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){tick();c.move(uci(m));let child;try{child=visit(remaining-1);}finally{c.undo();}n.edges.push({move:uci(m),san:m.san,child});}}
    return id;
  }
  visit(H);return{schema:'E146-complete-continuation-tree-v1',before,after,history:input.history,played:uci(played),san:played.san,actor,plies:H,tree,claimNodes,nodes};
}

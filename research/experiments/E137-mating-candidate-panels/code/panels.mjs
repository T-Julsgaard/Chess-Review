import {uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
function claims(c,n,budget){budget.tick();if(n.kind==='draw')return Number(c.isDrawByFiftyMoves()||c.isThreefoldRepetition());if(n.kind==='limit'||n.kind==='mate')return 0;let total=0;for(const b of n.child?[{move:n.move,child:n.child}]:n.branches){budget.tick();c.move(b.move);try{total+=claims(c,b.child,budget);}finally{c.undo();}}return total;}
export function assess(c,winner,H,budget){
  const a={rootFen:c.fen(),winner,bound:H,queries:[],distance:null,claimLeaves:0,status:'unresolved-within-bound'};
  for(let d=0;d<=H;d++){const q=query(c,winner,d,budget);a.queries.push(q);a.claimLeaves+=claims(c,q.tree,budget);if(a.claimLeaves){a.status='claim-rule-prerequisite';return a;}if(q.tree.win){a.distance=d;a.status='proven';return a;}if(c.isGameOver()){a.status='terminal-without-mate';return a;}}
  return a;
}
// Derive the exact child bounds from the winning choice and all shorter failures.
function ownChild(a,move,fen){
  const D=a.distance,queries=[];for(let d=0;d<D;d++){const source=a.queries[d+1].tree,child=d===D-1?source.child:source.branches.find(b=>b.move===move)?.child;if(!child)throw Error('Missing derived child proof');queries.push({rootFen:fen,winner:a.winner,plies:d,tree:child});}
  return {rootFen:fen,winner:a.winner,bound:D-1,queries,distance:D-1,claimLeaves:0,status:'proven'};
}
export function variation(c,winner,initial,budget){
  const steps=[];let a=initial;
  while(true){budget.tick();const d=a.distance,step={fen:c.fen(),turn:c.turn(),distance:d,assessment:a,defenses:[],bestReplies:[],move:null,san:null,after:null};steps.push(step);if(d===0){if(!c.isCheckmate()||c.turn()===winner)throw Error('PV is not mate');return {steps,claim:null};}
    let move,next;
    if(c.turn()===winner){move=a.queries.at(-1).tree.move;if(!move)throw Error('PV lacks own choice');}
    else {
      for(const m of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){budget.tick();c.move(uci(m));let child;try{child=assess(c,winner,d-1,budget);step.defenses.push({move:uci(m),san:m.san,after:c.fen(),assessment:child});}finally{c.undo();}if(child.claimLeaves)return {steps,claim:{step:steps.length-1,defense:step.defenses.length-1}};if(child.distance===null)throw Error('Winning PV has unresolved defense');}
      const longest=Math.max(...step.defenses.map(r=>r.assessment.distance));if(longest!==d-1)throw Error('Inexact defender distance');step.bestReplies=step.defenses.filter(r=>r.assessment.distance===longest).map(r=>r.move);move=step.bestReplies[0];next=step.defenses.find(r=>r.move===move).assessment;
    }
    budget.tick();const m=c.move(move);step.move=move;step.san=m.san;step.after=c.fen();a=next||ownChild(a,move,c.fen());
  }
}

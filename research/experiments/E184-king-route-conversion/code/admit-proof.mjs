import assert from 'node:assert/strict';
import {checkConversion} from '../../E106-ending-conversion-policies/code/check-policy.mjs';
// Frozen independent E106 checker admits semantics. Extra walk accounts EXACT
// search ticks and observes optional-claim contexts including queen replies.
export function admitProof(q,c,actor,pawn,H,baseline){
 assert.equal(q.actor,actor);assert.equal(q.pawn,pawn);assert.equal(q.plies,H);assert.equal(q.baselineFen,baseline);
 checkConversion(q,c);let cost=0,claims=false;
 function visit(n){
  cost++;claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();
  for(const r of n.probe?.responses||[]){cost++;c.move(r.move);try{claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();}finally{c.undo();}}
  const edges=n.child?[{move:n.move,child:n.child}]:(n.branches||[]);
  for(const e of edges){cost++;c.move(e.move);try{visit(e.child);}finally{c.undo();}}
 }
 visit(q.tree);return{cost,claims};
}

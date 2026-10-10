import assert from 'node:assert/strict';
import {checkConversion} from '../../E106-ending-conversion-policies/code/check-policy.mjs';
// Frozen independent E106 checker admits semantics. Extra walk accounts EXACT
// search ticks and observes optional-claim contexts including queen replies.
export function admitProof(q,c,actor,pawn,H,baseline){
 assert.equal(q.actor,actor);assert.equal(q.pawn,pawn);assert.equal(q.plies,H);assert.equal(q.baselineFen,baseline);
 checkConversion(q,c);let cost=0,claims=false;
 function visit(n,left){
  cost++;claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();
  for(const r of n.probe?.responses||[]){cost++;c.move(r.move);try{claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();}finally{c.undo();}}
  let edges=n.branches||[];
  if(n.child){
   assert.ok(Array.isArray(n.tried),'Complete attempted prefix required');
   assert.deepEqual(n.tried.map(e=>e.move),n.moves.slice(0,n.moves.indexOf(n.move)));
   for(const e of n.tried)assert.equal(e.child.win,!n.win);
   edges=[...n.tried,{move:n.move,child:n.child}];
  }else assert.equal(n.tried,undefined);
  for(const e of edges){cost++;c.move(e.move);try{
   if(n.tried?.includes(e)){
    if(e.child.square===null){assert.ok(c.isInsufficientMaterial());assert.equal(e.child.kind,'draw');assert.equal(e.child.win,false);}
    else checkConversion({...q,rootFen:c.fen(),pawn:e.child.square,plies:left-1,win:e.child.win,tree:e.child},c);
   }
   visit(e.child,left-1);
  }finally{c.undo();}}
 }
 visit(q.tree,H);return{cost,claims};
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const code=m=>m.from+m.to+(m.promotion||'');
function board(input){const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves)c.move(m);return c;}
function tree(c,winner,remaining,node,counts){
 counts.nodes++;assert.equal(typeof node.win,'boolean');
 if(c.isCheckmate()){assert.equal(node.kind,'mate');assert.equal(node.win,c.turn()!==winner);assert.equal(node.fen,c.fen());counts.leaves++;return node.win;}
 if(c.isDraw()){assert.equal(node.kind,'draw');assert.equal(node.win,false);assert.equal(node.fen,c.fen());counts.leaves++;return false;}
 if(remaining===0){assert.equal(node.kind,'limit');assert.equal(node.win,false);assert.equal(node.fen,c.fen());counts.leaves++;return false;}
 assert.ok(remaining>0);const legal=c.moves({verbose:true}),attacker=c.turn()===winner,all=attacker?!node.win:node.win;
 const apply=(move,child)=>{const m=legal.find(m=>code(m)===move);assert.ok(m,'Illegal tree edge '+move);c.move(m);try{return tree(c,winner,remaining-1,child,counts);}finally{c.undo();}};
 if(all){assert.equal(node.kind,attacker?'all-fail':'all');assert.deepEqual(node.branches.map(b=>b.move).sort(),legal.map(code).sort());assert.ok(legal.length);for(const b of node.branches){counts.replies++;assert.equal(apply(b.move,b.child),node.win);}}
 else{assert.equal(node.kind,attacker?'choice':'counterchoice');assert.equal(node.win,attacker);counts.replies++;assert.equal(apply(node.move,node.child),node.win);}
 return node.win;
}
export function replayQuery(c,proof){assert.equal(proof.rootFen,c.fen());assert.ok(['w','b'].includes(proof.winner));assert.ok(Number.isInteger(proof.plies)&&proof.plies>=0&&proof.plies<=5);const counts={nodes:0,replies:0,leaves:0};const win=tree(c,proof.winner,proof.plies,proof.tree,counts);return{...counts,win};}
export function replay(fixture,event){
 const before=board(fixture),after=board(fixture),played=after.move(fixture.move),e=event.evidence,n=e.mateIn;assert.ok(n>=1&&n<=3);const counts={replies:0,leaves:0,nodes:0};
 const check=(c,p,plies,win)=>{assert.equal(p.winner,played.color);assert.equal(p.plies,plies);const r=replayQuery(c,p);assert.equal(r.win,win);for(const k of ['replies','leaves','nodes'])counts[k]+=r[k];};
 if(event.id==='forced-mate'){assert.ok(n===2||n===3);check(after,e.proof,2*n-2,true);assert.deepEqual(e.shorterFailures.map(a=>a.mateIn),n===3?[2]:[]);for(const a of e.shorterFailures)check(after,a.proof,2*a.mateIn-2,false);
  const line=e.continuation;if(line.kind==='unique'){const c=board(fixture);c.move(fixture.move);let node=e.proof.tree;for(const step of line.moves){let move,child;if(c.turn()===played.color){assert.equal(node.kind,'choice');move=node.move;child=node.child;}else{assert.equal(node.kind,'all');assert.equal(node.branches.length,1);move=node.branches[0].move;child=node.branches[0].child;}assert.equal(step.move,move);assert.equal(step.turn,c.turn());assert.equal(step.san,c.move(move).san);node=child;}assert.equal(node.kind,'mate');assert.ok(c.isCheckmate());}
  else if(line.kind==='shared-mate'){assert.equal(n,2);assert.equal(line.replies,e.proof.tree.branches.length);for(const b of e.proof.tree.branches){const c=board(fixture);c.move(fixture.move);c.move(b.move);assert.equal(b.child.kind,'choice');assert.equal(b.child.move,line.move);assert.equal(c.move(line.move).san,line.san);assert.ok(c.isCheckmate());}}
  else{assert.equal(line.kind,'branching');assert.equal(line.replies,e.proof.tree.branches.length);}
 }
 else{assert.equal(event.id,'missed-mate');assert.equal(e.played,code(played));assert.notEqual(e.alternative,e.played);assert.equal(e.proof.tree.move,e.alternative);const move=before.moves({verbose:true}).find(m=>code(m)===e.alternative);assert.ok(move);assert.equal(e.san,move.san);assert.equal(e.stalemate,after.isStalemate());check(before,e.proof,2*n-1,true);check(after,e.playedFailure,2*n-2,false);}
 return counts;
}

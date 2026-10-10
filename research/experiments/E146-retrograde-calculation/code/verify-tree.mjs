import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const uci=m=>m.from+m.to+(m.promotion||'');
// Legal full-tree admission only: no collector, outcome pass or goal solver imports.
export function verifyTree(input,g){
  assert.equal(g.schema,'E146-complete-continuation-tree-v1');assert.ok(input.history);assert.deepEqual(g.history,input.history);assert.equal(g.plies,input.retrogradeCalculationPlies??2);assert.ok(Array.isArray(g.tree)&&g.tree.length>0&&g.tree.length<=50000);
  const c=new Chess(input.history.fen);assert.ok(Array.isArray(input.history.moves)&&input.history.moves.length<=1000);for(const code of input.history.moves){assert.equal(c.isGameOver(),false);assert.match(code,/^[a-h][1-8][a-h][1-8][qrbn]?$/);c.move(code);}assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(c.isGameOver(),false);assert.equal(g.before,c.fen());assert.equal(g.actor,c.turn());const played=c.move(input.move);assert.equal(g.played,uci(played));assert.equal(g.san,played.san);assert.equal(g.after,c.fen());let next=0,nodes=2+input.history.moves.length;const claimNodes=[];
  function walk(id,remaining){
    assert.equal(id,next++);const n=g.tree[id];assert.ok(n);nodes++;assert.equal(n.id,id);assert.equal(n.fen,c.fen());assert.equal(n.turn,c.turn());assert.equal(n.remaining,remaining);
    let kind,outcome=null;if(c.isCheckmate()){kind='mate';outcome=c.turn()==='w'?'b':'w';}else if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition()){kind='claim';claimNodes.push(id);}else if(c.isStalemate()||c.isInsufficientMaterial()){kind='draw';outcome='draw';}else kind=remaining?'branch':'limit';assert.equal(n.kind,kind);assert.equal(n.outcome,outcome);
    if(kind!=='branch'){assert.deepEqual(n.edges,[]);return;}nodes++;const legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));assert.ok(legal.length);assert.equal(n.edges.length,legal.length);
    for(const [i,m]of legal.entries()){nodes++;const e=n.edges[i];assert.equal(e.move,uci(m));assert.equal(e.san,m.san);c.move(e.move);try{walk(e.child,remaining-1);}finally{c.undo();}}
  }
  walk(0,g.plies);assert.equal(next,g.tree.length);assert.deepEqual(g.claimNodes,claimNodes);assert.equal(g.nodes,nodes);return{nodes,actor:g.actor,after:g.after,claimNodes};
}

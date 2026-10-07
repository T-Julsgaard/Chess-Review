import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
export function replay(f,event){
 assert.equal(event.id,'quiet-mating-net');assert.equal(event.qualityClaim,false);const c=new Chess(f.history?.fen||f.fen);if(f.history)for(const m of f.history.moves){assert.ok(!c.isGameOver());c.move(m);}assert.equal(c.fen(),new Chess(f.fen).fen());assert.ok(!c.isGameOver());const m=c.move(f.move),e=event.evidence;
 assert.ok(!m.captured&&!m.promotion);assert.equal(e.played,m.from+m.to);assert.equal(e.afterFen,c.fen());assert.ok(!c.isCheck()&&!c.isGameOver());assert.equal(e.proof.winner,m.color);assert.equal(e.proof.plies,2);assert.equal(e.proof.tree.kind,'all');assert.equal(e.replyCount,c.moves().length);const checked=replayQuery(c,e.proof);assert.equal(checked.win,true);
 const legal=c.moves({verbose:true}).map(m=>m.from+m.to+(m.promotion||'')).sort();assert.deepEqual(e.proof.tree.branches.map(b=>b.move).sort(),legal);
 for(const b of e.proof.tree.branches){c.move(b.move);try{assert.equal(b.child.kind,'choice');c.move(b.child.move);try{assert.ok(c.isCheckmate());assert.equal(c.turn(),m.color==='w'?'b':'w');}finally{c.undo();}}finally{c.undo();}}
 return{passed:true,replies:checked.replies,leaves:checked.leaves};
}

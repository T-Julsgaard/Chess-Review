import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const values={p:1,n:3,b:3,r:5,q:9,k:0},code=m=>m.from+m.to+(m.promotion||''),victim=m=>m.flags.includes('e')?m.to[0]+m.from[1]:m.to;
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===color?1:-1),0);
export const intermediateIds=new Set(['intermediate-check','intermediate-capture','intermediate-mate']);
export function replay(f,event){
 assert.ok(intermediateIds.has(event.id));assert.ok(f.history);const before=new Chess(f.history.fen);let last;
 for(const u of f.history.moves){assert.ok(!before.isGameOver());last=before.moves({verbose:true}).find(m=>code(m)===u);assert.ok(last);before.move(u);}
 assert.equal(before.fen(),f.fen);assert.ok(last?.captured&&!last.promotion);const e=event.evidence;
 assert.deepEqual(e.history,{start:f.history.fen,moves:f.history.moves});assert.deepEqual(e.prior,{move:code(last),piece:last.piece,captured:last.captured,square:last.to});
 const direct=before.moves({verbose:true}).filter(m=>m.captured&&victim(m)===last.to).map(code);assert.ok(direct.length);assert.deepEqual([...e.directRecaptures].sort(),direct.sort());
 const played=before.move(f.move);assert.equal(e.played,code(played));assert.ok(!played.captured||victim(played)!==last.to);const after=before,counts={replies:0,leaves:0,nodes:0};
 if(event.id==='intermediate-mate'){assert.ok(after.isCheckmate());assert.equal(e.afterFen,after.fen());counts.leaves++;return counts;}
 assert.ok(!after.isGameOver());if(event.id==='intermediate-check')assert.ok(after.isCheck());else{assert.ok(played.captured);assert.ok(!after.isCheck());}
 const p=e.proof;assert.equal(p.baselineFen,after.fen());assert.equal(p.color,played.color);assert.equal(p.initialBalance,balance(after,played.color));assert.equal(p.horizonPliesAfterMove,3);
 const replies=after.moves({verbose:true});assert.deepEqual(p.witnesses.map(w=>w.reply).sort(),replies.map(code).sort());assert.ok(replies.length);
 for(const w of p.witnesses){counts.replies++;counts.nodes++;const reply=replies.find(r=>code(r)===w.reply);after.move(reply);try{
  assert.ok(!after.isGameOver());const square=reply.from===last.to?reply.to:last.to,piece=after.get(square);assert.ok(piece&&piece.color!==played.color);assert.deepEqual(w.target,{square,type:piece.type});
  const capture=after.moves({verbose:true}).find(m=>code(m)===w.recapture);assert.ok(capture?.captured&&victim(capture)===square);after.move(capture);try{
   assert.equal(w.terminalMate,after.isCheckmate());if(w.terminalMate){assert.equal(w.worstGain,null);assert.deepEqual(w.responses,[]);counts.leaves++;continue;}
   assert.ok(!after.isDraw());const counters=after.moves({verbose:true});assert.deepEqual(w.responses.map(r=>r.move).sort(),counters.map(code).sort());assert.ok(counters.length);let minimum=Infinity;
   for(const r of w.responses){counts.replies++;counts.leaves++;const counter=counters.find(m=>code(m)===r.move);after.move(counter);try{assert.ok(!after.isGameOver());const gain=balance(after,played.color)-p.initialBalance;assert.equal(r.gain,gain);assert.ok(gain>0);minimum=Math.min(minimum,gain);}finally{after.undo();}}
   assert.equal(w.worstGain,minimum);
  }finally{after.undo();}
 }finally{after.undo();}}
 return counts;
}

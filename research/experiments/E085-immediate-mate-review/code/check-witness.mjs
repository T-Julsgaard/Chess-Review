// Focused independent legal move/terminal checker, not candidate/query code.
import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const uci=m=>m.from+m.to+(m.promotion||'');
const record=m=>({uci:uci(m),san:m.san,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
function scan(fen){
 const c=new Chess(fen);if(c.isGameOver())return{fen,terminal:true,moves:[],mates:[]};
 const moves=[];for(const m of c.moves({verbose:true})){c.move(uci(m));moves.push({...record(m),fen:c.fen(),check:c.isCheck(),mate:c.isCheckmate(),draw:c.isDraw(),terminal:c.isGameOver()});c.undo();}
 return{fen,terminal:false,moves,mates:moves.filter(m=>m.mate).map(m=>m.uci)};
}
export function checkWitness(w){
 const c=new Chess(w.history?.fen||w.before);for(const m of w.history?.moves||[]){assert.ok(!c.isGameOver());c.move(m);}
 assert.equal(c.fen(),w.before);assert.equal(c.turn(),w.actor);assert.deepEqual(scan(w.before),w.root);
 const played=c.move(w.played.uci);assert.deepEqual(record(played),w.played);assert.equal(c.fen(),w.after);assert.deepEqual(scan(w.after),w.actual);
 if(w.beforeOpponent){const parts=w.before.split(' ');parts[1]=w.actor==='w'?'b':'w';parts[3]='-';assert.deepEqual(scan(parts.join(' ')),w.beforeOpponent);}
 if(w.alternatives.length){assert.deepEqual(w.alternatives.map(a=>a.move),w.root.moves.map(m=>m.uci));
  for(const alt of w.alternatives){const c=new Chess(w.before);c.move(alt.move);assert.deepEqual(scan(c.fen()),alt.replyScan);}}
 if(w.missedProof){assert.ok(w.root.mates.length);assert.ok(!new Chess(w.after).isCheckmate());
  const p=w.missedProof.proof;assert.equal(p.rootFen,w.before);assert.equal(p.winner,w.actor);assert.equal(p.plies,1);
  assert.equal(p.tree.kind,'choice');assert.equal(p.tree.win,true);assert.ok(w.root.mates.includes(p.tree.move));
  const alt=new Chess(w.before);alt.move(p.tree.move);assert.ok(alt.isCheckmate());assert.equal(p.tree.child.fen,alt.fen());assert.equal(p.tree.child.kind,'mate');assert.equal(p.tree.child.win,true);}
 return true;
}

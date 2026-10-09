import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const uci=m=>m.from+m.to+(m.promotion||'');
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
function scan(fen){const c=new Chess(fen),moves=[];for(const m of c.moves({verbose:true})){c.move(uci(m));moves.push({...record(m),after:c.fen(),terminal:c.isGameOver()});c.undo();}return{fen:c.fen(),check:c.isCheck(),moves};}
const steps=s=>s.moves.filter(m=>m.piece==='k'&&!m.flags.includes('k')&&!m.flags.includes('q')).map(m=>m.to).sort();
export function checkWitness(w){
 const c=new Chess(w.history?.fen||w.before);for(const m of w.history?.moves||[]){assert.ok(!c.isGameOver());c.move(m);}
 assert.equal(c.fen(),w.before);assert.deepEqual(scan(w.before),w.root);const played=c.move(w.played.uci);
 assert.deepEqual(record(played),w.played);assert.equal(c.fen(),w.after);assert.deepEqual(scan(w.after),w.actual);
 if(w.beforeEnemy){const parts=w.before.split(' ');parts[1]=w.enemy;parts[3]='-';assert.deepEqual(scan(parts.join(' ')),w.beforeEnemy);}
 if(w.removedAfter){const removed=new Chess(w.after);removed.remove(w.played.to);const parts=removed.fen().split(' ');parts[1]=w.enemy;parts[3]='-';assert.deepEqual(scan(parts.join(' ')),w.removedAfter);}
 if(w.actorAfter){const parts=w.after.split(' ');parts[1]=w.actor;parts[3]='-';assert.deepEqual(scan(parts.join(' ')),w.actorAfter);
  assert.deepEqual(steps(w.actorAfter).filter(s=>!steps(w.root).includes(s)),w.escapeSquares);}
 if(w.beforeEnemy&&w.removedAfter){const before=steps(w.beforeEnemy),actual=steps(w.actual),without=steps(w.removedAfter);
  const denied=before.filter(s=>!actual.includes(s)&&without.includes(s)&&c.attackers(s,w.actor).includes(w.played.to));assert.deepEqual(denied,w.denied);
  const cutoff=['r','q'].includes(w.played.promotion||w.played.piece)?denied.filter(s=>s[0]===w.played.to[0]||s[1]===w.played.to[1]):[];assert.deepEqual(cutoff,w.cutoffs);
  const castle=s=>s.moves.filter(m=>m.flags.includes('k')||m.flags.includes('q')).map(m=>m.uci),expected=[];
  for(const move of castle(w.beforeEnemy)){if(castle(w.actual).includes(move)||!castle(w.removedAfter).includes(move))continue;
   const rank=w.enemy==='w'?'1':'8',squares=move[2]==='g'?['e'+rank,'f'+rank,'g'+rank]:['e'+rank,'d'+rank,'c'+rank];
   const attacked=squares.filter(s=>c.attackers(s,w.actor).includes(w.played.to));if(attacked.length)expected.push({uci:move,attacked});}
  assert.deepEqual(expected,w.preventedCastles);
 }
 return true;
}

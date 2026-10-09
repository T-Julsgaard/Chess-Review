// Focused witness checks use chess.js directly, not the candidate's helpers.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const inventory=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square));
export function checkWitness(w) {
 const c=new Chess(w.history?.fen||w.before);
 for(const m of w.history?.moves||[]){assert.ok(!c.isGameOver());c.move(m);}
 assert.equal(c.fen(),w.before);assert.deepEqual(inventory(c),w.beforePieces);
 const root=new Chess(w.before),move=c.move(w.played.uci);assert.equal(move.san,w.played.san);
 assert.equal(c.fen(),w.after);assert.deepEqual(inventory(c),w.afterPieces);assert.ok(!c.isGameOver());
 assert.deepEqual(inventory(root).filter(p=>p.type==='p'),w.beforePawns);
 assert.deepEqual(inventory(c).filter(p=>p.type==='p'),w.afterPawns);
 if(w.hypotheticalActorFen){
  const parts=w.after.split(' ');parts[1]=w.actor;parts[3]='-';assert.equal(parts.join(' '),w.hypotheticalActorFen);
  const hypothetical=new Chess(w.hypotheticalActorFen);
  const targets=hypothetical.moves({verbose:true}).filter(m=>m.from===move.to&&m.captured&&!m.flags.includes('e')&&!root.attackers(m.to,w.actor).includes(move.from));
  const squares=[...new Set(targets.map(m=>m.to))].sort();assert.deepEqual(w.contacts.map(t=>t.square),squares);
  for(const t of w.contacts){const m=targets.find(m=>m.from+m.to+(m.promotion||'')===t.capture);assert.ok(m);assert.equal(m.captured,t.type);}
 }
 if(w.exchange){
  const e=w.exchange,h=new Chess(e.previousBefore),previous=h.move(e.previous);
  assert.equal(h.fen(),e.previousAfter);assert.equal(e.previousAfter,w.before);
  assert.equal(previous.to,move.to);assert.equal(previous.piece,move.captured);
  assert.equal(previous.captured,e.lost);assert.equal(move.captured,e.captured);
  assert.equal(inventory(new Chess(e.previousBefore)).filter(p=>!['k','p'].includes(p.type)).length,e.prePairCount);
  assert.equal(inventory(c).filter(p=>!['k','p'].includes(p.type)).length,e.afterCount);
 }
 return true;
}

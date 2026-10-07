import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export function replay(f,event){
 assert.equal(event.id,'pawn-blockade');assert.equal(event.qualityClaim,false);
 const e=event.evidence,c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.ok(!c.isGameOver());assert.equal(e.beforeFen,c.fen());
 const played=record(c,f.move);assert.deepEqual(e.played,played);assert.equal(e.afterFen,c.fen());assert.ok(!c.isGameOver());
 const unit=c.get(played.to);assert.ok(unit&&unit.color===played.color&&'nbrqk'.includes(unit.type));assert.deepEqual(e.blocker,{square:played.to,...unit});
 const p=e.pawn;assert.equal(p.type,'p');assert.notEqual(p.color,unit.color);assert.match(p.square,/^[a-h][2-7]$/);assert.equal(p.square[0],played.to[0]);assert.equal(+p.square[1]+(p.color==='w'?1:-1),+played.to[1]);assert.deepEqual(c.get(p.square),{type:p.type,color:p.color});assert.deepEqual(new Chess(e.beforeFen).get(p.square),{type:p.type,color:p.color});
 const replies=c.moves({verbose:true}).map(m=>record(new Chess(c.fen()),code(m)));assert.deepEqual(e.replies,replies);assert.ok(replies.length);
 assert.ok(!replies.some(r=>r.from===p.square&&r.to[0]===p.square[0]));
 assert.deepEqual(e.pawnCaptures,replies.filter(r=>r.from===p.square&&r.captured).map(r=>r.move).sort());assert.deepEqual(e.blockerCaptures,replies.filter(r=>r.to===played.to&&r.captured).map(r=>r.move).sort());
 const names={n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King'};assert.equal(event.text,`${names[unit.type]} blockade: ${played.san} occupies ${played.to} directly ahead of pawn ${p.square}, preventing its straight advance.`);assert.ok(event.text.split(/\s+/).length<=24);
 return{passed:true,replies:replies.length,leaves:replies.length,pawnCaptures:e.pawnCaptures.length,blockerCaptures:e.blockerCaptures.length};
}

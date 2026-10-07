import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export function replay(f,event){
 assert.ok(['wrong-colored-bishop','wrong-rook-pawn-corner'].includes(event.id));assert.equal(event.qualityClaim,false);const e=event.evidence,c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.equal(e.beforeFen,c.fen());assert.ok(!c.isGameOver());const played=record(c,f.move);assert.deepEqual(e.played,played);assert.equal(e.afterFen,c.fen());assert.ok(!c.isGameOver());
 const pieces=c.board().flat().filter(Boolean);assert.equal(pieces.length,4);assert.equal(pieces.filter(p=>p.type==='b').length,1);assert.equal(pieces.filter(p=>p.type==='p').length,1);assert.equal(pieces.filter(p=>p.type==='k').length,2);
 assert.deepEqual(e.material,pieces.map(p=>p.color+p.type+'@'+p.square).sort());const b=pieces.find(p=>p.type==='b'),p=pieces.find(p=>p.type==='p');assert.equal(b.color,p.color);assert.ok(['a','h'].includes(p.square[0]));const a=pieces.find(q=>q.type==='k'&&q.color===p.color),d=pieces.find(q=>q.type==='k'&&q.color!==p.color),identity=q=>({square:q.square,type:q.type,color:q.color});
 for(const [field,q]of [['bishop',b],['pawn',p],['attackingKing',a],['defendingKing',d]])assert.deepEqual(e[field],identity(q));
 const square=p.square[0]+(p.color==='w'?'8':'1'),color=s=>(s.charCodeAt(0)+Number(s[1]))%2;assert.equal(e.promotionSquare,square);assert.equal(e.bishopColor,color(b.square));assert.equal(e.cornerColor,color(square));assert.notEqual(color(b.square),color(square));
 assert.ok(!c.attackers(square,b.color).includes(b.square));const replies=c.moves({verbose:true}).map(m=>record(new Chess(c.fen()),code(m)));assert.ok(replies.length);assert.deepEqual(e.replies,replies);
 const cornerMoves=replies.filter(m=>m.piece==='k'&&m.color===d.color&&m.to===square);assert.deepEqual(e.cornerMoves,cornerMoves);assert.equal(e.occupied,d.square===square);
 assert.deepEqual(e.pawnCaptures,replies.filter(r=>r.to===p.square&&r.captured==='p').map(r=>r.move).sort());assert.deepEqual(e.bishopCaptures,replies.filter(r=>r.to===b.square&&r.captured==='b').map(r=>r.move).sort());
 if(event.id==='wrong-colored-bishop')assert.equal(event.text,`Wrong-colored bishop: bishop ${b.square} cannot control ${square}, the promotion square of pawn ${p.square}.`);
 else{assert.ok(e.occupied||cornerMoves.length);const line=e.occupied?'occupied by the defending king':`${d.color==='b'?'...':''}${cornerMoves[0].san} is legal now`;assert.equal(event.text,`Wrong rook pawn: bishop ${b.square} cannot control ${square}; ${line}.`);}
 assert.ok(event.text.split(/\s+/).length<=24);return{passed:true,replies:replies.length,leaves:replies.length,cornerMoves:cornerMoves.length,occupied:e.occupied,pawnCaptures:e.pawnCaptures.length,bishopCaptures:e.bishopCaptures.length};
}

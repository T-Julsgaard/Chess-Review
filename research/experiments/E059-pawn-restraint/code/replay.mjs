import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export function replay(f,event){assert.ok(['self-blocking-pawn','fixed-pawn-next-turn'].includes(event.id));assert.equal(event.qualityClaim,false);const e=event.evidence,c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.equal(e.beforeFen,c.fen());assert.ok(!c.isGameOver());const before=new Chess(c.fen()),played=record(c,f.move);assert.deepEqual(e.played,played);assert.equal(e.afterFen,c.fen());assert.ok(!c.isGameOver());const p=e.pawn,b=e.blocker;
 assert.deepEqual(c.get(p.square),{type:p.type,color:p.color});assert.deepEqual(c.get(b.square),{type:b.type,color:b.color});assert.equal(p.type,'p');assert.equal(p.color,played.color);assert.equal(p.square[0],b.square[0]);assert.equal(+b.square[1],+p.square[1]+(p.color==='w'?1:-1));
 if(event.id==='self-blocking-pawn'){assert.equal(b.square,played.to);assert.equal(b.color,p.color);assert.deepEqual(before.get(p.square),{type:'p',color:p.color});}
 else{assert.equal(p.square,played.to);assert.equal(played.piece,'p');assert.equal(played.promotion,null);assert.equal(b.type,'p');assert.notEqual(b.color,p.color);}
 const responses=[];
 for(const m of c.moves({verbose:true})){const child=new Chess(c.fen()),reply=record(child,code(m)),terminal=child.isGameOver(),unit=child.get(p.square),blocker=child.get(b.square);const pawnMoves=!terminal&&unit?.type==='p'&&unit.color===p.color?child.moves({verbose:true}).filter(m=>m.from===p.square).map(m=>record(new Chess(child.fen()),code(m))):[];
  responses.push({reply,terminal,pawnPresent:unit?.type==='p'&&unit.color===p.color,blockerPresent:!!blocker&&blocker.type===b.type&&blocker.color===b.color,pawnMoves});
 }
 assert.ok(responses.length);assert.deepEqual(e.responses,responses);
 if(event.id==='fixed-pawn-next-turn'){assert.ok(responses.every(r=>!r.terminal&&r.pawnPresent&&r.blockerPresent&&!r.pawnMoves.length));assert.equal(event.text,`Pawn fixation: ${played.san} locks pawn ${p.square} against ${b.square}; every legal reply leaves it without a legal move next turn.`);}
 else assert.equal(event.text,`Self-blocking pawns: ${played.san} occupies ${b.square} directly ahead of your pawn ${p.square}, blocking its straight advance.`);
 assert.ok(event.text.split(/\s+/).length<=24);return{passed:true,replies:responses.length,leaves:responses.reduce((n,r)=>n+Math.max(1,r.pawnMoves.length),0),pawnMoves:responses.reduce((n,r)=>n+r.pawnMoves.length,0)};
}

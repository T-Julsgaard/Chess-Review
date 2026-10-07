import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function move(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export function replay(f,event){
 assert.ok(['rear-rook-check','side-rook-check','rook-checking-distance'].includes(event.id));assert.equal(event.qualityClaim,false);
 const e=event.evidence,c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());assert.match(m,/^[a-h][1-8][a-h][1-8][qrbn]?$/);c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.equal(e.beforeFen,c.fen());assert.ok(!c.isGameOver());
 const played=move(c,f.move);assert.deepEqual(e.played,played);assert.equal(played.piece,'r');assert.equal(e.afterFen,c.fen());assert.ok(c.isCheck()&&!c.isGameOver());
 const pieces=c.board().flat().filter(Boolean),foes=pieces.filter(p=>p.color!==played.color),own=pieces.filter(p=>p.color===played.color);
 assert.ok(pieces.every(p=>['k','r','p'].includes(p.type)));assert.equal(own.filter(p=>p.type==='r').length,1);assert.equal(foes.filter(p=>p.type==='r').length,1);
 const k=foes.find(p=>p.type==='k'),r=foes.find(p=>p.type==='r');assert.deepEqual(e.checker,{square:played.to,type:'r',color:played.color});assert.deepEqual(e.king,{square:k.square,type:k.type,color:k.color});assert.deepEqual(e.enemyRook,{square:r.square,type:r.type,color:r.color});
 const x=s=>s.charCodeAt(0)-97,y=s=>Number(s[1]),forward=k.color==='w'?1:-1;
 const rear=x(played.to)===x(k.square)&&(y(played.to)-y(k.square))*forward<0,side=y(played.to)===y(k.square);assert.ok(rear||side);assert.equal(e.direction,rear?'rear':'side');
 const path=[],count=Math.abs(x(played.to)-x(k.square))+Math.abs(y(played.to)-y(k.square));
 for(let i=1;i<count;i++){const s=String.fromCharCode(97+x(played.to)+Math.sign(x(k.square)-x(played.to))*i)+(y(played.to)+Math.sign(y(k.square)-y(played.to))*i);assert.equal(c.get(s),undefined);path.push(s);}
 assert.deepEqual(e.ray,path);assert.equal(e.clearSquares,path.length);
 const eligible=foes.filter(p=>p.type==='p'&&x(p.square)===x(k.square)&&(y(p.square)-y(k.square))*forward>0&&(p.color==='w'?y(p.square):9-y(p.square))>=5&&(p.color==='w'?y(p.square):9-y(p.square))<=7&&!own.some(q=>q.type==='p'&&Math.abs(x(q.square)-x(p.square))<=1&&(y(q.square)-y(p.square))*forward>0)).map(p=>({square:p.square,type:p.type,color:p.color})).sort((a,b)=>a.square.localeCompare(b.square));
 assert.ok(eligible.length);assert.deepEqual(e.pawns,eligible);assert.equal(e.selectedPawn,eligible[0].square);
 const replies=c.moves({verbose:true}).map(m=>move(new Chess(c.fen()),code(m)));assert.ok(replies.length);assert.deepEqual(e.replies,replies);
 const captures=replies.filter(r=>r.to===played.to&&r.captured==='r').map(r=>r.move).sort();assert.deepEqual(e.checkerCaptures,captures);
 if(event.id==='rook-checking-distance'){assert.ok(path.length>=3);assert.equal(captures.length,0);assert.equal(event.text,`Checking distance: ${played.san} leaves ${path.length} clear squares between rook and king; no immediate legal reply captures the rook.`);}
 else{assert.equal(event.id,rear?'rear-rook-check':'side-rook-check');const label=rear?'Rook check from behind':'Rook check from the side',line=rear?`along the ${played.to[0]}-file, behind pawn ${eligible[0].square}`:`along rank ${played.to[1]}, beside pawn ${eligible[0].square}`;assert.equal(event.text,`${label}: ${played.san} checks king ${k.square} ${line}.`);}
 assert.ok(event.text.split(/\s+/).length<=24);return{passed:true,replies:replies.length,leaves:replies.length,checkerCaptures:captures.length,clearSquares:path.length};
}

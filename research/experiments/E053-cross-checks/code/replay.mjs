import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code=m=>m.from+m.to+(m.promotion||''),values={p:1,n:3,b:3,r:5,q:9,k:0};
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+(p.color===color?1:-1)*values[p.type],0);
const record=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before:m.before,after:m.after});
const king=(c,color)=>c.board().flat().find(p=>p?.color===color&&p.type==='k');
const checks=(c,square,color)=>c.attackers(square,color).sort().map(square=>({square,...c.get(square)}));
const state=c=>c.isCheckmate()?'mate':c.isDraw()?'draw':'live';
export function replay(f,event){
 assert.equal(event.id,'cross-check');assert.equal(event.qualityClaim,false);
 const before=legalPosition(f.history?.fen||f.fen),c=legalPosition(f.history?.fen||f.fen);
 if(f.history){assert.ok(Array.isArray(f.history.moves)&&f.history.moves.length<=1000);for(const m of f.history.moves){assert.ok(!c.isGameOver());before.move(m);c.move(m);}}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.ok(!before.isGameOver()&&before.isCheck());
 const played=c.move(f.move),e=event.evidence,color=played.color,enemy=c.turn(),ownBefore=king(before,color),ownAfter=king(c,color),enemyKing=king(c,enemy);
 assert.deepEqual(e.played,record(played));assert.equal(e.before,before.fen());assert.equal(e.after,c.fen());assert.equal(e.color,color);
 assert.deepEqual(e.ownBefore,ownBefore);assert.deepEqual(e.ownAfter,ownAfter);assert.deepEqual(e.enemyKing,enemyKing);
 assert.ok(!c.attackers(ownAfter.square,enemy).length&&c.isCheck()&&(!c.isDraw()||c.isCheckmate()));
 const original=checks(before,ownBefore.square,enemy),counter=checks(c,enemyKing.square,color);
 assert.deepEqual(e.beforeCheckers,original);assert.deepEqual(e.afterCheckers,counter);assert.ok(original.length&&counter.length);
 const rays=[];for(const checker of original.filter(p=>'brq'.includes(p.type))){
  const dx=ownBefore.square.charCodeAt(0)-checker.square.charCodeAt(0),dy=+ownBefore.square[1]- +checker.square[1];
  assert.ok(checker.type==='r'?(!dx||!dy):checker.type==='b'?Math.abs(dx)===Math.abs(dy):(!dx||!dy||Math.abs(dx)===Math.abs(dy)));
  const between=[];for(let i=1;i<Math.max(Math.abs(dx),Math.abs(dy));i++)between.push(String.fromCharCode(checker.square.charCodeAt(0)+Math.sign(dx)*i)+(+checker.square[1]+Math.sign(dy)*i));
  assert.ok(between.every(s=>!before.get(s)));rays.push({checker,between});
 }assert.deepEqual(e.rays,rays);
 const blocked=rays.filter(r=>r.between.includes(played.to)).map(r=>r.checker.square);
 const victim=played.captured?(played.flags.includes('e')?played.to[0]+(played.color==='w'?'5':'4'):played.to):null;
 const captured=original.find(p=>p.square===victim);
 const mechanism=blocked.length?{kind:'block',checkers:blocked}:captured?{kind:'capture',checker:captured.square,capturedSquare:victim}:played.piece==='k'?{kind:'king-discovery'}:null;
 assert.ok(mechanism);assert.deepEqual(e.mechanism,mechanism);
 assert.deepEqual(e.direct,counter.filter(p=>p.square===played.to).map(p=>p.square));assert.deepEqual(e.discovered,counter.filter(p=>p.square!==played.to).map(p=>p.square));
 assert.equal(e.initialBalance,balance(before,color));assert.equal(e.terminal,state(c));
 const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
 const action=mechanism.kind==='block'?'blocks their check':mechanism.kind==='capture'?`captures the checking ${names[captured.type]}`:'escapes check';
 assert.equal(event.text,`Cross-check: ${played.san} ${action} and gives check back.`);
 const evasions=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));
 assert.deepEqual(e.evasions.map(r=>r.move),evasions.map(code));assert.equal(e.terminal==='mate',evasions.length===0);
 for(let i=0;i<evasions.length;i++){
  const move=c.move(code(evasions[i]));assert.ok(!c.attackers(king(c,enemy).square,color).length);
  assert.deepEqual(e.evasions[i],{...record(move),gain:balance(c,color)-e.initialBalance,terminal:state(c)});c.undo();
 }
 return{passed:true,replies:evasions.length,leaves:evasions.length};
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
export function checkWitness(w,result){
 const c=legalPosition(w.history?.fen||w.before);for(const code of w.history?.moves||[])c.move(code);assert.equal(c.fen(),w.before);const m=c.move(w.played.uci);assert.deepEqual(rec(m),w.played);assert.equal(c.fen(),w.after);
 for(const [key,fen,color] of [['old',w.before,w.actor],['oldEnemy',w.before,w.actor==='w'?'b':'w'],['fresh',w.after,w.actor],['freshEnemy',w.after,w.actor==='w'?'b':'w']]){
  const board=legalPosition(fen),turn=turnBoard(board,color),s=w[key];assert.equal(s.fen,turn.fen());assert.deepEqual(s.moves,turn.moves({verbose:true}).map(rec));
  assert.deepEqual(s.pieces,board.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})));
  const p=s.pieces.filter(p=>p.type==='p'&&p.color===color&&['d4','e4','d5','e5'].includes(p.square));assert.deepEqual(s.pawns,p);
  assert.equal(s.pawnFreeDE,!s.pieces.some(p=>p.type==='p'&&['d','e'].includes(p.square[0])));
  const pairs=[];for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(Math.abs(p[i].square.charCodeAt(0)-p[j].square.charCodeAt(0))===1&&Math.abs(+p[i].square[1]-+p[j].square[1])<=1)pairs.push([p[i].square,p[j].square]);assert.deepEqual(s.pairs,pairs);
  const rams=[];for(const pawn of s.pieces.filter(p=>p.type==='p'&&p.color===color&&'cdef'.includes(p.square[0]))){const forward=pawn.square[0]+(+pawn.square[1]+(color==='w'?1:-1)),target=board.get(forward);if(target?.type==='p'&&target.color!==color)rams.push({own:pawn.square,enemy:forward});}assert.deepEqual(s.rams,rams);
 }
 const added=w.fresh.moves.filter(m=>m.captured&&!w.old.moves.some(o=>o.from===m.from&&o.to===m.to&&o.promotion===m.promotion));assert.deepEqual(w.added,added);
 for(const e of result.events.filter(e=>e.evidence?.experiment==='E090')){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);const d=e.evidence.detail;
 if(e.id==='new-legal-center-control')assert.ok(d.contacts.length&&d.contacts.every(m=>added.some(a=>a.uci===m.uci)&&['d4','e4','d5','e5'].includes(m.to)));
 if(e.id==='active-piece-center'){assert.ok(['d4','e4','d5','e5'].includes(m.to));assert.ok(d.check===c.isCheck());assert.ok(d.check||d.contacts.some(x=>added.some(a=>a.uci===x.uci)&&x.from===m.to));}
 if(e.id==='legal-mobile-center')assert.ok(d.pairs.every(p=>p.every(s=>w.fresh.moves.some(x=>x.from===s&&x.from[0]===x.to[0]))));
 if(e.id==='currently-fixed-center')assert.ok(d.rams.every(r=>!w.fresh.moves.some(m=>m.from===r.own)&&!w.freshEnemy.moves.some(m=>m.from===r.enemy)));
 if(e.id==='legal-open-center-access'){assert.ok(w.fresh.pawnFreeDE);for(const x of d.contacts){assert.ok(added.some(a=>a.uci===x.uci));assert.ok('brq'.includes(x.piece));const ray=[];let s=x.from;while(s!==x.to){s=String.fromCharCode(s.charCodeAt(0)+Math.sign(x.to.charCodeAt(0)-s.charCodeAt(0)))+(+s[1]+Math.sign(+x.to[1]-+s[1]));ray.push(s);}assert.ok(ray.some(s=>['d4','e4','d5','e5'].includes(s)));}}
 if(e.id.startsWith('recorded-')){assert.equal(w.history.fen,new Chess().fen());assert.equal(w.history.moves.length,1);assert.deepEqual(d.codes,[...w.history.moves,m.from+m.to]);const expected=d.codes[0]==='e2e4'?(d.codes[1]==='e7e5'?'open-game':'semi-open-game'):d.codes[0]==='d2d4'?(d.codes[1]==='d7d5'?'closed-game':'semi-closed-game'):null;assert.equal(d.label,expected);assert.equal(e.id,'recorded-'+expected);}
 }return true;
}


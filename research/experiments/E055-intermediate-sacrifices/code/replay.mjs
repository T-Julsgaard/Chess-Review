import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {replay as replaySacrifice} from '../../E030-mating-sacrifices/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function move(c,uci){const before=c.fen(),m=c.move(uci);return{raw:m,record:{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()}};}
function taken(m){return m.flags.includes('e')?`${m.to[0]}${m.color==='w'?5:4}`:m.to;}
export function replay(f,event,result){
 assert.equal(event.id,'intermediate-sacrifice');assert.equal(event.qualityClaim,false);
 const e=event.evidence;assert.equal(e.parentEvent,'mating-sacrifice');assert.ok(result&&Array.isArray(result.events));
 const parents=result.events.filter(p=>p.id===e.parentEvent);assert.equal(parents.length,1);
 assert.ok(f.history&&Array.isArray(f.history.moves)&&f.history.moves.length>0&&f.history.moves.length<=1000);
 const c=legalPosition(f.history.fen);let last;
 for(const m of f.history.moves){assert.ok(!c.isGameOver());last=move(c,m);}
 assert.equal(c.fen(),legalPosition(f.fen).fen());assert.ok(!c.isGameOver());assert.equal(e.beforeFen,c.fen());assert.equal(e.historyPlies,f.history.moves.length);
 assert.deepEqual(e.lastCapture,last.record);assert.ok(last.raw.captured);assert.notEqual(last.raw.color,c.turn());
 const square=taken(last.raw),v=new Chess(last.record.before).get(square),unit=c.get(last.raw.to);
 assert.ok(v&&v.color===c.turn()&&v.type!=='k');assert.ok(unit&&unit.color===last.raw.color&&unit.type===(last.raw.promotion||last.raw.piece));
 assert.deepEqual(e.victim,{square,...v});assert.deepEqual(e.capturer,{square:last.raw.to,...unit});assert.equal(e.color,c.turn());
 const legal=c.moves({verbose:true});assert.deepEqual(e.originalMoves,legal.map(code).sort());
 const recaptures=[];
 for(const m of legal){const child=new Chess(c.fen()),r=move(child,code(m));assert.ok(!child.isCheckmate());if(m.captured&&taken(m)===last.raw.to)recaptures.push(r.record);}
 assert.ok(recaptures.length);assert.deepEqual(e.recaptures,recaptures);
 const actual=move(c,f.move);assert.ok(!recaptures.some(r=>r.move===actual.record.move));assert.ok(!actual.raw.captured||taken(actual.raw)!==last.raw.to);
 assert.deepEqual(e.played,actual.record);assert.equal(e.afterFen,c.fen());assert.equal(result.after,c.fen());
 const offer=parents[0],counts=replaySacrifice(f,offer);assert.equal(offer.evidence.played,actual.record.move);
 assert.equal(e.nominalCost,offer.evidence.nominalLoss);assert.ok(e.nominalCost>0);assert.equal(e.mateIn,offer.evidence.mateIn);assert.ok([2,3].includes(e.mateIn));
 assert.equal(event.text,`Intermediate sacrifice: ${actual.record.san} skips an available recapture on ${last.raw.to} and forces mate within ${e.mateIn} moves.`);assert.ok(event.text.split(/\s+/).length<=24);
 return{passed:true,replies:counts.replies,leaves:counts.leaves,recaptures:recaptures.length,historyPlies:f.history.moves.length};
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
const values={p:1,n:3,b:3,r:5,q:9,k:0},code=m=>m.from+m.to+(m.promotion||''),moves=c=>c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),balance=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===a?1:-1),0);
const contact=(from,to)=>{const a=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),b=Math.abs(Number(from[1])-Number(to[1]));return(a===1&&b===2)||(a===2&&b===1);};
function legal(c){const p=c.board().flat().filter(Boolean),opponent=c.turn()==='w'?'b':'w',king=p.find(p=>p.type==='k'&&p.color===opponent);return !c.isAttacked(king.square,c.turn());}
export function checkPolicy(p,c,target){
 const actor=c.turn()==='w'?'b':'w',baseline=balance(c,actor),options=moves(c),live=!c.isGameOver();assert.equal(p.fen,c.fen());assert.equal(p.actor,actor);assert.equal(p.enemy,c.turn());assert.deepEqual(p.target,target);assert.equal(p.baseline,baseline);assert.deepEqual(p.values,values);assert.equal(p.live,live);assert.deepEqual(p.legal,options.map(code));assert.equal(p.rows.length,live?options.length:0);
 const minima=[];for(const [i,m]of (live?options:[]).entries()){
  const r=p.rows[i];c.move(m);try{
   const square=m.from===target.square?m.to:target.square,unit=c.get(square),terminal=c.isGameOver(),captures=terminal||unit?.color!==target.color||unit?.type!==target.type?[]:moves(c).filter(t=>t.to===square&&t.captured===target.type);
   assert.equal(r.move,code(m));assert.equal(r.fen,c.fen());assert.equal(r.terminal,terminal);assert.equal(r.trackedSquare,square);assert.equal(r.captures.length,captures.length);const good=[];
   for(const [j,t]of captures.entries()){const v=r.captures[j];c.move(t);try{
    const initial=balance(c,actor)-baseline,draw=c.isDraw(),mate=c.isCheckmate(),answers=moves(c);assert.equal(v.move,code(t));assert.equal(v.fen,c.fen());assert.equal(v.gain,initial);assert.equal(v.draw,draw);assert.equal(v.mate,mate);assert.deepEqual(v.legalCounters,answers.map(code));assert.equal(v.counters.length,answers.length);let minimum=initial,success=!draw&&initial>0;
    for(const [k,a]of answers.entries()){c.move(a);try{const gain=balance(c,actor)-baseline,terminal=c.isGameOver();assert.deepEqual(v.counters[k],{move:code(a),fen:c.fen(),gain,terminal});minimum=Math.min(minimum,gain);if(terminal||gain<=0)success=false;}finally{c.undo();}}
    assert.equal(v.minimumGain,minimum);assert.equal(v.success,success);if(success)good.push(minimum);
   }finally{c.undo();}}
   assert.equal(r.success,good.length>0);assert.equal(r.minimumGain,good.length?Math.max(...good):null);minima.push(good.length?Math.max(...good):null);
  }finally{c.undo();}}
 const success=live&&options.length>0&&minima.every(x=>x!==null);assert.equal(p.success,success);assert.equal(p.minimumGain,success?Math.min(...minima):null);return success;
}
export function checkWitness(w,result,input){
 const a=result.recordedTrapAnalysis;assert.equal(a.limit,input.maxRecordedTrapNodes??50000);assert.ok(a.nodes>=1&&a.nodes<=a.limit);assert.equal(w.experiment,'E139');assert.ok(input.history&&input.history.moves.length>=2);
 const c=new Chess(input.history.fen),records=[];assert.ok(legal(c));for(const move of input.history.moves){assert.ok(!c.isGameOver());const before=c.fen(),m=c.move(move);records.push({before,move:m,after:c.fen()});}
 assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(w.before,c.fen());assert.equal(w.actor,c.turn());assert.deepEqual(w.history,input.history);assert.ok(!c.isGameOver());const actor=c.turn(),[first,reply]=records.slice(-2),prep=first.move,enemy=reply.move,played=c.move(input.move);assert.equal(w.after,c.fen());assert.equal(result.after,c.fen());assert.ok(!c.isGameOver());assert.equal(c.fen().split(' ')[2],'-');assert.equal(c.fen().split(' ')[3],'-');
 for(const m of [prep,enemy,played])assert.ok(!m.captured&&!m.promotion&&!m.flags.includes('e'));assert.equal(prep.piece,'n');assert.equal(played.piece,'n');assert.equal(prep.color,actor);assert.notEqual(enemy.color,actor);assert.notEqual(prep.to,played.from);assert.equal(c.get(prep.to)?.type,'n');assert.equal(c.get(prep.to)?.color,actor);assert.equal(c.get(prep.from),undefined);assert.equal(c.get(played.from),undefined);
 assert.deepEqual(w.preparation,{before:first.before,move:code(prep),after:first.after,from:prep.from,to:prep.to,san:prep.san});assert.deepEqual(w.reply,{before:reply.before,move:code(enemy),after:reply.after});assert.deepEqual(w.played,{move:code(played),from:played.from,to:played.to,san:played.san});
 const snapshots=[first.before,first.after,reply.after].map(f=>new Chess(f)),targets=c.board().flat().filter(Boolean).filter(p=>p.color!==actor&&!['k','p'].includes(p.type)&&snapshots.every(b=>b.get(p.square)?.type===p.type&&b.get(p.square)?.color===p.color)&&contact(prep.to,p.square)&&contact(played.to,p.square)&&!contact(prep.from,p.square)&&!contact(played.from,p.square)).sort((a,b)=>a.square.localeCompare(b.square));assert.ok(targets.length);assert.equal(w.targets.length,targets.length);const events=[];
 for(const [i,p]of targets.entries()){
  const t=w.targets[i],target={square:p.square,type:p.type,color:p.color};assert.deepEqual(t.target,target);const actual=checkPolicy(t.actual,c,target);assert.equal(t.restored.length,actual?2:0);let success=false;
  if(actual){for(const [j,m]of [prep,played].entries()){const r=t.restored[j],frame=new Chess(c.fen());frame.remove(m.to);frame.put({type:'n',color:actor},m.from);assert.equal(r.from,m.to);assert.equal(r.to,m.from);assert.equal(r.fen,frame.fen());assert.equal(r.historyScope,'hypothetical FEN-root placement control');const valid=legal(frame);assert.equal(r.legal,valid);assert.equal(r.live,valid&&!frame.isGameOver());if(r.live)checkPolicy(r.policy,frame,target);else assert.equal(r.policy,null);}success=t.restored.every(r=>r.legal&&r.live&&!r.policy.success);}
  assert.equal(t.success,success);if(success){const square=target.square,add=(id,text)=>events.push({id,text,qualityClaim:false,evidence:{experiment:'E139',before:w.before,after:w.after,detail:{source:'recordedTrapAnalysis.witness',target:square}}});
   add('recorded-trapping-combination',`Trapping combination: recorded ${prep.san} then ${played.san} guarantee capture of ${square} with three-ply material gain; restoring either knight removes that guarantee.`);
   add('necessary-knight-trap-geometry',`Geometric trap: two new knight contacts cover ${square}; every defense permits three-ply material gain, and each recorded placement is independently necessary.`);
  }
 }
 assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E139'),events);assert.equal(a.status,events.length?'proven':'no-new-fact');return true;
}

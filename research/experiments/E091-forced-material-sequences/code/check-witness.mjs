import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
const values={p:1,n:3,b:3,r:5,q:9,k:0};
const count=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===a?1:-1),0);
const simple=c=>new Set(c.board().flat().filter(p=>p&&!['k','p'].includes(p.type)).map(p=>p.type)).size<=1;
const prefix=(actual,expected)=>assert.deepEqual(actual,expected.slice(0,actual.length));
function at(c,move,fn){c.move(move);try{return fn();}finally{c.undo();}}
export function replayPolicy(c,p,actor,baseline,threshold,requireEnding){
 assert.equal(p.root,c.fen());assert.equal(p.actor,actor);assert.equal(p.baseline,baseline);assert.equal(p.threshold,threshold);assert.equal(p.requireEnding,requireEnding);
 if(c.isGameOver()||c.turn()===actor){assert.equal(p.terminal,true);assert.equal(p.win,false);assert.deepEqual(p.branches,[]);return false;}
 const root=c.moves({verbose:true}).map(uci);prefix(p.branches.map(b=>b.reply),root);let success=true;
 for(const b of p.branches)at(c,b.reply,()=>{
  assert.equal(b.fen,c.fen());assert.equal(b.terminal,c.isGameOver());if(b.terminal){assert.equal(b.chosen,null);assert.equal(p.win,false);success=false;return;}
  const captures=c.moves({verbose:true}).filter(m=>m.captured).map(uci);assert.deepEqual(b.options,captures);prefix(b.captures.map(a=>a.move),captures);
  let chosen=null;for(const a of b.captures)at(c,a.move,()=>{
   assert.equal(a.fen,c.fen());assert.equal(a.terminal,c.isGameOver());if(a.terminal){assert.equal(a.passed,false);assert.deepEqual(a.counters,[]);return;}
   const replies=c.moves({verbose:true}).map(uci);prefix(a.counters.map(x=>x.move),replies);let passed=replies.length>0;
   for(const x of a.counters)at(c,x.move,()=>{assert.equal(x.fen,c.fen());assert.equal(x.gain,count(c,actor)-baseline);assert.equal(x.ending,simple(c));assert.equal(x.terminal,c.isGameOver());if(x.terminal||x.gain<threshold||requireEnding&&!x.ending)passed=false;});
   if(passed)assert.equal(a.counters.length,replies.length);assert.equal(a.passed,passed);if(passed)chosen=a.move;
  });assert.equal(b.chosen,chosen);if(!chosen){assert.equal(b.captures.length,captures.length);success=false;}
 });
 if(success)assert.equal(p.branches.length,root.length);assert.equal(p.win,success&&root.length>0);return p.win;
}
export function checkWitness(w,r){
 const c=legalPosition(w.history?.fen||w.before);for(const m of w.history?.moves||[])c.move(m);assert.equal(c.fen(),w.before);assert.equal(w.rootBalance,count(c,w.actor));assert.equal(w.rootCheck,c.isCheck());const enemy=w.actor==='w'?'b':'w';const threats=w.rootCheck?[]:turnBoard(c,enemy).moves({verbose:true}).filter(m=>m.captured&&m.to===w.played.from).map(uci);assert.deepEqual(w.threats,threats);const move=c.move(w.played.uci);assert.equal(c.fen(),w.after);assert.equal(move.from,w.played.from);assert.equal(move.to,w.played.to);assert.equal(move.piece,w.played.piece);assert.equal(move.captured||null,w.played.captured);assert.equal(move.promotion||null,w.played.promotion);
 for(const [key,p] of Object.entries(w.policies)){const [threshold,ending]=key.split(':');replayPolicy(c,p,w.actor,w.rootBalance,+threshold,ending==='true');}
 if(w.priorLoss){const previous=c.undo();assert.equal(uci(previous),w.played.uci);const last=c.undo();assert.equal(uci(last),w.priorLoss.capture);assert.equal(c.fen(),w.priorLoss.before);assert.equal(count(c,w.actor),w.priorLoss.preLossBalance);assert.equal(w.priorLoss.loss,w.priorLoss.preLossBalance-w.rootBalance);c.move(uci(last));assert.equal(c.fen(),w.priorLoss.after);c.move(w.played.uci);}
 if(w.delay){c.undo();const alternate=c.move(w.delay.move);assert.ok(!alternate.captured&&!c.isCheck()&&!c.isGameOver());replayPolicy(c,w.delay.policy,w.actor,w.rootBalance,w.priorLoss.loss,false);assert.equal(w.delay.policy.win,false);c.undo();c.move(w.played.uci);}
 for(const loss of w.losses){const enemy=c.turn(),initial=count(c,enemy),enemyOffset=initial+w.rootBalance;assert.equal(loss.enemyOffset,enemyOffset);assert.deepEqual(loss.proof.materialValues,values);at(c,loss.capture,()=>{
  const options=c.moves({verbose:true}).map(uci);assert.deepEqual(loss.proof.witnesses.map(x=>x.reply),options);let minimum=count(c,enemy)-initial;
  for(const x of loss.proof.witnesses)at(c,x.reply,()=>{assert.ok(!c.isGameOver());const gain=count(c,enemy)-initial;assert.equal(x.gain,gain);assert.ok(gain>0);minimum=Math.min(minimum,gain);});assert.equal(loss.proof.minimumGain,minimum);assert.equal(loss.minimumNetLoss,minimum+enemyOffset);assert.ok(loss.minimumNetLoss>0);
 });}
 for(const event of r.events.filter(e=>e.evidence?.experiment==='E091')){assert.equal(event.qualityClaim,false);assert.ok(event.text.split(/\s+/).length<=24);const d=event.evidence.detail;
  if(event.id==='forced-tactical-liquidation'){assert.ok(w.played.captured&&!['p','k'].includes(w.played.captured));assert.ok(d.policy.win&&d.policy.requireEnding&&d.policy.threshold===0);}
  if(event.id==='profitable-tactical-retreat'){assert.ok(!move.captured&&!['p','k'].includes(move.piece));assert.ok((+move.to[1]-+move.from[1])*(w.actor==='w'?1:-1)<0);assert.ok(w.threats.length&&d.policy.win&&d.policy.threshold>0);}
  if(event.id==='defensive-material-combination')assert.ok(w.rootCheck&&move.piece!=='k'&&d.policy.win&&d.policy.threshold===0);
  if(event.id==='forced-material-recovery'||event.id==='expiring-material-compensation')assert.ok(w.priorLoss.loss>0&&d.policy.win&&d.policy.threshold===w.priorLoss.loss);
  if(event.id==='expiring-material-compensation')assert.ok(w.delay&&!w.delay.policy.win);
  if(event.id==='simplification-material-loss')assert.ok(d.loss.minimumNetLoss>0&&w.losses.some(l=>l.capture===d.loss.capture));
 }return true;
}


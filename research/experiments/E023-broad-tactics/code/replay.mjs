import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const values={p:1,n:3,b:3,r:5,q:9,k:0},uci=m=>m.from+m.to+(m.promotion||'');
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===color?1:-1),0);
const legal=c=>c.moves({verbose:true}).map(uci).sort();
function apply(c,m,fn){assert.ok(legal(c).includes(m),`Illegal witness ${m}`);const move=c.move(m);try{return fn(move);}finally{c.undo();}}
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
export function replay(fixture,event){
 const c=new Chess(fixture.fen),mover=c.turn(),before=c.fen(),initial=balance(c,mover);c.move(fixture.move);const e=event.evidence,proof=e.proof;
 assert.deepEqual(proof.materialValues,values);let replies=0,leaves=0,minimum=Infinity;
 if(event.id==='hanging-piece'){
  assert.equal(e.color,c.turn());const start=balance(c,e.color);
  apply(c,e.capture,move=>{
   assert.equal(victim(move),e.target);assert.equal(move.captured,e.piece);assert.ok(!c.isDraw());assert.deepEqual(proof.witnesses.map(w=>w.reply).sort(),legal(c));
   minimum=balance(c,e.color)-start;
   for(const w of proof.witnesses)apply(c,w.reply,()=>{replies++;assert.ok(!c.isCheckmate()&&!c.isDraw());const gain=balance(c,e.color)-start;assert.ok(gain>0);assert.equal(w.gain,gain);minimum=Math.min(minimum,gain);});
  });
 }else{
  const prior=new Chess(before),played=c.history({verbose:true}).at(-1);
  assert.ok(e.targets.length>=2);assert.equal(new Set(e.targets.map(t=>t.square)).size,e.targets.length);
  for(const a of e.attackers){assert.deepEqual(c.get(a.square),{type:a.type,color:mover});assert.ok(e.targets.some(t=>c.attackers(t.square,mover).includes(a.square)));}
  for(const t of e.targets){assert.equal(c.get(t.square)?.type,t.type);assert.notEqual(c.get(t.square)?.color,mover);assert.ok(e.attackers.some(a=>c.attackers(t.square,mover).includes(a.square)));}
  if(event.id==='broad-fork'||event.id==='triple-attack'){
   assert.equal(e.attackers.length,1);assert.equal(e.attackers[0].square,played.to);
   assert.ok(e.targets.some(t=>!prior.attackers(t.square,mover).includes(played.from)));
   if(event.id==='triple-attack')assert.ok(e.targets.length>=3);
  }else{
   assert.equal(event.id,'discovered-double-attack');assert.ok(e.attackers.length>=2);
   assert.ok(e.attackers.some(a=>a.square!==played.to&&e.targets.some(t=>!prior.attackers(t.square,mover).includes(a.square))));
   assert.ok(e.targets.some(t=>c.attackers(t.square,mover).includes(played.to)&&!prior.attackers(t.square,mover).includes(played.from)));
  }
  assert.deepEqual(proof.witnesses.map(w=>w.reply).sort(),legal(c));
  for(const w of proof.witnesses)apply(c,w.reply,()=>{
   replies++;assert.ok(!c.isGameOver());assert.ok(e.attackers.some(a=>a.square===w.capture.slice(0,2)&&c.get(a.square)?.type===a.type&&c.get(a.square)?.color===mover));
   apply(c,w.capture,capture=>{
    assert.equal(victim(capture),w.target);assert.ok(e.targets.some(t=>t.type!=='k'&&t.square===w.target&&t.type===capture.captured));assert.ok(!c.isDraw());
    assert.deepEqual(w.responses.map(r=>r.reply).sort(),legal(c));let worst=balance(c,mover)-initial;
    for(const response of w.responses)apply(c,response.reply,()=>{leaves++;assert.ok(!c.isCheckmate()&&!c.isDraw());const gain=balance(c,mover)-initial;assert.ok(gain>0);assert.equal(response.gain,gain);worst=Math.min(worst,gain);});
    assert.ok(worst>0);assert.equal(w.worstGain,worst);minimum=Math.min(minimum,worst);
   });
  });
 }
 assert.ok(minimum>0);assert.equal(minimum,proof.minimumGain);
 return{passed:true,replies,leaves,minimumGain:minimum};
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
// Independent enumeration and arithmetic; no detector, ray or proof helpers.
const values={p:1,n:3,b:3,r:5,q:9,k:0},uci=m=>m.from+m.to+(m.promotion||'');
const material=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+(p.color===color?1:-1)*values[p.type],0);
const piece=(c,p)=>c.get(p.square)?.type===p.type&&c.get(p.square)?.color===p.color;
function ray(c,start,end){
 const dx=end.charCodeAt(0)-start.charCodeAt(0),dy=+end[1]- +start[1],p=c.get(start);assert.ok(dx===0||dy===0||Math.abs(dx)===Math.abs(dy));
 assert.ok(p&&['b','r','q'].includes(p.type));assert.ok(p.type==='q'||p.type==='b'&&dx&&dy||p.type==='r'&&(!dx||!dy));
 const squares=[];let x=start.charCodeAt(0),y=+start[1];do{squares.push(String.fromCharCode(x)+y);x+=Math.sign(dx);y+=Math.sign(dy);}while(String.fromCharCode(x)+y!==end);squares.push(end);return squares;
}
export function replay(fixture,event){
 const before=new Chess(fixture.fen),c=new Chess(fixture.history?.fen||fixture.fen);if(fixture.history)for(const code of fixture.history.moves)c.move(code);const played=c.move(fixture.move),e=event.evidence,p=e.proof,color=played.color;
 assert.equal(p.baseline,'afterMove');assert.equal(p.baselineFen,c.fen());assert.equal(p.initialBalance,material(c,color));assert.equal(p.horizonPliesAfterMove,3);assert.ok(!c.isGameOver());
 let replies=c.moves({verbose:true}),attackers=e.attackers;
 if(event.id==='relative-pin'||event.id==='cross-pin'){
  const line=ray(c,e.slider,e.target.square),occupied=line.slice(1,-1).filter(s=>c.get(s));assert.deepEqual(occupied,[e.blocker.square]);assert.ok(piece(c,e.blocker)&&piece(c,e.target));assert.equal(e.target.type,'q');assert.ok(e.blocker.color!==color&&e.target.color!==color&&values[e.blocker.type]<9);assert.equal(c.get(e.slider).color,color);
  replies=replies.filter(m=>m.from===e.blocker.square&&!line.includes(m.to));attackers=[{square:e.slider,type:c.get(e.slider).type,color}];
  if(event.id==='cross-pin'){const a=e.absolute,other=ray(c,a.slider,a.target.square);assert.deepEqual(other.slice(1,-1).filter(s=>c.get(s)),[e.blocker.square]);assert.equal(c.get(a.target.square).type,'k');assert.equal(c.get(a.target.square).color,e.target.color);assert.notEqual(a.slider,e.slider);assert.equal(c.get(a.slider).color,color);}
 }else{
  assert.equal(event.id,'certified-removal');assert.ok(played.captured);const removed=played.isEnPassant()?played.to[0]+played.from[1]:played.to;assert.equal(e.removed,removed);assert.ok(before.attackers(e.target.square,e.target.color).includes(removed));assert.ok(attackers.length);assert.ok(piece(c,e.target)&&e.target.color!==color&&e.target.type!=='k');for(const a of attackers){assert.ok(piece(c,a)&&a.color===color);assert.ok(c.attackers(e.target.square,color).includes(a.square));}
 }
 assert.ok(replies.length);assert.deepEqual(p.witnesses.map(w=>w.reply).sort(),replies.map(uci).sort());let leaves=0,minimum=Infinity;
 for(const reply of replies){const w=p.witnesses.find(w=>w.reply===uci(reply));c.move(reply);assert.ok(!c.isGameOver());assert.ok(piece(c,e.target));assert.equal(w.target,e.target.square);
  const capture=c.moves({verbose:true}).find(m=>uci(m)===w.capture);assert.ok(capture&&capture.to===e.target.square&&capture.captured);assert.ok(attackers.some(a=>a.square===capture.from&&piece(c,a)));c.move(capture);assert.ok(!c.isDraw());
  const responses=c.moves({verbose:true});assert.deepEqual(w.responses.map(r=>r.reply).sort(),responses.map(uci).sort());let worst=material(c,color)-p.initialBalance;
  for(const response of responses){c.move(response);assert.ok(!c.isCheckmate()&&!c.isDraw());const gain=material(c,color)-p.initialBalance;assert.equal(w.responses.find(r=>r.reply===uci(response)).gain,gain);assert.ok(gain>0);worst=Math.min(worst,gain);leaves++;c.undo();}
  assert.ok(worst>0);assert.equal(w.worstGain,worst);minimum=Math.min(minimum,worst);c.undo();c.undo();
 }
 assert.equal(p.minimumGain,minimum);return{replies:replies.length,leaves,minimumGain:minimum};
}

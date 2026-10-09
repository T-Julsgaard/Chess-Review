// Focused independent chess.js replay of causal ray and complete check evasions.
import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const uci=m=>m.from+m.to+(m.promotion||'');
const record=m=>({uci:uci(m),san:m.san,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
export function checkWitness(w){
 const c=new Chess(w.history?.fen||w.before);for(const m of w.history?.moves||[]){assert.ok(!c.isGameOver());c.move(m);}
 assert.equal(c.fen(),w.before);const prior=new Chess(w.before),played=c.move(w.played.uci);
 assert.deepEqual(record(played),w.played);assert.equal(c.fen(),w.after);assert.ok(!c.isGameOver());
 assert.equal(w.blocker,played.from);assert.equal(prior.get(w.blocker).color,w.actor);
 assert.equal(c.get(w.slider.square).type,w.slider.type);assert.equal(prior.get(w.slider.square).type,w.slider.type);
 assert.equal(c.get(w.target.square).type,w.target.type);assert.equal(prior.get(w.target.square).type,w.target.type);
 const dx=w.target.square.charCodeAt(0)-w.slider.square.charCodeAt(0),dy=Number(w.target.square[1])-Number(w.slider.square[1]);
 assert.ok(w.slider.type==='b'?Math.abs(dx)===Math.abs(dy):w.slider.type==='r'?dx===0||dy===0:dx===0||dy===0||Math.abs(dx)===Math.abs(dy));
 const cells=[];let x=w.slider.square.charCodeAt(0)+Math.sign(dx),y=Number(w.slider.square[1])+Math.sign(dy);
 while(x!==w.target.square.charCodeAt(0)||y!==Number(w.target.square[1])){cells.push(String.fromCharCode(x)+y);x+=Math.sign(dx);y+=Math.sign(dy);}
 assert.deepEqual(cells,w.cells);assert.deepEqual(cells.filter(s=>prior.get(s)),[w.blocker]);assert.ok(cells.every(s=>!c.get(s)));
 assert.ok(c.attackers(w.target.square,w.actor).includes(w.slider.square));
 if(w.checking){
  assert.equal(w.target.type,'k');assert.ok(c.isCheck());assert.deepEqual(w.captures,[]);assert.equal(w.hypotheticalActorFen,null);
  const replies=[];for(const m of c.moves({verbose:true})){c.move(uci(m));replies.push({...record(m),fen:c.fen(),terminal:c.isGameOver()});c.undo();}
  assert.deepEqual(replies,w.replies);
 }else{
  const fields=w.after.split(' ');fields[1]=w.actor;fields[3]='-';assert.equal(fields.join(' '),w.hypotheticalActorFen);
  const h=new Chess(w.hypotheticalActorFen),captures=h.moves({verbose:true}).filter(m=>m.from===w.slider.square&&m.to===w.target.square&&m.captured===w.target.type&&!m.flags.includes('e')).map(uci).sort();
  assert.ok(captures.length);assert.deepEqual(captures,w.captures);assert.deepEqual(w.replies,[]);
 }
 return true;
}

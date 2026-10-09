import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
const values={p:1,n:3,b:3,r:5,q:9,k:0},points=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===a?1:-1),0);
export const positionKey=c=>c.fen().split(' ').slice(0,4).join(' ');
export function replayQuery(c,q,counts){
 assert.equal(q.rootFen,c.fen());const actor=q.actor,mode=q.mode;let replies=0,leaves=0;
 function edge(code,child,left){const m=c.move(code),key=positionKey(c);counts.set(key,(counts.get(key)||0)+1);try{return walk(child,left);}finally{counts.set(key,counts.get(key)-1);c.undo();}}
 function walk(n,left){
  assert.equal(n.fen,c.fen());const legal=c.moves({verbose:true}),actorTurn=c.turn()===actor,goal=actorTurn&&(mode==='repetition'?(counts.get(positionKey(c))||0)>=3:legal.length===0&&!c.isCheck());
  if(goal){assert.equal(n.kind,'goal');assert.equal(n.win,true);assert.equal(n.key,positionKey(c));assert.equal(n.goal,mode);leaves++;return true;}
  const reason=legal.length===0&&c.isCheck()?'mate':legal.length===0?'other-stalemate':c.isInsufficientMaterial()?'insufficient':+c.fen().split(' ')[4]>=100?'fifty-move-threshold':null;
  if(reason){assert.equal(n.kind,'terminal');assert.equal(n.reason,reason);assert.equal(n.win,false);leaves++;return false;}
  if(!left){assert.equal(n.kind,'limit');assert.equal(n.win,false);leaves++;return false;}
  const available=(actorTurn&&mode==='repetition'?legal.filter(m=>/[+#]/.test(m.san)):legal).map(uci).sort();
  if(n.kind==='choice'||n.kind==='counterchoice'){
   assert.equal(n.kind,actorTurn?'choice':'counterchoice');assert.ok(available.includes(n.move));if(actorTurn&&mode==='repetition')assert.ok(legal.find(m=>uci(m)===n.move).san.match(/[+#]/));const win=edge(n.move,n.child,left-1);assert.equal(win,actorTurn);assert.equal(n.win,actorTurn);if(!actorTurn)replies++;return n.win;
  }
  assert.equal(n.kind,actorTurn?'all-fail':'all');assert.deepEqual(n.branches.map(b=>b.move).sort(),available);for(const b of n.branches){assert.equal(edge(b.move,b.child,left-1),!actorTurn);if(!actorTurn)replies++;}assert.equal(n.win,!actorTurn);return n.win;
 }
 const passed=walk(q.tree,q.plies);return{passed,replies,leaves};
}
export function checkWitness(w,result,fixture){
 if(fixture){assert.equal(w.before,legalPosition(fixture.fen).fen());assert.equal(w.played.uci,fixture.move);assert.deepEqual(w.history,fixture.history?{fen:legalPosition(fixture.history.fen).fen(),moves:fixture.history.moves}:null);}
 const c=legalPosition(w.history?.fen||w.before),counts=new Map(),add=()=>{const k=positionKey(c);counts.set(k,(counts.get(k)||0)+1);};add();for(const m of w.history?.moves||[]){c.move(m);add();}assert.equal(c.fen(),w.before);assert.equal(c.turn(),w.actor);assert.equal(w.initialBalance,points(c,w.actor));const played=c.move(w.played.uci);add();assert.equal(c.fen(),w.after);assert.deepEqual(w.played,{uci:uci(played),from:played.from,to:played.to,piece:played.piece,captured:played.captured||null,promotion:played.promotion||null});assert.equal(w.check,c.isCheck());assert.deepEqual(w.offers,c.moves({verbose:true}).filter(m=>m.captured&&(m.isEnPassant()?m.to[0]+m.from[1]:m.to)===played.to).map(uci));
 for(const q of w.queries){assert.equal(q.actor,w.actor);assert.equal(q.plies,result.drawAnalysis.plies);assert.ok(result.drawAnalysis.modes.includes(q.mode));replayQuery(c,q,counts);}
 for(const e of result.events.filter(e=>e.evidence?.experiment==='E093')){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);const q=e.evidence.query;assert.ok(w.queries.some(x=>JSON.stringify(x)===JSON.stringify(q)));assert.ok(q.tree.win);
  if(e.id==='forcing-check-repetition')assert.ok(w.check&&q.mode==='repetition');
  if(e.id==='checking-draw-fortress')assert.ok(w.check&&q.mode==='repetition'&&w.initialBalance<0);
  if(e.id==='forced-own-stalemate-resource')assert.ok(played.piece!=='k'&&values[played.promotion||played.piece]>0&&w.offers.length&&q.mode==='stalemate');
 }return true;
}



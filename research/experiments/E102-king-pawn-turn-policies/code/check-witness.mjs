import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
const distance=(a,b)=>Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1]));
const points=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0);
// Exhaustive supplied-tree replay uses actual legal history, never solver caches.
export function checkQuery(query,c){
 assert.equal(query.rootFen,c.fen());const {actor,pawn,plies,allowKing}=query;assert.equal(query.initialBalance,points(c,actor));assert.equal(query.win,query.tree.win);
 const order=m=>m.from[0]+(actor==='w'?m.from[1]:9-+m.from[1])+m.to[0]+(actor==='w'?m.to[1]:9-+m.to[1])+(m.promotion||'');
 let visited=0;
 function replay(n,square,left){
  visited++;assert.equal(n.fen,c.fen());const unit=c.get(square);
  if(unit?.type==='q'&&unit.color===actor){
   assert.equal(n.kind,'queen-goal');assert.equal(n.square,square);const mate=c.isCheckmate()&&c.turn()!==actor;assert.equal(n.mate,mate);
   if(mate){assert.equal(n.win,true);assert.deepEqual(n.responses,[]);return;}
   if(c.isGameOver()||points(c,actor)<=query.initialBalance){assert.equal(n.win,false);assert.equal(n.terminal,c.isGameOver());assert.deepEqual(n.responses,[]);return;}
   assert.equal(n.terminal,false);assert.equal(c.turn(),actor==='w'?'b':'w');const moves=c.moves({verbose:true}).sort((a,b)=>order(a).localeCompare(order(b)));assert.ok(n.responses.length<=moves.length);let allGood=true;
   for(const [i,r] of n.responses.entries()){assert.equal(r.move,uci(moves[i]));c.move(moves[i]);try{assert.equal(r.fen,c.fen());const q=c.get(square),gain=points(c,actor)-query.initialBalance,terminal=c.isGameOver(),good=q?.type==='q'&&q.color===actor&&gain>0&&!terminal;assert.equal(r.gain,gain);assert.equal(r.terminal,terminal);assert.equal(r.good,good);if(!good){assert.equal(i,n.responses.length-1);allGood=false;}}finally{c.undo();}}
   if(allGood)assert.equal(n.responses.length,moves.length);assert.equal(n.win,allGood);return;
  }
  if(c.isGameOver()){assert.equal(n.kind,'terminal');assert.equal(n.win,false);assert.equal(n.reason,c.isCheckmate()?'mate':c.isStalemate()?'stalemate':c.isInsufficientMaterial()?'insufficient':c.isThreefoldRepetition()?'repetition':'fifty-move');return;}
  if(unit?.type!=='p'||unit.color!==actor){assert.equal(n.kind,'lost-pawn-or-nonqueen-promotion');assert.equal(n.win,false);assert.equal(n.square,square);assert.equal(n.type,unit?.type||null);return;}
  if(!left){assert.equal(n.kind,'limit');assert.equal(n.win,false);assert.equal(n.square,square);return;}
  const own=c.turn()===actor,promotion=pawn[0]+(actor==='w'?8:1),all=c.moves({verbose:true}),moves=(own&&!allowKing?all.filter(m=>m.from===square):all).sort((a,b)=>{const score=m=>!own?0:m.piece==='p'?(m.promotion==='q'?10000:100+(actor==='w'?+m.to[1]:9-+m.to[1])):10+(actor==='w'?+m.to[1]:9-+m.to[1])-distance(m.to,promotion);return score(b)-score(a)||order(a).localeCompare(order(b));});
  assert.equal(n.square,square);assert.deepEqual(n.moves,moves.map(uci));
  const child=(code,tree)=>{const m=moves.find(m=>uci(m)===code);assert.ok(m,'Missing legal move '+code);c.move(m);try{replay(tree,m.from===square&&m.piece==='p'?m.to:square,left-1);}finally{c.undo();}};
  if(n.kind==='choice'||n.kind==='counterchoice'){assert.equal(n.kind,own?'choice':'counterchoice');assert.equal(n.win,own);assert.equal(n.child.win,own);child(n.move,n.child);}
  else{assert.equal(n.kind,own?'all-fail':'all');assert.equal(n.win,!own);assert.deepEqual(n.branches.map(b=>b.move),moves.map(uci));for(const b of n.branches){assert.equal(b.child.win,!own);child(b.move,b.child);}}
 }
 replay(query.tree,pawn,plies);assert.equal(c.fen(),query.rootFen);return visited;
}
export function checkWitness(w,result,fixture){
 assert.equal(w.experiment,'E102');const h=validateHistory(fixture),c=legalPosition(h?.start||fixture.fen);for(const code of h?.moves||[])c.move(code);assert.equal(w.before,c.fen());assert.equal(w.actor,c.turn());const move=c.move(fixture.move);assert.equal(w.after,c.fen());assert.equal(result.after,c.fen());assert.equal(w.played.uci,uci(move));assert.equal(move.piece,'k');assert.ok(!move.captured);assert.equal(c.board().flat().filter(Boolean).length,3);
 assert.deepEqual(w.history,h?{fen:h.start,moves:h.moves}:null);const p=c.get(w.pawn);assert.equal(p.type,'p');assert.equal(p.color,w.actor);
 for(const [name,q] of Object.entries({actual:w.actual,pawnOnly:w.pawnOnly,restored:w.restored,flipped:w.flipped})){if(!q)continue;assert.equal(q.actor,w.actor);assert.equal(q.pawn,w.pawn);assert.equal(q.plies,result.kingPawnPolicyAnalysis.plies);assert.equal(q.allowKing,name!=='pawnOnly');let frame=c;
  if(name==='restored'){frame=legalPosition(c.fen());frame.remove(move.to);frame.put({type:'k',color:w.actor},move.from);const fields=frame.fen().split(' ');fields[3]='-';frame=legalPosition(fields.join(' '));}
  if(name==='flipped'){const fields=c.fen().split(' ');fields[1]=w.actor;fields[3]='-';frame=legalPosition(fields.join(' '));}
  checkQuery(q,frame);
 }
 const ids=[];if(w.actual.win){assert.ok(w.pawnOnly&&w.restored);ids.push('full-king-pawn-queen-policy');if(!w.pawnOnly.win){ids.push('required-king-continuation');if(['d4','e4','d5','e5'].includes(move.to))ids.push('central-king-full-route-support');}if(!w.restored.win)ids.push('bounded-key-square-entry');if(w.flipped&&!w.flipped.win)ids.push('bounded-defender-zugzwang','bounded-mutual-turn-disadvantage');}else{assert.equal(w.pawnOnly,null);assert.equal(w.restored,null);assert.equal(w.flipped,null);}
 const events=result.events.filter(e=>e.evidence?.experiment==='E102');assert.deepEqual(events.map(e=>e.id),ids);for(const e of events){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);assert.equal(e.evidence.before,w.before);assert.equal(e.evidence.after,w.after);for(const [name,key] of Object.entries(e.evidence.detail)){if(['query','full','restricted','counterfactual'].includes(name))assert.ok(w[key]);}}
 return true;
}

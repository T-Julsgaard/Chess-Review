import {Chess} from '../../../../lib/chess.js';import assert from 'node:assert/strict';
import {replayQuery} from '../../E037-promotion-routes/code/replay.mjs';
const values={p:1,n:3,b:3,r:5,q:9,k:0},uci=m=>m.from+m.to+(m.promotion||'');
const balance=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===actor?1:-1),0);
function passed(c,square,color){const dir=color==='w'?1:-1;return !c.board().flat().some(p=>p&&p.type==='p'&&p.color!==color&&Math.abs(p.square.charCodeAt(0)-square.charCodeAt(0))<=1&&(Number(p.square[1])-Number(square[1]))*dir>0);}
function independentRoute(c,actor,pawn,left){
 const start=balance(c,actor);let nodes=0;
 const charge=()=>{if(++nodes>50000)throw Error('focused negative replay budget exceeded');};
 const safe=target=>{charge();if(c.isCheckmate())return true;if(c.isGameOver()||balance(c,actor)<=start)return false;
  for(const move of c.moves({verbose:true})){c.move(uci(move));const good=!c.isGameOver()&&c.get(target)?.type==='q'&&c.get(target)?.color===actor&&balance(c,actor)>start;c.undo();if(!good)return false;}return true;};
 const solve=(square,n)=>{charge();if(c.isGameOver()||n<=0||c.get(square)?.type!=='p'||c.get(square)?.color!==actor)return false;
  const moves=c.moves({verbose:true});if(c.turn()===actor){for(const m of moves){if(m.from!==square||m.to[0]!==square[0]||m.promotion&&m.promotion!=='q')continue;
    c.move(uci(m));const win=m.promotion?safe(m.to):solve(m.to,n-1);c.undo();if(win)return true;}return false;}
  if(!moves.length)return false;for(const m of moves){c.move(uci(m));const win=solve(square,n);c.undo();if(!win)return false;}return true;};
 return solve(pawn,left);
}
export function checkWitness(w,result){
 const c=new Chess(w.history?.fen||w.before);for(const m of w.history?.moves||[]){assert.ok(!c.isGameOver());c.move(m);}
 assert.equal(c.fen(),w.before);const before=c.fen(),move=c.move(w.played.uci);assert.equal(c.fen(),w.after);assert.equal(move.piece,'p');assert.ok(!move.promotion);assert.ok(!c.isGameOver());
 assert.equal(passed(c,move.to,w.actor),true);assert.equal(w.afterProof.rootFen,c.fen());assert.equal(w.afterProof.pawn,move.to);assert.equal(w.afterProof.color,w.actor);assert.equal(w.afterProof.initialBalance,balance(c,w.actor));assert.ok(Number.isInteger(w.afterProof.depth)&&w.afterProof.depth>=1&&w.afterProof.depth<=6);assert.equal(w.afterProof.win,!!w.afterProof.tree);
 if(w.afterProof.win)replayQuery(c,w.afterProof);else assert.equal(independentRoute(c,w.actor,move.to,w.afterProof.depth),false);
 if(w.beforeProof){c.undo();assert.equal(c.fen(),before);assert.equal(w.beforeProof.rootFen,c.fen());assert.equal(w.beforeProof.pawn,move.from);assert.equal(w.beforeProof.color,w.actor);assert.equal(w.beforeProof.initialBalance,balance(c,w.actor));assert.equal(w.beforeProof.depth,w.afterProof.depth);assert.equal(w.beforeProof.win,!!w.beforeProof.tree);
  if(w.beforeProof.win)replayQuery(c,w.beforeProof);else assert.equal(independentRoute(c,w.actor,move.from,w.beforeProof.depth),false);c.move(w.played.uci);}
 const inventory=fen=>new Chess(fen).board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color}));
 assert.deepEqual(inventory(before),w.beforePieces);assert.deepEqual(inventory(w.after),w.afterPieces);
 assert.equal(w.purePawnEnding,[...w.beforePieces,...w.afterPieces].every(p=>'kp'.includes(p.type)));
 assert.deepEqual(w.pawnCounts,{own:w.beforePieces.filter(p=>p.type==='p'&&p.color===w.actor).length,enemy:w.beforePieces.filter(p=>p.type==='p'&&p.color!==w.actor).length});
 if(w.breakthrough){assert.equal(move.captured,'p');assert.ok(w.afterProof.win);assert.ok(w.beforeProof&&!w.beforeProof.win);assert.equal(passed(new Chess(before),move.from,w.actor),false);}
 if(w.reusedRouteEvent!==null&&result){const e=result.events[w.reusedRouteEvent];assert.equal(e.id,'promotion-route');assert.deepEqual(e.evidence.proof,w.afterProof);}
 return true;
}

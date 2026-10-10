import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
// Independent semantic replay adapted from frozen E106. Adds complete attempted
// prefixes and exact work; unlike the E184 KPK helper, handles pawn loss while
// other material remains. Imports no search/runtime/context implementation.
export function verifyPolicy(q,c){
 const {actor,pawn,plies,initialBalance}=q,score=()=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0);
 assert.ok(['w','b'].includes(actor));assert.ok(Number.isSafeInteger(plies)&&plies>=0&&plies<=6);assert.equal(c.fen(),q.rootFen);assert.equal(legalPosition(q.baselineFen).board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0),initialBalance);assert.ok(c.get(pawn)&&c.get(pawn).type!=='k');assert.equal(c.get(pawn).color,actor);assert.equal(q.win,q.tree.win);
 let cost=0,nodes=0,claims=false;const observe=()=>{claims||=c.isThreefoldRepetition()||c.isDrawByFiftyMoves();};
 function leaf(n){assert.equal(n.child,undefined);assert.equal(n.tried,undefined);assert.equal(n.branches,undefined);assert.equal(n.moves,undefined);}
 function replay(n,square,left){
  nodes++;cost++;observe();assert.equal(n.fen,c.fen());assert.equal(n.square,square);
  if(c.isCheckmate()){assert.equal(n.kind,'mate');assert.equal(n.win,c.turn()!==actor);leaf(n);return;}
  if(c.isDraw()){assert.equal(n.kind,'draw');assert.equal(n.win,false);leaf(n);return;}
  const p=square&&c.get(square);let successful=false;
  if(p?.type==='q'&&p.color===actor&&c.turn()!==actor){
   assert.ok(n.probe);const gain=score()-initialBalance;assert.equal(n.probe.gain,gain);const moves=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));let bad=false;
   if(gain<=0)assert.deepEqual(n.probe.responses,[]);else{
    assert.ok(n.probe.responses.length>0&&n.probe.responses.length<=moves.length);
    for(const [i,r] of n.probe.responses.entries()){assert.equal(r.move,uci(moves[i]));cost++;c.move(r.move);try{observe();assert.equal(r.fen,c.fen());assert.equal(r.gain,score()-initialBalance);const unit=c.get(square),good=unit?.type==='q'&&unit.color===actor&&r.gain>0&&!c.isGameOver();assert.equal(r.good,!!good);if(!good){assert.equal(i,n.probe.responses.length-1);bad=true;}}finally{c.undo();}}
    if(!bad)assert.equal(n.probe.responses.length,moves.length);successful=!bad;
   }assert.equal(n.probe.win,successful);
  }else assert.equal(n.probe??null,null);
  if(successful){assert.equal(n.kind,'queen');assert.equal(n.win,true);leaf(n);return;}
  if(!left){assert.equal(n.kind,'limit');assert.equal(n.win,false);leaf(n);return;}
  const own=c.turn()===actor,moves=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));assert.deepEqual(n.moves,moves.map(uci));
  const follow=(code,child)=>{const m=moves.find(m=>uci(m)===code);assert.ok(m);let next=square;if(square&&m.color===actor&&m.from===square)next=m.to;else if(square&&m.color!==actor&&(m.to===square||(m.isEnPassant()&&m.to[0]+m.from[1]===square)))next=null;cost++;c.move(m);try{replay(child,next,left-1);}finally{c.undo();}};
  if(n.kind==='choice'||n.kind==='counterchoice'){
   assert.equal(n.kind,own?'choice':'counterchoice');assert.equal(n.win,own);assert.equal(n.child.win,own);assert.equal(n.branches,undefined);assert.ok(Array.isArray(n.tried));const index=n.moves.indexOf(n.move);assert.ok(index>=0);assert.deepEqual(n.tried.map(b=>b.move),n.moves.slice(0,index));for(const b of n.tried){assert.equal(b.child.win,!own);follow(b.move,b.child);}follow(n.move,n.child);
  }else{assert.equal(n.kind,own?'all-fail':'all');assert.equal(n.win,!own);assert.equal(n.child,undefined);assert.equal(n.tried,undefined);assert.deepEqual(n.branches.map(b=>b.move),moves.map(uci));for(const b of n.branches){assert.equal(b.child.win,!own);follow(b.move,b.child);}}
 }
 replay(q.tree,pawn,plies);assert.equal(c.fen(),q.rootFen);return{cost,nodes,claims};
}

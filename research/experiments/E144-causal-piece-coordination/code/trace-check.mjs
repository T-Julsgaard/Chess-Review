// Adapted from E143's independent trace admission; frozen E143 is unchanged.
import assert from 'node:assert/strict';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
export function replayTrace(c,q,winner,H){
  assert.equal(q.rootFen,c.fen());assert.equal(q.winner,winner);assert.equal(q.plies,H);replayQuery(c,q);assert.ok(Array.isArray(q.searchTrace)&&q.searchTrace.length<=50000);let index=0,claim=false;
  const tick=()=>{assert.equal(q.searchTrace[index++],c.fen(),'Missing or altered exploration tick');if((c.isDrawByFiftyMoves()||c.isThreefoldRepetition())&&!c.isCheckmate())claim=true;};
  function walk(remaining){
    tick();if(c.isCheckmate())return{win:c.turn()!==winner,kind:'mate',fen:c.fen()};if(c.isDraw())return{win:false,kind:'draw',fen:c.fen()};if(!remaining)return{win:false,kind:'limit',fen:c.fen()};tick();
    const rank=m=>m.san.includes('#')?0:m.san.includes('+')?1:m.captured?2:3,moves=c.moves({verbose:true}).sort((a,b)=>rank(a)-rank(b)||code(a).localeCompare(code(b))),attacker=c.turn()===winner,branches=[];
    for(const m of moves){tick();c.move(code(m));let child;try{child=walk(remaining-1);}finally{c.undo();}if(child.win===attacker)return{win:attacker,kind:attacker?'choice':'counterchoice',move:code(m),child};branches.push({move:code(m),child});}
    assert.ok(moves.length);return{win:!attacker,kind:attacker?'all-fail':'all',branches};
  }
  assert.deepEqual(walk(H),q.tree);assert.equal(index,q.searchTrace.length);assert.equal(q.searchClaim,claim);return{nodes:index,claim};
}

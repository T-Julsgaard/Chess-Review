import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function traceQuery(c,q){
  assert.ok(Array.isArray(q.searchTrace)&&q.searchTrace.length<=50000);let index=0,searchClaim=false;
  const step=()=>{assert.equal(q.searchTrace[index++],c.fen(),'Missing or altered exploration tick');if((c.isDrawByFiftyMoves()||c.isThreefoldRepetition())&&!c.isCheckmate())searchClaim=true;};
  function walk(remaining){
    step();if(c.isCheckmate())return{win:c.turn()!==q.winner,kind:'mate',fen:c.fen()};if(c.isDraw())return{win:false,kind:'draw',fen:c.fen()};if(!remaining)return{win:false,kind:'limit',fen:c.fen()};step();
    const rank=m=>m.san.includes('#')?0:m.san.includes('+')?1:m.captured?2:3,legal=c.moves({verbose:true}).sort((a,b)=>rank(a)-rank(b)||code(a).localeCompare(code(b))),attacker=c.turn()===q.winner,branches=[];
    for(const m of legal){step();c.move(code(m));let child;try{child=walk(remaining-1);}finally{c.undo();}if(child.win===attacker)return{win:attacker,kind:attacker?'choice':'counterchoice',move:code(m),child};branches.push({move:code(m),child});}
    assert.ok(legal.length);return{win:!attacker,kind:attacker?'all-fail':'all',branches};
  }
  assert.deepEqual(walk(q.plies),q.tree);assert.equal(index,q.searchTrace.length);assert.equal(q.searchClaim,searchClaim);return searchClaim;
}
function claims(c,n){
  if(n.kind==='draw')return c.isDrawByFiftyMoves()||c.isThreefoldRepetition();if(['limit','mate'].includes(n.kind))return false;
  let yes=false;for(const b of n.child?[{move:n.move,child:n.child}]:n.branches){c.move(b.move);try{yes=claims(c,b.child)||yes;}finally{c.undo();}}return yes;
}
// Independent semantic admission, also used to refuse untrusted supplied panels.
export function verifyPanel(input,p){
  assert.equal(p.schema,'E143-complete-mate-panel-v2');assert.deepEqual(p.history,input.history||null);assert.equal(p.plies,input.forcingTempoPlies??2);
  const c=new Chess(input.history?.fen||input.fen);for(const move of input.history?.moves||[]){assert.equal(c.isGameOver(),false);c.move(move);}assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(c.isGameOver(),false);assert.equal(p.before,c.fen());assert.equal(p.actor,c.turn());
  const actor=c.turn(),opponent=actor==='w'?'b':'w',legal=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));assert.deepEqual(p.rows.map(r=>r.move),legal.slice(0,p.rows.length).map(code));assert.ok(p.rows.length>0);let claimContext=null,nodes=2+(input.history?.moves.length||0)+p.rows.length;
  for(const [i,row]of p.rows.entries()){
    const m=legal[i];assert.equal(row.san,m.san);assert.equal(row.from,m.from);assert.equal(row.piece,m.piece);assert.equal(row.capture,!!m.captured);assert.equal(row.promotion,!!m.promotion);c.move(row.move);
    try{
      assert.equal(row.after,c.fen());assert.equal(row.check,c.isCheck());assert.equal(row.mate,c.isCheckmate());
      for(const [key,winner]of [['actor',actor],['opponent',opponent]]){const q=row[key];assert.equal(q.winner,winner);assert.equal(q.plies,p.plies);const counts=replayQuery(c,q);nodes+=q.searchTrace.length+counts.nodes+counts.replies;const tracedClaim=traceQuery(c,q);if(claims(c,q.tree)||tracedClaim)claimContext=row.move;}
      assert.ok(!(row.actor.tree.win&&row.opponent.tree.win));
    }finally{c.undo();}
    if(claimContext)assert.equal(i,p.rows.length-1);
  }
  assert.equal(p.claimContext,claimContext);assert.equal(p.nodes,nodes);if(!claimContext)assert.equal(p.rows.length,legal.length);
  const actual=p.rows.find(r=>r.move===input.move);assert.ok(actual||claimContext);return{c,actor,actual,claimContext,nodes};
}
export function checkWitness(w,result,input){
  assert.equal(w.experiment,'E143');assert.ok(input.history);const {c,actor,actual,claimContext,nodes}=verifyPanel(input,w.panel),before=c.fen(),played=c.move(input.move),after=c.fen();
  assert.equal(w.before,before);assert.equal(w.after,after);assert.equal(result.after,after);assert.equal(w.actor,actor);assert.equal(w.played,code(played));assert.equal(w.san,played.san);assert.equal(result.forcingTempoAnalysis.nodes,nodes);assert.equal(result.forcingTempoAnalysis.limit,input.maxForcingTempoNodes??50000);assert.equal(result.forcingTempoAnalysis.plies,input.forcingTempoPlies??2);assert.ok(nodes<=result.forcingTempoAnalysis.limit);
  const events=result.events.filter(e=>e.evidence?.experiment==='E143'),quietLosses=[],defenses=[];
  if(!claimContext&&actual.check&&!actual.mate&&!actual.capture&&!actual.promotion&&actual.actor.tree.win){
    for(const r of w.panel.rows)if(r.from===actual.from&&r.piece===actual.piece&&!r.capture&&!r.promotion&&!r.check&&r.opponent.tree.win)quietLosses.push(r.move);
    const tree=actual.actor.tree;
    if(tree.kind==='all'&&tree.branches.every(b=>b.child.kind==='choice'&&b.child.child.kind==='mate'&&b.child.child.win)){
      for(const reply of c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)))){
        const branch=tree.branches.find(b=>b.move===code(reply));c.move(code(reply));const replyFen=c.fen(),mating=c.move(branch.child.move);assert.equal(c.isCheckmate(),true);defenses.push({reply:code(reply),replySan:reply.san,replyFen,mating:code(mating),matingSan:mating.san,mateFen:c.fen()});c.undo();c.undo();
      }
    }
  }
  assert.deepEqual(w.quietLosses,quietLosses);assert.deepEqual(w.defenses,defenses);
  const expected=[],add=(id,text)=>expected.push({id,text,qualityClaim:false,evidence:{experiment:'E143',before,after,detail:{source:'forcingTempoAnalysis.witness'}}});
  if(quietLosses.length&&defenses.length){const bad=w.panel.rows.find(r=>r.move===quietLosses[0]);add('forcing-tempo-window',`Tempo matters: ${played.san} forces mate within two plies; the same piece’s quiet ${bad.san} instead permits forced enemy mate.`);add('tactical-initiative',`Tactical initiative: ${played.san} demands a checking defense; every legal reply allows immediate mate, preventing the opponent’s otherwise certified counterattack.`);}
  assert.deepEqual(events,expected);assert.equal(result.forcingTempoAnalysis.status,claimContext?'claim-rule-prerequisite':expected.length?'proven':'compared');
}

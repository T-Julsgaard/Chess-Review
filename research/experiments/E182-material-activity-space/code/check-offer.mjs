import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {checkWitness} from '../../E165-comparative-sacrificial-attack/code/check-witness.mjs';
const uci=m=>m.from+m.to+(m.promotion||'');
const value={p:1,n:3,b:3,r:5,q:9,k:0};
const material=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+value[p.type]*(p.color===actor?1:-1),0);
const terminal=c=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()});
const metadata=m=>({move:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
const moves=c=>c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
// No E182 inspector, collector, context or derivation imported.
export function checkOffer(input,source,decision){
  assert.equal(input.attackPolicyTags,true);
  const H=input.attackPolicyPlies===undefined?2:input.attackPolicyPlies,cap=input.maxAttackPolicyNodes===undefined?50000:input.maxAttackPolicyNodes;
  assert.ok(Number.isSafeInteger(H)&&H>=0&&H<=3);assert.ok(Number.isSafeInteger(cap)&&cap>=0&&cap<=50000);
  const expected={experiment:'E182',status:'source-prerequisite',claims:{C0588:false,C0593:false},witness:null};
  if(!source?.attackPolicyAnalysis?.witness){assert.deepEqual(decision,expected);return true;}
  checkWitness(input,source);
  const p=source.attackPolicyAnalysis.witness.panel;
  if(p.claimContext){expected.status='claim-rule-prerequisite';assert.deepEqual(decision,expected);return true;}
  const c=new Chess(input.history.fen);for(const m of input.history.moves)c.move(m);
  const actor=c.turn(),before=c.fen(),baseline=material(c,actor),offered=moves(c).find(m=>uci(m)===input.move);
  c.move(input.move);const after=c.fen(),offerBalance=material(c,actor);
  function allChecking(n){
    if(!n.win)return false;
    if(n.kind==='mate')return c.isCheckmate()&&c.turn()!==actor;
    const own=c.turn()===actor;
    if(own&&n.kind!=='choice'||!own&&n.kind!=='all')return false;
    const branches=own?[{move:n.move,child:n.child}]:n.branches;
    let valid=branches.length>0;
    for(const b of branches){c.move(b.move);try{if(own&&!c.isCheck()||!allChecking(b.child))valid=false;}finally{c.undo();}}
    return valid;
  }
  const checkingPolicy=allChecking(p.rows.find(r=>r.move===input.move).actor.tree),acceptances=[];
  for(const m of moves(c)){
    if(m.captured!==offered.piece||metadata(m).victim!==offered.to)continue;
    c.move(uci(m));
    try{
      const replies=[],acceptedBalance=material(c,actor);
      for(const r of c.isGameOver()?[]:moves(c)){
        c.move(uci(r));try{const score=material(c,actor);replies.push({...metadata(r),fen:c.fen(),flags:terminal(c),balance:score,unrecoveredLoss:offerBalance-score});}finally{c.undo();}
      }
      let minimum=offerBalance-acceptedBalance;
      if(replies.length){minimum=Infinity;for(const r of replies)minimum=Math.min(minimum,r.unrecoveredLoss);}
      acceptances.push({...metadata(m),fen:c.fen(),flags:terminal(c),balance:acceptedBalance,nominalLoss:offerBalance-acceptedBalance,replies,minimumUnrecoveredLoss:minimum});
    }finally{c.undo();}
  }
  const quietMate=p.rows.find(r=>r.move===input.attackPolicyAlternative).actor.tree.win;
  let conceded=false,unrecovered=false;
  for(const a of acceptances)if(a.nominalLoss>0){conceded=true;if(a.minimumUnrecoveredLoss>0)unrecovered=true;}
  const initiative=checkingPolicy&&conceded;
  expected.status=initiative?'proven':'compared';expected.claims={C0588:initiative&&!quietMate&&unrecovered,C0593:initiative};
  expected.witness={before,after,actor,baseline,offerBalance,horizon:H,checkingPolicy,quietAlternative:input.attackPolicyAlternative,quietMate,acceptances};
  assert.deepEqual(decision,expected);return true;
}

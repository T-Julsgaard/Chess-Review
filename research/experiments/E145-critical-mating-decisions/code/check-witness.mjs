import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function summarize(panel,played){
  const actorMates=[],enemyMates=[],mechanicalDraws=[],unresolved=[];let actualRole;
  for(const row of panel.rows){let role;if(row.actor.tree.win){actorMates.push(row.move);role='actor-mate';}else if(row.opponent.tree.win){enemyMates.push(row.move);role='opponent-mate';}else{const c=new Chess(row.after);if(c.isStalemate()||c.isInsufficientMaterial()){mechanicalDraws.push(row.move);role='mechanical-draw';}else{unresolved.push(row.move);role='unresolved-within-bound';}}if(row.move===played)actualRole=role;}
  assert.ok(actualRole);return{actorMates,enemyMates,mechanicalDraws,unresolved,actualRole};
}
export function checkWitness(w,result,input){
  assert.equal(w.experiment,'E145');assert.deepEqual(w.history,input.history);assert.ok(input.history);const c=new Chess(input.history.fen),records=[];
  for(const move of input.history.moves){assert.equal(c.isGameOver(),false);const before=c.fen(),m=c.move(move);records.push({before,move:m});}assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(c.isGameOver(),false);
  const before=c.fen(),actor=c.turn(),played=c.move(input.move),after=c.fen(),H=input.criticalDecisionPlies??1;assert.equal(w.before,before);assert.equal(w.after,after);assert.equal(result.after,after);assert.equal(w.actor,actor);assert.equal(w.played,code(played));assert.equal(w.san,played.san);assert.equal(w.plies,H);
  const currentInput={fen:before,history:input.history,move:input.move,forcingTempoPlies:H},current=verifyPanel(currentInput,w.current);let context=current.claimContext?{kind:'current',detail:current.claimContext}:null,nodes=3+current.nodes,previousContext=null,previousSummary=null,currentSummary=null;
  if(records.length>=2){const r=records.at(-2);assert.equal(r.move.color,actor);previousContext={fen:r.before,history:{fen:input.history.fen,moves:input.history.moves.slice(0,-2)},move:code(r.move),forcingTempoPlies:H};}
  assert.deepEqual(w.previousContext,previousContext);
  if(!context){currentSummary=summarize(w.current,w.played);if(previousContext){assert.ok(w.previous);const prior=verifyPanel(previousContext,w.previous);assert.equal(prior.actor,actor);nodes+=prior.nodes;if(prior.claimContext)context={kind:'previous',detail:prior.claimContext};else previousSummary=summarize(w.previous,previousContext.move);}else assert.equal(w.previous,null);}else assert.equal(w.previous,null);
  assert.deepEqual(w.currentSummary,currentSummary);assert.deepEqual(w.previousSummary,previousSummary);assert.deepEqual(w.claimContext,context);const stakes=!!currentSummary?.actorMates.length&&!!currentSummary?.enemyMates.length,reversal=!!(!context&&stakes&&previousSummary?.actualRole==='opponent-mate');assert.equal(w.reversal,reversal);
  const a=result.criticalDecisionAnalysis;assert.equal(a.limit,input.maxCriticalDecisionNodes??50000);assert.equal(a.plies,H);assert.equal(a.nodes,nodes);assert.ok(nodes<=a.limit);
  const expected=[],add=(id,text)=>expected.push({id,text,qualityClaim:false,evidence:{experiment:'E145',before,after,detail:{source:'criticalDecisionAnalysis.witness'}}});
  if(!context&&stakes){add('critical-mating-position',`Critical mating choice: ${currentSummary.actorMates.length} legal moves force mate within ${H} continuation ${H===1?'ply':'plies'}; ${currentSummary.enemyMates.length} allow forced enemy mate. Unproved outcomes stay unresolved.`);if(reversal)add('critical-mating-reversal','Critical moment: after the recorded reply, the mating opportunity switched sides; your earlier move allowed enemy mate, but mate is now available.');}
  assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E145'),expected);assert.equal(a.status,context?'claim-rule-prerequisite':expected.length?'proven':'compared');
}

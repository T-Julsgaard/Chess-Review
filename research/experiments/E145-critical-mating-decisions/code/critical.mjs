import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {collectPanel} from '../../E143-forcing-tempo-initiative/code/panel.mjs';
import {verifyPanel} from '../../E143-forcing-tempo-initiative/code/check-witness.mjs';
import {panelContexts} from './contexts.mjs';
import {explainMove as parent,priority as inherited} from '../../E144-causal-piece-coordination/code/coordination.mjs';
export const priority=e=>e.evidence?.experiment==='E145'?187.8:inherited(e);
function summarize(panel,played){
  const actorMates=panel.rows.filter(r=>r.actor.tree.win).map(r=>r.move),enemyMates=panel.rows.filter(r=>r.opponent.tree.win).map(r=>r.move),mechanicalDraws=panel.rows.filter(r=>!r.actor.tree.win&&!r.opponent.tree.win&&(r.actor.tree.kind==='draw'&&r.opponent.tree.kind==='draw')).map(r=>r.move),unresolved=panel.rows.map(r=>r.move).filter(m=>![...actorMates,...enemyMates,...mechanicalDraws].includes(m)),actualRole=actorMates.includes(played)?'actor-mate':enemyMates.includes(played)?'opponent-mate':mechanicalDraws.includes(played)?'mechanical-draw':'unresolved-within-bound';return{actorMates,enemyMates,mechanicalDraws,unresolved,actualRole};
}
export function explainMove(input){
  const enabled=input.criticalDecisionTags===undefined?false:input.criticalDecisionTags;if(typeof enabled!=='boolean')throw Error('criticalDecisionTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxCriticalDecisionNodes===undefined?50000:input.maxCriticalDecisionNodes,H=input.criticalDecisionPlies===undefined?1:input.criticalDecisionPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxCriticalDecisionNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('criticalDecisionPlies must be integer0..2');
  const base=parent(input);let nodes=0,status='history-prerequisite',witness=null,events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E145-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,criticalDecisionAnalysis:{limit,plies:H,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{
    if(limit===0)throw Error('critical-decision-budget');nodes=1;const contexts=panelContexts(input,H);if(!contexts)return done();if(!contexts.live){status='not-live';return done();}if(limit<3)throw Error('critical-decision-budget');let work=3;
    const supplied=input.criticalDecisionPanels;if(supplied!==undefined&&(!supplied||typeof supplied!=='object'))throw Error('Expected critical-decision panels');if(!contexts.previous&&supplied?.previous!==undefined&&supplied.previous!==null)throw Error('Previous panel has no recorded history');
    const obtain=(name,ctx)=>{const remaining=limit-work;if(remaining<7+ctx.history.moves.length)throw Error('critical-decision-budget');const p=supplied===undefined?collectPanel(ctx,H,remaining):supplied[name];if(!p||typeof p!=='object')throw Error('Missing '+name+' panel');if(p.nodes>remaining)throw Error('critical-decision-budget');const verified=verifyPanel(ctx,p);work+=verified.nodes;if(work>limit)throw Error('critical-decision-budget');return p;};
    const current=obtain('current',contexts.current),c=legalPosition(contexts.current.fen),m=c.move(input.move),after=c.fen();if(after!==base.after)throw Error('Parent critical decision differs');
    witness={experiment:'E145',before:contexts.current.fen,after,actor:contexts.actor,history:input.history,played:input.move,san:m.san,plies:H,current,previousContext:contexts.previous,previous:null,currentSummary:null,previousSummary:null,claimContext:null,reversal:false};
    if(current.claimContext)witness.claimContext={kind:'current',detail:current.claimContext};else{
      witness.currentSummary=summarize(current,input.move);if(contexts.previous){witness.previous=obtain('previous',contexts.previous);if(witness.previous.claimContext)witness.claimContext={kind:'previous',detail:witness.previous.claimContext};else witness.previousSummary=summarize(witness.previous,contexts.previous.move);}
    }
    nodes=work;if(witness.claimContext){status='claim-rule-prerequisite';return done();}const s=witness.currentSummary,stakes=s.actorMates.length&&s.enemyMates.length;witness.reversal=!!(stakes&&witness.previousSummary?.actualRole==='opponent-mate');
    if(stakes){const extra=[],add=(id,text)=>{if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E145',before:witness.before,after,detail:{source:'criticalDecisionAnalysis.witness'}}});};add('critical-mating-position',`Critical mating choice: ${s.actorMates.length} legal moves force mate within ${H} continuation ${H===1?'ply':'plies'}; ${s.enemyMates.length} allow forced enemy mate. Unproved outcomes stay unresolved.`);if(witness.reversal)add('critical-mating-reversal','Critical moment: after the recorded reply, the mating opportunity switched sides; your earlier move allowed enemy mate, but mate is now available.');events=[...base.events,...extra];status='proven';}else status='compared';
  }catch(e){if(!['critical-decision-budget','forcing-tempo-budget'].includes(e.message))throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}return done();
}

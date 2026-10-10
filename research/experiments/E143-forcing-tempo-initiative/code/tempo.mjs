import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {collectPanel} from './panel.mjs';
import {verifyPanel} from './check-witness.mjs';
import {explainMove as parent,priority as inherited} from '../../E142-tactical-trade-judgments/code/trades.mjs';
export const priority=e=>e.evidence?.experiment==='E143'?187.5:inherited(e);
export function explainMove(input){
  const enabled=input.forcingTempoTags===undefined?false:input.forcingTempoTags;if(typeof enabled!=='boolean')throw Error('forcingTempoTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxForcingTempoNodes===undefined?50000:input.maxForcingTempoNodes,H=input.forcingTempoPlies===undefined?2:input.forcingTempoPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxForcingTempoNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('forcingTempoPlies must be integer0..2');
  const base=parent(input);let nodes=0,status='history-prerequisite',witness=null,events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E143-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,forcingTempoAnalysis:{limit,plies:H,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{
    if(limit===0)throw Error('forcing-tempo-budget');nodes=1;const h=validateHistory(input);if(!h)return done();const c=legalPosition(h.start);for(const m of h.moves)c.move(m);if(c.isGameOver()){status='not-live';return done();}
    const panel=input.forcingTempoPanel===undefined?collectPanel(input,H,limit):input.forcingTempoPanel;
    if(!panel||typeof panel!=='object')throw Error('Expected complete forcing-tempo panel');if(panel.nodes>limit)throw Error('forcing-tempo-budget');
    const checked=verifyPanel(input,panel);nodes=checked.nodes;if(nodes>limit)throw Error('forcing-tempo-budget');const before=c.fen(),actor=c.turn(),m=c.move(input.move),after=c.fen();if(after!==base.after)throw Error('Parent tempo differs');
    witness={experiment:'E143',before,after,actor,played:uci(m),san:m.san,panel,quietLosses:[],defenses:[]};if(checked.claimContext){status='claim-rule-prerequisite';return done();}
    const actual=checked.actual,tree=actual.actor.tree;
    if(actual.check&&!actual.mate&&!actual.capture&&!actual.promotion&&tree.win){
      witness.quietLosses=panel.rows.filter(r=>r.from===actual.from&&r.piece===actual.piece&&!r.capture&&!r.promotion&&!r.check&&r.opponent.tree.win).map(r=>r.move);
      if(tree.kind==='all'&&tree.branches.every(b=>b.child.kind==='choice'&&b.child.child.kind==='mate'&&b.child.child.win))for(const reply of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){
        const branch=tree.branches.find(b=>b.move===uci(reply));c.move(uci(reply));const replyFen=c.fen(),mating=c.move(branch.child.move);witness.defenses.push({reply:uci(reply),replySan:reply.san,replyFen,mating:uci(mating),matingSan:mating.san,mateFen:c.fen()});c.undo();c.undo();
      }
    }
    if(witness.quietLosses.length&&witness.defenses.length){const bad=panel.rows.find(r=>r.move===witness.quietLosses[0]),add=(id,text)=>{if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');return{id,text,qualityClaim:false,evidence:{experiment:'E143',before,after,detail:{source:'forcingTempoAnalysis.witness'}}};};events=[...base.events,add('forcing-tempo-window',`Tempo matters: ${m.san} forces mate within two plies; the same piece’s quiet ${bad.san} instead permits forced enemy mate.`),add('tactical-initiative',`Tactical initiative: ${m.san} demands a checking defense; every legal reply allows immediate mate, preventing the opponent’s otherwise certified counterattack.`)];status='proven';}else status='compared';
  }catch(e){if(e.message!=='forcing-tempo-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}
  return done();
}

import {explainMove as parent,priority as inherited} from '../../E172-return-material-stop-attack/code/return.mjs';
import {context} from './context.mjs';import {collectPanel} from './panel.mjs';import {verifyPanel} from './verify-panel.mjs';import {derive,texts} from './derive.mjs';
export const priority=e=>e.evidence?.experiment==='E173'?190.9:inherited(e);
export function explainMove(i){
  const enabled=i.planTags===undefined?false:i.planTags;if(typeof enabled!=='boolean')throw Error('planTags must be boolean');if(!enabled)return parent(i);
  const limit=i.maxPlanNodes===undefined?50000:i.maxPlanNodes,H=i.planPlies===undefined?3:i.planPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxPlanNodes must be integer0..50000');
  if(!Number.isSafeInteger(H)||H<1||H>3)throw Error('planPlies must be integer1..3');
  if(i.planObjective!==undefined){const o=i.planObjective;if(!o||typeof o!=='object'||Array.isArray(o)||Object.keys(o).sort().join(',')!=='kind,unit'||typeof o.kind!=='string'||typeof o.unit!=='string'||!/^[a-h][1-8]$/.test(o.unit))throw Error('planObjective must name exact kind/unit');}
  if(i.planAlternative!==undefined&&(typeof i.planAlternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(i.planAlternative)))throw Error('planAlternative must be UCI');
  if(i.planPanel!==undefined&&(!i.planPanel||typeof i.planPanel!=='object'||Array.isArray(i.planPanel)))throw Error('planPanel must be complete panel');
  const base=parent(i);let nodes=0,witness=null,status='not-applicable',events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E173-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,planAnalysis:{limit,nodes,plies:H,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted')return done();
  try{
    if(limit<3)throw Error('plan-budget');const ctx=context(i,H);nodes=ctx.work;if(nodes>limit)throw Error('plan-budget');if(ctx.status!=='ready'){status=ctx.status;return done();}
    const p=i.planPanel===undefined?collectPanel(ctx,limit-nodes):i.planPanel;if(p.nodes>limit-nodes)throw Error('plan-budget');const checked=verifyPanel(i,H,p);nodes+=checked.nodes;witness=derive(p,limit-nodes);nodes+=witness.work;
    if(witness.after!==base.after)throw Error('Parent plan endpoint differs');status=witness.objective?'proven':checked.claim?'claim-rule-prerequisite':'compared';
    const ids=[...(witness.objective?['declared-rook-entry-objective']:[]),...(witness.short?['complete-short-objective-plan']:[]),...(witness.formed?['comparative-objective-plan-formed']:[])];
    if(ids.length)events=[...base.events,...ids.map(id=>{const text=texts[id];if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');return{id,text,qualityClaim:false,evidence:{experiment:'E173',before:witness.before,after:witness.after,detail:{source:'planAnalysis.witness'}}};})];
  }catch(e){if(e.message!=='plan-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}
  return done();
}

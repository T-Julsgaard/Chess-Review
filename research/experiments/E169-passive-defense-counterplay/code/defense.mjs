import {explainMove as parent,priority as inherited} from '../../E168-forced-pawn-weakness/code/weakness.mjs';
import {context} from './context.mjs';
import {collectPanel} from './panel.mjs';
import {verifyPanel} from './verify-panel.mjs';
import {derive,texts} from './derive.mjs';
export const priority=e=>e.evidence?.experiment==='E169'?190.1:inherited(e);
export function explainMove(input){
  const enabled=input.defenseComparisonTags===undefined?false:input.defenseComparisonTags;if(typeof enabled!=='boolean')throw Error('defenseComparisonTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxDefenseComparisonNodes===undefined?50000:input.maxDefenseComparisonNodes,A=input.counterplayPlies===undefined?2:input.counterplayPlies,D=input.passiveLossPlies===undefined?3:input.passiveLossPlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxDefenseComparisonNodes must be integer0..50000');for(const H of [A,D])if(!Number.isSafeInteger(H)||H<0||H>3)throw Error('Defense query horizons must be integer0..3');
  if(input.defenseAlternative!==undefined&&(typeof input.defenseAlternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.defenseAlternative)))throw Error('defenseAlternative must be UCI');if(input.defenseComparisonPanel!==undefined&&(!input.defenseComparisonPanel||typeof input.defenseComparisonPanel!=='object'||Array.isArray(input.defenseComparisonPanel)))throw Error('defenseComparisonPanel must be complete panel');
  const base=parent(input);let nodes=0,witness=null,status='not-applicable',events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E169-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,defenseComparisonAnalysis:{limit,nodes,counterplayPlies:A,passiveLossPlies:D,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted')return done();
  try{if(limit<3)throw Error('defense-comparison-budget');const ctx=context(input,A,D);nodes=ctx.work;if(nodes>limit)throw Error('defense-comparison-budget');if(ctx.status!=='ready'){status=ctx.status;return done();}const p=input.defenseComparisonPanel===undefined?collectPanel(ctx,limit-nodes):input.defenseComparisonPanel;if(p.nodes>limit-nodes)throw Error('defense-comparison-budget');const checked=verifyPanel(input,A,D,p);nodes+=checked.nodes;witness=derive(input,p,limit-nodes);nodes+=witness.work;if(witness.after!==base.after)throw Error('Parent defense endpoint differs');status=witness.event?'proven':checked.claim?'claim-rule-prerequisite':'compared';if(witness.event){const text=texts[witness.event];if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');events=[...base.events,{id:witness.event,text,qualityClaim:false,evidence:{experiment:'E169',before:witness.before,after:witness.after,detail:{source:'defenseComparisonAnalysis.witness'}}}];}}
  catch(e){if(e.message!=='defense-comparison-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}return done();
}

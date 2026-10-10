import {explainMove as parent,priority as inherited} from '../../E173-declared-objective-plans/code/plans.mjs';import {context} from './context.mjs';import {collectPanel} from './panel.mjs';import {verifyPanel} from './verify-panel.mjs';import {derive,texts} from './derive.mjs';
export const priority=e=>e.evidence?.experiment==='E174'?191.1:inherited(e);
export function explainMove(i){
  const enabled=i.improvementTags===undefined?false:i.improvementTags;if(typeof enabled!=='boolean')throw Error('improvementTags must be boolean');if(!enabled)return parent(i);
  const limit=i.maxImprovementNodes===undefined?50000:i.maxImprovementNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxImprovementNodes must be integer0..50000');
  if(i.improvementTarget!==undefined&&(typeof i.improvementTarget!=='string'||!/^[a-h][1-8]$/.test(i.improvementTarget)))throw Error('improvementTarget must be square');
  if(i.improvementAlternative!==undefined&&(typeof i.improvementAlternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(i.improvementAlternative)))throw Error('improvementAlternative must be UCI');
  if(i.improvementPanel!==undefined&&(!i.improvementPanel||typeof i.improvementPanel!=='object'||Array.isArray(i.improvementPanel)))throw Error('improvementPanel must be complete panel');
  const base=parent(i);let nodes=0,witness=null,status='not-applicable',events=base.events;const done=()=>({...base,schema:'coach-concepts-E174-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,improvementAnalysis:{limit,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted')return done();
  try{if(limit<3)throw Error('improvement-budget');const ctx=context(i);nodes=ctx.work;if(nodes>limit)throw Error('improvement-budget');if(ctx.status!=='ready'){status=ctx.status;return done();}
    const p=i.improvementPanel===undefined?collectPanel(i,limit-nodes):i.improvementPanel;if(p.nodes>limit-nodes)throw Error('improvement-budget');nodes+=verifyPanel(i,p).nodes;witness=derive(i,p,limit-nodes);nodes+=witness.work;if(witness.after!==base.after)throw Error('Parent improvement endpoint differs');status=witness.improved?'proven':witness.claim?'claim-rule-prerequisite':'compared';
    const ids=[...(witness.improved?['comparative-piece-objective-improvement']:[]),...(witness.outpost?['new-outpost-with-objective-benefit']:[])];if(ids.length)events=[...base.events,...ids.map(id=>{const text=texts[id];if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');return{id,text,qualityClaim:false,evidence:{experiment:'E174',before:witness.before,after:witness.after,detail:{source:'improvementAnalysis.witness'}}};})];
  }catch(e){if(e.message!=='improvement-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}return done();
}

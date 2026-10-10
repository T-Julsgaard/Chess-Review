import {explainMove as parent,priority as inherited} from '../../E167-certified-threat-growth/code/threats.mjs';
import {context} from './context.mjs';
import {collectPanel} from './panel.mjs';
import {verifyPanel} from './verify-panel.mjs';
import {derive,eventId,text} from './derive.mjs';
export const priority=e=>e.evidence?.experiment==='E168'?189.9:inherited(e);
export function explainMove(input){
  const enabled=input.forcedWeaknessTags===undefined?false:input.forcedWeaknessTags;if(typeof enabled!=='boolean')throw Error('forcedWeaknessTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxForcedWeaknessNodes===undefined?50000:input.maxForcedWeaknessNodes,H=input.weaknessMatePlies===undefined?2:input.weaknessMatePlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxForcedWeaknessNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>3)throw Error('weaknessMatePlies must be integer0..3');
  if(input.weaknessPawn!==undefined&&(typeof input.weaknessPawn!=='string'||!/^[a-h][1-8]$/.test(input.weaknessPawn)))throw Error('weaknessPawn must be square');
  if(input.weaknessQuiet!==undefined&&(typeof input.weaknessQuiet!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.weaknessQuiet)))throw Error('weaknessQuiet must be UCI');
  if(input.forcedWeaknessPanel!==undefined&&(!input.forcedWeaknessPanel||typeof input.forcedWeaknessPanel!=='object'||Array.isArray(input.forcedWeaknessPanel)))throw Error('forcedWeaknessPanel must be complete panel');
  const base=parent(input);let nodes=0,witness=null,status='not-applicable',events=base.events;
  const done=()=>({...base,schema:'coach-concepts-E168-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,forcedWeaknessAnalysis:{limit,nodes,plies:H,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted')return done();
  try{
    if(limit<3)throw Error('forced-weakness-budget');const ctx=context(input,H);nodes=ctx.work;if(nodes>limit)throw Error('forced-weakness-budget');if(ctx.status!=='ready'){status=ctx.status;return done();}
    const p=input.forcedWeaknessPanel===undefined?collectPanel(ctx,limit-nodes):input.forcedWeaknessPanel;if(p.nodes>limit-nodes)throw Error('forced-weakness-budget');const checked=verifyPanel(input,H,p);nodes+=checked.nodes;
    witness=derive(p,limit-nodes);nodes+=witness.work;if(witness.after!==base.after)throw Error('Parent weakness endpoint differs');status=witness.forced?'proven':checked.claim?'claim-rule-prerequisite':'compared';
    if(witness.forced){if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');events=[...base.events,{id:eventId,text,qualityClaim:false,evidence:{experiment:'E168',before:witness.before,after:witness.after,detail:{source:'forcedWeaknessAnalysis.witness'}}}];}
  }catch(e){if(e.message!=='forced-weakness-budget')throw e;nodes=limit+1;status='exhausted';witness=null;events=base.events;}
  return done();
}

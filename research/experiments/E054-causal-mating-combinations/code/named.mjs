import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent,priority as prior} from '../../E053-cross-checks/code/cross.mjs';
const key=role=>[role.kind,role.accept,role.mate].join('/');
const definitions=[
 {id:'attraction-combination',label:'Attraction combination',eligible:r=>r.kind==='king-attraction'},
 {id:'decoy-combination',label:'Decoy combination',eligible:r=>['king-attraction','self-blocking-decoy'].includes(r.kind)},
 {id:'blocking-combination',label:'Blocking combination',eligible:r=>r.kind==='self-blocking-decoy'}
];
export const namedIds=new Set(definitions.map(d=>d.id));
export const priority=e=>e.id==='blocking-combination'?161.5:e.id==='attraction-combination'?161.4:e.id==='decoy-combination'?161.3:prior(e);
export function explainMove(input){
 const enabled=input.namedDecoyTags??false,limit=input.maxNamedDecoyNodes??50000;
 if(typeof enabled!=='boolean')throw Error('namedDecoyTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxNamedDecoyNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;
 let nodes=0,status='complete';const tick=()=>{if(++nodes>limit)throw Error('named-decoy-budget');};const extra=[];
 try{
  tick();const certificate=base.events.find(e=>e.id==='mating-decoy');
  if(certificate){
   const proof=certificate.evidence,color=new Chess(input.fen).turn(),prefix=color==='w'?'...':'';
   for(const definition of definitions){
    tick();const eligible=[];
    for(const role of proof.roles){tick();if(definition.eligible(role))eligible.push(role);}
    eligible.sort((a,b)=>key(a).localeCompare(key(b)));if(!eligible.length)continue;
    const selected=eligible[0];
    // The named conditional line belongs to the same all-defense mate proof.
    if(!proof.sacrifice.proof.tree.branches.some(b=>b.move===selected.accept&&b.child.win))throw Error('Unlinked causal acceptance');
    const line=definition.id==='blocking-combination'?`${selected.mateSan} mates with ${selected.blocker.square} blocked`:`${selected.mateSan}`;
    extra.push({id:definition.id,qualityClaim:false,text:`${definition.label}: if ${prefix}${selected.acceptSan}, ${line}; every legal defense permits mate next move.`,
     evidence:{parentEvent:'mating-decoy',beforeFen:new Chess(input.fen).fen(),afterFen:base.after,played:proof.sacrifice.played,color,
      nominalCost:proof.sacrifice.nominalLoss,defenses:proof.sacrifice.proof.tree.branches.map(b=>b.move).sort(),
      roleKeys:eligible.map(key),selectedRole:key(selected)}});
   }
  }
 }catch(error){if(error.message!=='named-decoy-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v35',events,comment,namedDecoyAnalysis:{limit,nodes,status}};
}

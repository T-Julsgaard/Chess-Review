import {conversionQuery} from '../../E106-ending-conversion-policies/code/policy.mjs';
import {admitProof} from './admit-proof.mjs';
import {controls,context,route,distance,ids} from './context.mjs';
function run(input,options,collect){
 const {enabled,H,limit}=controls(input,options);let nodes=0;
 const base={experiment:'E184',enabled,plies:H,limit,nodes:0,status:'disabled',claims:Object.fromEntries(ids.map(id=>[id,false])),witness:null};
 if(!enabled)return base;
 const tick=(n=1)=>{nodes+=n;if(nodes>limit)throw Error('king-route-budget');},done=status=>({...base,nodes,status});
 try{
  const x=context(input,options.alternative,tick);if(x.status!=='ready')return done(x.status);
  if(!collect&&!options.proofs)return done('proof-prerequisite');
  const actualRoute=route(x.played.slice(2,4),x.enemy,x.pawn,x.actor,tick),alternativeRoute=route(x.alternative.slice(2,4),x.enemy,x.pawn,x.actor,tick);
  const newlyBarred=alternativeRoute.shortestFirst.filter(s=>distance(s,x.played.slice(2,4))<=1&&distance(s,x.alternative.slice(2,4))>1);
  const shoulder=actualRoute.distance!==null&&alternativeRoute.distance!==null&&actualRoute.distance>alternativeRoute.distance&&newlyBarred.length>0;
  const queries={},audit={};
  for(const [key,move] of [['actual',x.played],['alternative',x.alternative]]){
   x.c.move(move);try{
    if(options.proofs){queries[key]=options.proofs[key];audit[key]=admitProof(queries[key],x.c,x.actor,x.pawn,H,x.before);tick(audit[key].cost);}
    else{const start=nodes;queries[key]=conversionQuery(x.c,x.actor,x.pawn,H,{tick},x.before);audit[key]=admitProof(queries[key],x.c,x.actor,x.pawn,H,x.before);if(audit[key].cost!==nodes-start)throw Error('Conversion cost mismatch');}
   }finally{x.c.undo();}
  }
  if(Object.values(audit).some(a=>a.claims))return done('claim-rule-prerequisite');
  const comparative=queries.actual.win&&!queries.alternative.win,shouldering=comparative&&shoulder,outflanking=comparative&&x.turning;
  return{...base,nodes,status:shouldering||outflanking?'proven':'bounded-unresolved',claims:{C0622:shouldering,C0639:shouldering,C0623:outflanking,C0638:outflanking},witness:{before:x.before,actual:x.actual,alternative:x.alternate,actor:x.actor,pawn:x.pawn,history:input.history,played:x.played,alternativeMove:x.alternative,previous:x.previous,turning:x.turning,actualRoute,alternativeRoute,newlyBarred,shoulder,queries,audit}};
 }catch(e){if(e.message!=='king-route-budget')throw e;return{...base,status:'exhausted',nodes:limit+1};}
}
export const evaluateKingRoute=(input,options={})=>run(input,options,true);
export const inspectKingRoute=(input,options={})=>run(input,options,false);

import assert from 'node:assert/strict';import {tracedConversionQuery} from '../../E184-king-route-conversion/code/trace-policy.mjs';import {verifyPolicy} from './verify-policy.mjs';import {controls,prepare,ids,queryKeys} from './context.mjs';
function run(input,options,collect){
 const {enabled,H,limit}=controls(input,options);let nodes=0;const base={experiment:'E186',enabled,plies:H,limit,nodes:0,status:'disabled',claims:Object.fromEntries(ids.map(id=>[id,false])),witness:null};if(!enabled)return base;
 const tick=(n=1)=>{nodes+=n;if(nodes>limit)throw Error('minor-context-budget');},done=status=>({...base,nodes,status});
 try{const x=prepare(input,options,tick);if(x.status!=='ready')return done(x.status);if(!collect&&!options.proofs)return done('proof-prerequisite');
  const queries={},audit={};for(const key of queryKeys){const c=x.frames[key];if(options.proofs){const q=options.proofs[key];assert.equal(q.actor,x.actor);assert.equal(q.pawn,x.pawn);assert.equal(q.plies,H);assert.equal(q.baselineFen,x.before);audit[key]=verifyPolicy(q,c);tick(audit[key].cost);queries[key]=q;}else{const start=nodes;queries[key]=tracedConversionQuery(c,x.actor,x.pawn,H,{tick},x.before);audit[key]=verifyPolicy(queries[key],c);assert.equal(audit[key].cost,nodes-start);}}
  if(Object.values(audit).some(a=>a.claims))return done('claim-rule-prerequisite');
  const difference=queries.actual.win&&queries.fresh.win&&!queries.replaced.win&&queries.context.win===queries.contextReplaced.win,open=difference&&x.piece.type==='b'&&x.actualType.type==='open',closed=difference&&x.piece.type==='n'&&x.actualType.type==='closed';
  const {frames,...context}=x;return{...base,nodes,status:open||closed?'proven':'bounded-unresolved',claims:{C0711:open,C0712:closed,C0714:closed},witness:{...context,frameFens:Object.fromEntries(queryKeys.map(k=>[k,frames[k].fen()])),queries,audit}};
 }catch(e){if(e.message!=='minor-context-budget')throw e;return{...base,status:'exhausted',nodes:limit+1};}
}
export const evaluateMinorContext=(input,options={})=>run(input,options,true);
export const inspectMinorContext=(input,options={})=>run(input,options,false);

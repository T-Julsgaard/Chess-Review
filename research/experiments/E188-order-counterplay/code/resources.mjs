import {controls,prepare} from './context.mjs';
import {collectProofs} from './collect.mjs';
import {verifyProofs} from './check-result.mjs';
import {plain} from '../../E183-recorded-initiative-turnover/code/plain.mjs';
function run(input,options,proofs,collect){
 const o=controls(input,options),r={schema:'E188-order-resources-v1',limit:o.limit,plies:o.H,nodes:0,status:'disabled',claims:{C0768:false,C0771:false,C0776:false},qualityClaim:false,witness:null,proofs:null};if(!o.enabled)return r;
 const x=prepare(input);r.status=x.status;if(x.status!=='ready')return r;const exhausted=()=>({...r,status:'exhausted',nodes:o.limit+1,witness:null,proofs:null});if(x.setup>o.limit)return exhausted();
 if(proofs===undefined){if(!collect)return{...r,nodes:x.setup,status:'proof-prerequisite'};try{proofs=collectProofs(input,o.H,o.limit);}catch(e){if(e.message==='order-resource-budget')return exhausted();throw e;}}
 plain(proofs);if(!proofs||!Number.isSafeInteger(proofs.nodes)||proofs.nodes<0)throw Error('Require complete proofs');if(proofs.nodes>o.limit)return exhausted();const checked=verifyProofs(input,o.H,proofs);r.nodes=checked.nodes;r.proofs=structuredClone(proofs);if(checked.claim)return{...r,status:'claim-rule-prerequisite'};
 const success=proofs.branches.length>0&&proofs.branches.every(b=>b.followup&&b.query?.tree.win),reverseWins=proofs.reverse.tree.win,actualResources=proofs.actualCaptures.rows.filter(q=>q.positive).map(q=>({capture:q.move,target:q.target,type:q.type,minimumGain:q.minimumGain})),removedResources=success&&!reverseWins&&proofs.actualCheck?proofs.reverseCaptures.rows.filter(q=>q.positive&&q.target===x.a.from&&q.type===x.a.piece&&!proofs.actualCaptures.rows.some(a=>a.target===x.a.to)).map(q=>({capture:q.move,original:q.target,current:x.a.to,type:q.type,minimumGain:q.minimumGain})):[];
 r.claims={C0768:success&&!reverseWins,C0771:actualResources.length>0,C0776:removedResources.length>0};r.witness={actor:proofs.actor,before:proofs.before,after:proofs.after,alternativeAfter:proofs.reverseFen,played:input.move,followup:input.followup,orderSuccess:success,reverseWins,actualResources,removedResources};r.status=Object.values(r.claims).some(Boolean)?'proven':'compared';return r;
}
export const evaluateOrderResources=(input,options={})=>run(input,options,undefined,true);
export const inspectOrderResources=(input,options={},proofs)=>run(input,options,proofs,false);

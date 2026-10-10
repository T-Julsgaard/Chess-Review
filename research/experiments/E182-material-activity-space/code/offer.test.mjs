import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {openResearchData} from '../../../data-policy.mjs';
import {inspectOffer} from './offer.mjs';
import {checkOffer} from './check-offer.mjs';
await openResearchData(['D001'],{purpose:'test'});
const {rows}=JSON.parse(gunzipSync(await readFile('research/experiments/E165-comparative-sacrificial-attack/evidence/results.json.gz')));
for(const index of [4,5])test(`saved queen offer ${index}: unrecovered concession and checking policy`,()=>{
  const {input,result}=rows[index],snapshot=structuredClone({input,result}),answer=inspectOffer(input,result);
  assert.deepEqual(answer.claims,{C0588:true,C0593:true});
  assert.equal(answer.witness.acceptances.length,1);
  assert.equal(answer.witness.acceptances[0].nominalLoss,9);
  assert.ok(answer.witness.acceptances[0].minimumUnrecoveredLoss>0);
  assert.deepEqual({input,result},snapshot);
});
test('a checking mate policy without a legal material acceptance is not a sacrifice',()=>{
  const {input,result}=rows[0];assert.deepEqual(inspectOffer(input,result).claims,{C0588:false,C0593:false});
});
test('missing helper and shorter bound withhold both claims',()=>{
  for(const i of [6,8]){const {input,result}=rows[i];assert.deepEqual(inspectOffer(input,result).claims,{C0588:false,C0593:false});}
});
test('missing witness, strict source controls and changed source cannot supply a positive',()=>{
  const {input,result}=rows[4];
  assert.equal(inspectOffer(input,{}).status,'source-prerequisite');
  for(const edit of [{attackPolicyTags:false},{attackPolicyPlies:null},{maxAttackPolicyNodes:null},{maxAttackPolicyNodes:50001}])assert.throws(()=>inspectOffer({...input,...edit},result));
  const changed=structuredClone(result);changed.attackPolicyAnalysis.witness.context.offerBalance++;
  assert.throws(()=>inspectOffer(input,changed));
  assert.throws(()=>inspectOffer(input,result,{unknown:true}));
});
test('independent offer checker rejects changed recovery ledger and claim',()=>{
  const {input,result}=rows[4],decision=inspectOffer(input,result);
  assert.equal(checkOffer(input,result,decision),true);
  const changed=structuredClone(decision);changed.witness.acceptances[0].minimumUnrecoveredLoss=0;
  assert.throws(()=>checkOffer(input,result,changed));
  const claim=structuredClone(decision);claim.claims.C0588=false;
  assert.throws(()=>checkOffer(input,result,claim));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {openResearchData} from '../../../data-policy.mjs';
import {evaluateSpace,inspectSpace} from './space.mjs';
import {checkSpace} from './check-space.mjs';
await openResearchData(['D001'],{purpose:'test'});
const fen=boardFen({a1:'K',a4:'P',b4:'P',e2:'P',h4:'P',h8:'k',a8:'r',e8:'r',c7:'n',g7:'n',a6:'p',b5:'p',e6:'p',h5:'p',d3:'p'});
const base={fen,history:{fen,moves:[]},move:'e2e4',materialAlternative:'e2d3'};
const black={...reflect(base),materialAlternative:'e7d6'};
const changed=edit=>{const c=new Chess(fen);edit(c);const next=c.fen();return {...base,fen:next,history:{fen:next,moves:[]}};};
for(const [color,input] of [['white',base],['black',black]]){
  const result=evaluateSpace(input);
  test(`${color}: capture alternative witnesses material foregone for causal space`,()=>{
    assert.equal(result.available,true);
    assert.equal(result.witness.material.alternativeGain,1);
    assert.equal(result.witness.material.foregone,1);
    assert.ok(result.witness.room.losses.length>0);
  });
  test(`${color}: saved admission and exact budget match collection`,()=>{
    const supplied={...input,materialSpacePanel:result.witness.panel};
    assert.deepEqual(inspectSpace(supplied),result);
    assert.deepEqual(evaluateSpace({...input,maxMaterialSpaceNodes:result.nodes}),{...result,limit:result.nodes});
    const exhausted=inspectSpace({...supplied,maxMaterialSpaceNodes:result.nodes-1});
    assert.equal(exhausted.status,'exhausted');assert.equal(exhausted.witness,null);assert.equal(exhausted.available,false);
    assert.equal(checkSpace(supplied,result),true);
    assert.equal(checkSpace({...supplied,maxMaterialSpaceNodes:result.nodes-1},exhausted),true);
  });
  test(`${color}: independent decision/frame/vector/material mutation rejection`,()=>{
    const supplied={...input,materialSpacePanel:result.witness.panel};
    for(const edit of [r=>{r.available=false;},r=>{r.witness.after=r.witness.before;},r=>{r.witness.room.vector[0].actual++;},r=>{r.witness.material.foregone++;}]){
      const altered=structuredClone(result);edit(altered);assert.throws(()=>checkSpace(supplied,altered));
    }
    assert.throws(()=>inspectSpace({...input,materialSpacePanel:null}));
    assert.throws(()=>evaluateSpace({...input,materialAlternative:'bogus'}));
  });
  test(`${color}: altered material and omitted legal counterreply rejected`,()=>{
    const panel=structuredClone(result.witness.panel);panel.balance++;
    assert.throws(()=>inspectSpace({...input,materialSpacePanel:panel}));
    const incomplete=structuredClone(result.witness.panel);
    const row=incomplete.variants.flatMap(v=>v.profile.options).find(o=>o.replies.length);
    row.replies.pop();assert.throws(()=>inspectSpace({...input,materialSpacePanel:incomplete}));
  });
}
test('no added territory, no affected unit, and no material gain withhold the claim',()=>{
  assert.equal(evaluateSpace({...base,move:'e2e3'}).available,false);
  assert.equal(evaluateSpace(changed(c=>{c.remove('c7');c.remove('g7');})).available,false);
  assert.equal(evaluateSpace({...changed(c=>c.remove('d3')),materialAlternative:'e2e3'}).available,false);
  assert.equal(evaluateSpace(changed(c=>c.remove('g7'))).available,true);
});
test('history, alternative, saved-panel and zero-budget prerequisites remain explicit',()=>{
  assert.equal(evaluateSpace({...base,history:undefined}).status,'history-prerequisite');
  assert.equal(evaluateSpace({...base,materialAlternative:undefined}).status,'alternative-prerequisite');
  assert.equal(inspectSpace(base).status,'panel-prerequisite');
  assert.equal(evaluateSpace({...base,maxMaterialSpaceNodes:0}).status,'exhausted');
  for(const cap of [null,-1,1.5,50001,'100'])assert.throws(()=>evaluateSpace({...base,maxMaterialSpaceNodes:cap}));
});
test('genuine en-passant history retains victim and material gain without inventing space',()=>{
  const start=boardFen({e1:'K',e5:'P',e8:'k',d7:'p'},'b');
  const c=new Chess(start);c.move('d7d5');
  const result=evaluateSpace({fen:c.fen(),history:{fen:start,moves:['d7d5']},move:'e5e6',materialAlternative:'e5d6'});
  assert.equal(result.available,false);
  assert.equal(result.witness.material.alternativeGain,1);
  const alternative=result.witness.panel.variants.find(v=>v.move==='e5d6');
  assert.equal(alternative.enPassant,true);assert.equal(alternative.victim,'d5');
});

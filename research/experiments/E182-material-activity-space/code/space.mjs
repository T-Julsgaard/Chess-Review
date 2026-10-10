import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {derive} from '../../E152-causal-space-room/code/derive.mjs';
import {collectPanel} from './space-panel.mjs';
import {verifyPanel} from './verify-space-panel.mjs';

function controls(input) {
  const limit=input.maxMaterialSpaceNodes===undefined?50000:input.maxMaterialSpaceNodes;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxMaterialSpaceNodes must be integer0..50000');
  if(input.materialAlternative!==undefined&&(typeof input.materialAlternative!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.materialAlternative)))throw Error('materialAlternative must be UCI string');
  if(input.materialSpacePanel!==undefined&&(!input.materialSpacePanel||typeof input.materialSpacePanel!=='object'||Array.isArray(input.materialSpacePanel)))throw Error('Expected material space panel');
  return limit;
}
function run(input,collect) {
  const limit=controls(input),answer={experiment:'E182',claim:'C0590',status:'history-prerequisite',limit,nodes:0,available:false,witness:null};
  if(!validateHistory(input))return answer;
  if(input.materialAlternative===undefined)return {...answer,status:'alternative-prerequisite'};
  if(!collect&&input.materialSpacePanel===undefined)return {...answer,status:'panel-prerequisite'};
  try {
    if(limit<3)throw Error('material-space-budget');
    const panel=input.materialSpacePanel===undefined?collectPanel(input,limit-3):input.materialSpacePanel;
    if(!panel||typeof panel!=='object')throw Error('Expected material space panel');
    if(!Number.isSafeInteger(panel.nodes)||panel.nodes<0)throw Error('Invalid panel node count');
    if(panel.nodes+3>limit)throw Error('material-space-budget');
    const {nodes}=verifyPanel(input,panel);
    const causal=derive({...input,spaceAlternative:input.materialAlternative},panel);
    const actual=panel.variants.find(v=>v.move===input.move),alternative=panel.variants.find(v=>v.move===input.materialAlternative);
    const material={before:panel.balance,actual:actual.balance,alternative:alternative.balance,foregone:alternative.balance-actual.balance,alternativeGain:alternative.balance-panel.balance};
    const available=Boolean(causal.room&&material.alternativeGain>=1&&material.foregone>0);
    return {...answer,status:panel.claimContexts.length?'claim-rule-prerequisite':available?'proven':'compared',nodes:nodes+3,available,witness:{...causal,experiment:'E182',material}};
  }catch(error){
    if(error.message!=='material-space-budget')throw error;
    return {...answer,status:'exhausted',nodes:limit+1};
  }
}
export const evaluateSpace=input=>run(input,true);
export const inspectSpace=input=>run(input,false);

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {verifyPanel as verifyOld} from '../../E152-causal-space-room/code/verify-panel.mjs';
import {verifyPanel} from './verify-space-panel.mjs';
// Explicit projection, never recollect or reinterpret a capturing E152 context.
export function projectSpace(input,original){
  const oldInput={...input,spaceAlternative:input.materialAlternative};
  verifyOld(oldInput,original);
  const material=fen=>new Chess(fen).board().flat().filter(Boolean).reduce((n,p)=>n+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color===original.actor?1:-1),0);
  const panel=structuredClone(original);panel.schema='E182-complete-material-space-panel-v1';panel.balance=material(panel.before);
  for(const variant of panel.variants)variant.balance=material(variant.state.fen);
  verifyPanel(input,panel);
  const stripped=structuredClone(panel);stripped.schema=original.schema;delete stripped.balance;for(const v of stripped.variants)delete v.balance;
  assert.deepEqual(stripped,original);
  return panel;
}

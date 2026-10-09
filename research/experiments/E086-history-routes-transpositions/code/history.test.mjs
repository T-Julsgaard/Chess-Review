import test from 'node:test';
import assert from 'node:assert/strict';
import {openResearchData} from '../../../data-policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
import {explainMove} from './history.mjs';
import {explainMove as parent} from '../../E085-immediate-mate-review/code/review.mjs';
import {bothColors} from './fixtures.mjs';
const input=f=>({fen:f.fen,move:f.move,history:f.history,comparisonHistory:f.comparisonHistory,scanReplies:false,routeTags:true});
for(const f of bothColors)test(f.id,()=>{
 const i=input(f),r=explainMove(i),p=parent({...i,routeTags:false});
 assert.deepEqual(r.events.slice(0,p.events.length),p.events);const extra=r.events.slice(p.events.length);
 for(const id of f.expected)assert.ok(extra.some(e=>e.id===id),id);if(!f.expected.length)assert.equal(extra.length,0);
 for(const e of extra){assert.equal(e.qualityClaim,false);assert.ok(e.text.split(/\s+/).length<=24);}
 assert.deepEqual(explainMove({...i,routeTags:false}),p);assert.deepEqual(explainMove({...i,routeTags:undefined}),p);
});
test('strict controls and comparison histories',()=>{
 const root=input(bothColors[0]);for(const flag of [null,1,'true',{},[]])assert.throws(()=>explainMove({...root,routeTags:flag}),/boolean/);
 for(const limit of [null,-1,50001,NaN,1.5,'1'])assert.throws(()=>explainMove({...root,maxHistoryRouteNodes:limit}),/integer/);
 for(const comparisonHistory of [null,{}, {fen:root.history.fen,moves:['b1b8']}])assert.throws(()=>explainMove({...root,comparisonHistory}),/comparisonHistory/);
});
test('atomic budgets',()=>{
 const root=input(bothColors[0]),full=explainMove(root),p=parent({...root,routeTags:false});
 for(const limit of [0,1,2,5,full.historyRouteAnalysis.nodes-1]){
  const r=explainMove({...root,maxHistoryRouteNodes:limit});assert.equal(r.historyRouteAnalysis.status,'exhausted');assert.deepEqual(r.events,p.events);assert.equal(r.historyRouteAnalysis.witness,null);
 }
});
test('history unavailable rather than invented',()=>{
 const f=bothColors[0],r=explainMove({fen:f.fen,move:f.move,routeTags:true,scanReplies:false});assert.equal(r.historyRouteAnalysis.status,'unavailable');
});
import {checkWitness} from './check-witness.mjs';
test('independent identity, route and full-endpoint checks',()=>{
 for(const f of bothColors){const w=explainMove(input(f)).historyRouteAnalysis.witness;if(!w)continue;assert.equal(checkWitness(w),true);
  for(const mutate of [w=>w.states.pop(),w=>w.selectedUnit='wnh1',w=>w.after=w.history.fen]){const bad=structuredClone(w);mutate(bad);assert.throws(()=>checkWitness(bad));}
  if(w.comparison){const bad=structuredClone(w);bad.comparison.sameEndpoint=!bad.comparison.sameEndpoint;assert.throws(()=>checkWitness(bad));}
 }
});
test('promoted/captured pieces and castle rook identities',()=>{
 const f={fen:'4k3/8/8/8/8/8/7P/R3K2R w KQ - 0 1',move:'e1g1',history:{fen:'4k3/8/8/8/8/8/7P/R3K2R w KQ - 0 1',moves:[]},routeTags:true,scanReplies:false};
 const r=explainMove(f);assert.equal(checkWitness(r.historyRouteAnalysis.witness),true);
 const i={fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',move:'a7a8q',history:{fen:'7k/P7/8/8/8/8/8/7K w - - 0 1',moves:[]},routeTags:true,scanReplies:false};
 const w=explainMove(i).historyRouteAnalysis.witness;assert.equal(checkWitness(w),true);assert.equal(w.units.find(p=>p.id==='wpa7').type,'q');
});

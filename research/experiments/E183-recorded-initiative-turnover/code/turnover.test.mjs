import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {Chess} from '../../../../lib/chess.js';
import {openResearchData} from '../../../data-policy.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {explainMove as tempoExplain} from '../../E143-forcing-tempo-initiative/code/tempo.mjs';
import {explainMove as defenseExplain} from '../../E169-passive-defense-counterplay/code/defense.mjs';
import {sourceArchive,dir} from './saved.mjs';
import {inspectTurnover,evaluateTurnover} from './turnover.mjs';
import {checkTurnover} from './check-turnover.mjs';
import {makeCase} from './cases.mjs';
import {solvePrior} from './policy.mjs';
await openResearchData(['D001'],{purpose:'test'});
const saved=await sourceArchive(),prior=JSON.parse(gunzipSync(await readFile(dir+'/evidence/prior-trees.json.gz')));
for(const row of saved.rows){
  const graph=prior.rows.find(r=>r.source===row.source&&r.color===row.color).graph,options={...row.options,priorTree:graph};
  test(`${row.source}/${row.color}: positive historical frames, actors and immutable inputs`,()=>{
    const before=structuredClone({input:row.input,result:row.result,options});
    const out=inspectTurnover(row.source,row.input,row.result,options);
    assert.deepEqual(out.claims,{C0595:true,C0596:true,C0597:row.source==='defense'});
    assert.equal(checkTurnover(row.source,row.input,row.result,options,out),true);
    assert.equal(out.witness.frames.currentBefore.fen,row.input.fen);
    assert.equal(out.witness.actors.seized,row.color);assert.notEqual(out.witness.actors.lost,row.color);
    assert.equal(out.witness.earlierBound,1);assert.equal(out.witness.currentBound,3);
    assert.deepEqual({input:row.input,result:row.result,options},before);
  });
  test(`${row.source}/${row.color}: exact fresh/saved and one-short atomic budgets`,()=>{
    const out=inspectTurnover(row.source,row.input,row.result,options);
    const exact={...options,maxTurnoverNodes:out.nodes},fresh={...exact};delete fresh.priorTree;
    assert.deepEqual(evaluateTurnover(row.source,row.input,row.result,fresh),inspectTurnover(row.source,row.input,row.result,exact));
    for(const collect of [false,true]){
      const opts={...exact,maxTurnoverNodes:out.nodes-1};if(collect)delete opts.priorTree;
      const short=(collect?evaluateTurnover:inspectTurnover)(row.source,row.input,row.result,opts);
      assert.equal(short.status,'exhausted');assert.equal(short.witness,null);assert.deepEqual(short.claims,{C0595:false,C0596:false,C0597:false});
    }
  });
  test(`${row.source}/${row.color}: registered negative prerequisites and quiet-role control`,()=>{
    for(let index=1;index<8;index++){
      const c=makeCase(row,index);let result=row.result;
      if(c.sourceRole==='quiet')result=row.source==='tempo'?tempoExplain({...c.input,forcingTempoPanel:row.result.forcingTempoAnalysis.witness.panel}):defenseExplain({...c.input,defenseComparisonPanel:row.result.defenseComparisonAnalysis.witness.panel});
      const supplied={...c.options,priorTree:graph},out=inspectTurnover(c.source,c.input,result,supplied);
      assert.deepEqual(out.claims,c.expected,c.id);assert.equal(checkTurnover(c.source,c.input,result,supplied,out),true);
    }
    assert.equal(inspectTurnover(row.source,row.input,row.result,row.options).status,'prior-tree-prerequisite');
  });
}
const tempo=saved.rows[0],defense=saved.rows[2],tempoGraph=prior.rows[0].graph,defenseGraph=prior.rows[2].graph;
test('strict source/options, custom serialization and altered original source reject',()=>{
  for(const edit of [{priorPlies:null},{priorPlies:4},{maxTurnoverNodes:null},{maxTurnoverNodes:50001},{priorTree:null},{priorAlternative:'bad'},{unknown:true}])assert.throws(()=>inspectTurnover(tempo.source,tempo.input,tempo.result,{...tempo.options,...edit}));
  assert.throws(()=>inspectTurnover('bad',tempo.input,tempo.result,tempo.options));
  for(const edit of [{forcingTempoTags:false},{forcingTempoPlies:null},{maxForcingTempoNodes:null}])assert.throws(()=>inspectTurnover('tempo',{...tempo.input,...edit},tempo.result,tempo.options));
  const custom=structuredClone(tempo.result);custom.toJSON=()=>tempo.result;assert.throws(()=>inspectTurnover('tempo',tempo.input,custom,tempo.options));
  const altered=structuredClone(tempo.result);altered.forcingTempoAnalysis.witness.panel.rows[0].san+='?';assert.throws(()=>inspectTurnover('tempo',tempo.input,altered,tempo.options));
});
test('earlier graph/schema/history/clock/outcome/cost corruption rejects',()=>{
  for(const edit of [g=>{g.schema='bad';},g=>{g.history.moves.push('a1a2');},g=>{g.tree[0].fen=g.before;},g=>{g.tree[0].outcome='w';},g=>{g.nodes++;}]){
    const graph=structuredClone(tempoGraph);edit(graph);assert.throws(()=>inspectTurnover('tempo',tempo.input,tempo.result,{...tempo.options,priorTree:graph}));
  }
});
test('independent ledger/frame/actor/policy/bound/claim mutation rejection',()=>{
  const options={...defense.options,priorTree:defenseGraph},out=inspectTurnover('defense',defense.input,defense.result,options);
  for(const edit of [r=>{r.claims.C0597=false;},r=>{r.witness.frames.prior.fen=r.witness.frames.currentBefore.fen;},r=>{r.witness.actors.lost=r.witness.actors.seized;},r=>{r.witness.priorValues[0].win=false;},r=>{r.witness.priorPolicy=[];},r=>{r.witness.currentBound++;},r=>{r.nodes++;}]){
    const changed=structuredClone(out);edit(changed);assert.throws(()=>checkTurnover('defense',defense.input,defense.result,options,changed));
  }
});
test('legal checking but unresolved earlier resource cannot supply turnover',()=>{
  const alternative='h5g4',input={fen:defense.input.history.fen,history:{fen:defense.input.history.fen,moves:[]},move:alternative,retrogradeCalculationPlies:0};
  const graph=collectTree(input,0,50000),options={...defense.options,priorAlternative:alternative,priorTree:graph};
  const out=inspectTurnover('defense',defense.input,defense.result,options);
  assert.equal(out.witness.currentChecking,true);assert.equal(out.witness.earlierChecking,false);assert.deepEqual(out.claims,{C0595:false,C0596:false,C0597:false});assert.equal(checkTurnover('defense',defense.input,defense.result,options,out),true);
});
test('terminal current mate proves loss but withholds ongoing takeover',()=>{
  const input={...tempo.input,move:'g5g8'},result=tempoExplain({...input,forcingTempoPanel:tempo.result.forcingTempoAnalysis.witness.panel}),options={...tempo.options,priorTree:tempoGraph};
  const out=inspectTurnover('tempo',input,result,options);assert.deepEqual(out.claims,{C0595:true,C0596:false,C0597:false});assert.equal(out.witness.frames.currentAfter.flags.mate,true);assert.equal(checkTurnover('tempo',input,result,options,out),true);
});
test('full branching earlier policy preserves unresolved defenses and rejects omitted edges',()=>{
  const alternative='h5g4',input={fen:defense.input.history.fen,history:{fen:defense.input.history.fen,moves:[]},move:alternative,retrogradeCalculationPlies:2};
  const graph=collectTree(input,2,50000),options={...defense.options,priorAlternative:alternative,priorPlies:2,priorTree:graph};
  const out=inspectTurnover('defense',defense.input,defense.result,options);
  assert.ok(graph.tree.some(n=>n.kind==='branch'));assert.equal(out.witness.earlierChecking,false);assert.equal(out.claims.C0595,false);assert.equal(checkTurnover('defense',defense.input,defense.result,options,out),true);
  const omitted=structuredClone(graph);omitted.tree.find(n=>n.edges.length).edges.pop();assert.throws(()=>inspectTurnover('defense',defense.input,defense.result,{...options,priorTree:omitted}));
});
test('full-tree solver retains all defenses and checking winning own choices',()=>{
  const input={...tempo.input,retrogradeCalculationPlies:2},graph=collectTree(input,2,50000);verifyTree(input,graph);
  let ticks=0;const solved=solvePrior(graph,'w',()=>ticks++);
  assert.equal(ticks,graph.tree.length);assert.equal(solved.values[0].checkingWin,true);
  for(const row of solved.policy){const node=graph.tree[row.node];if(node.kind!=='branch')continue;
    if(node.turn!=='w')assert.deepEqual(row.moves,node.edges.map(e=>e.move));
    else for(const move of row.moves){const edge=node.edges.find(e=>e.move===move);assert.equal(solved.values[edge.child].checkingWin,true);assert.equal(new Chess(graph.tree[edge.child].fen).isCheck(),true);}
  }
});
const focus=JSON.parse(gunzipSync(await readFile(dir+'/evidence/focus-results.json.gz')));
for(const row of focus.rows)test('saved focused '+row.id,()=>{
  if(row.sourceError){assert.equal(new Chess(row.input.fen).isDrawByFiftyMoves(),true);assert.throws(()=>tempoExplain(row.input),/terminal position/);}
  const out=inspectTurnover(row.source,row.input,row.result,row.options);assert.deepEqual(out,row.decision);assert.equal(checkTurnover(row.source,row.input,row.result,row.options,out),true);
});
test('source cap audit rejects forged matching caps below full proof cost',()=>{
  for(const row of saved.rows){
    const key=row.source==='tempo'?'forcingTempoAnalysis':'defenseComparisonAnalysis',capKey=row.source==='tempo'?'maxForcingTempoNodes':'maxDefenseComparisonNodes';
    const graph=prior.rows.find(r=>r.source===row.source&&r.color===row.color).graph,options={...row.options,priorTree:graph};
    const legitimate=inspectTurnover(row.source,row.input,row.result,options);assert.equal(checkTurnover(row.source,row.input,row.result,options,legitimate),true);
    for(const limit of [0,row.result[key].nodes-1]){
      const input={...row.input,[capKey]:limit},result=structuredClone(row.result);result[key].limit=limit;
      assert.throws(()=>inspectTurnover(row.source,input,result,options),/source cap/);
      assert.throws(()=>checkTurnover(row.source,input,result,options,legitimate),/source cap/);
    }
  }
});

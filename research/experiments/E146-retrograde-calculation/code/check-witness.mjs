import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {verifyTree} from './verify-tree.mjs';
// Separate recursive derivation: terminal anchoring and goal policies are not
// accepted merely because collection bytes or runtime labels match.
export function checkWitness(w,result,input){
  assert.equal(w.experiment,'E146');const g=w.graph;verifyTree(input,g);assert.equal(result.after,g.after);const goal=input.retrogradeCalculationGoal??null;assert.deepEqual(w.goal,goal);if(goal){assert.deepEqual(Object.keys(goal).sort(),['kind','piece','square','winner']);assert.equal(goal.kind,'checkmate');assert.equal(goal.winner,g.actor);assert.ok(['p','n','b','r','q'].includes(goal.piece));assert.match(goal.square,/^[a-h][1-8]$/);}
  const outcomes=Array(g.tree.length),goalRanks=Array(g.tree.length).fill(null);
  function solve(id){const n=g.tree[id];if(n.kind!=='branch'){outcomes[id]={outcome:n.outcome,rank:n.outcome===null?null:0};if(goal&&n.kind==='mate'&&n.outcome===goal.winner){const p=new Chess(n.fen).get(goal.square);if(p&&p.type===goal.piece&&p.color===goal.winner)goalRanks[id]=0;}return;}
    for(const edge of n.edges)solve(edge.child);const children=n.edges.map(e=>outcomes[e.child]),own=children.filter(c=>c.outcome===n.turn);let outcome=null,rank=null;
    if(own.length){outcome=n.turn;rank=own.reduce((best,c)=>Math.min(best,c.rank),Infinity)+1;}else if(!children.some(c=>c.outcome===null)){outcome=children.some(c=>c.outcome==='draw')?'draw':n.turn==='w'?'b':'w';rank=children.reduce((worst,c)=>Math.max(worst,c.rank),0)+1;}outcomes[id]={outcome,rank};
    if(goal){const ranks=n.edges.map(e=>goalRanks[e.child]);if(n.turn===goal.winner){for(const r of ranks)if(r!==null&&(goalRanks[id]===null||r+1<goalRanks[id]))goalRanks[id]=r+1;}else if(!ranks.includes(null))goalRanks[id]=Math.max(...ranks)+1;}
  }
  solve(0);assert.deepEqual(w.outcomes,outcomes);assert.deepEqual(w.goalRanks,goalRanks);const policy=[];
  function walk(id){const n=g.tree[id],rank=goalRanks[id],selected=[];if(n.kind==='branch')for(const e of n.edges)if(n.turn!==goal.winner||goalRanks[e.child]+1===rank&&goalRanks[e.child]!==null)selected.push(e);policy.push({node:id,rank,moves:selected.map(e=>e.move)});for(const e of selected){assert.ok(goalRanks[e.child]!==null&&goalRanks[e.child]<rank);walk(e.child);}}
  if(goal&&goalRanks[0]!==null)walk(0);assert.deepEqual(w.policy,policy);const a=result.retrogradeCalculationAnalysis;assert.deepEqual(a.witness,w);assert.equal(a.plies,input.retrogradeCalculationPlies??2);assert.equal(a.limit,input.maxRetrogradeCalculationNodes??50000);assert.equal(a.nodes,1+g.nodes+2*g.tree.length);assert.ok(a.nodes<=a.limit);
  const expected=[],add=(id,text)=>expected.push({id,text,qualityClaim:false,evidence:{experiment:'E146',before:g.before,after:g.after,detail:{source:'retrogradeCalculationAnalysis.witness'}}});
  if(!g.claimNodes.length){const root=outcomes[0];if(root.outcome==='draw')add('resolved-calculation-stop','Calculation stopping point: the terminal-anchored minimax outcome is draw; every relevant legal continuation was resolved within the declared bound.');else if(root.outcome!==null)add('resolved-calculation-stop',`Calculation stopping point: ${root.outcome==='w'?'White':'Black'} can force mate within ${root.rank} continuation plies; unresolved alternatives do not change this certified outcome.`);if(goal&&goalRanks[0]!==null&&goalRanks[0]>0)add('backward-mating-goal',`Backward mating plan: work from ${goal.piece.toUpperCase()} on ${goal.square} at checkmate; the certified policy covers every defense within ${goalRanks[0]} continuation plies.`);}
  assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E146'),expected);assert.equal(a.status,g.claimNodes.length?'claim-rule-prerequisite':expected.length?'proven':'unresolved');
}

import {Chess} from '../../../../lib/chess.js';
import {collectTree} from './tree.mjs';
import {verifyTree} from './verify-tree.mjs';
import {explainMove as parent,priority as inherited} from '../../E145-critical-mating-decisions/code/critical.mjs';
export const priority=e=>e.evidence?.experiment==='E146'?187.9:inherited(e);
function goalInput(value,actor){if(value===undefined)return null;if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='kind,piece,square,winner'||value.kind!=='checkmate'||value.winner!==actor||!['p','n','b','r','q'].includes(value.piece)||!/^[a-h][1-8]$/.test(value.square))throw Error('Expected explicit own-piece checkmate goal');return value;}
function passes(g,goal,tick){
  const outcomes=Array(g.tree.length),goalRanks=Array(g.tree.length).fill(null);
  for(let i=g.tree.length-1;i>=0;i--){tick();const n=g.tree[i];let outcome=n.outcome,rank=outcome===null?null:0;
    if(n.kind==='branch'){const children=n.edges.map(e=>outcomes[e.child]),wins=children.filter(r=>r.outcome===n.turn);if(wins.length){outcome=n.turn;rank=1+Math.min(...wins.map(r=>r.rank));}else if(children.every(r=>r.outcome!==null)){outcome=children.some(r=>r.outcome==='draw')?'draw':n.turn==='w'?'b':'w';rank=1+Math.max(...children.map(r=>r.rank));}}
    outcomes[i]={outcome,rank};
  }
  for(let i=g.tree.length-1;i>=0;i--){tick();const n=g.tree[i];if(!goal)continue;if(n.kind==='mate'&&n.outcome===goal.winner){const p=new Chess(n.fen).get(goal.square);if(p?.type===goal.piece&&p.color===goal.winner)goalRanks[i]=0;}
    else if(n.kind==='branch'){const ranks=n.edges.map(e=>goalRanks[e.child]);if(n.turn===goal.winner){const wins=ranks.filter(r=>r!==null);if(wins.length)goalRanks[i]=1+Math.min(...wins);}else if(ranks.every(r=>r!==null))goalRanks[i]=1+Math.max(...ranks);}
  }
  const policy=[];function visit(id){const n=g.tree[id],rank=goalRanks[id];if(rank===null)return;const edges=n.kind!=='branch'?[]:n.edges.filter(e=>n.turn!==goal.winner||goalRanks[e.child]===rank-1);policy.push({node:id,rank,moves:edges.map(e=>e.move)});for(const e of edges)visit(e.child);}if(goal&&goalRanks[0]!==null)visit(0);return{outcomes,goalRanks,policy};
}
export function explainMove(input){
  const enabled=input.retrogradeCalculationTags===undefined?false:input.retrogradeCalculationTags;if(typeof enabled!=='boolean')throw Error('retrogradeCalculationTags must be boolean');if(!enabled)return parent(input);
  const H=input.retrogradeCalculationPlies===undefined?2:input.retrogradeCalculationPlies,limit=input.maxRetrogradeCalculationNodes===undefined?50000:input.maxRetrogradeCalculationNodes;if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('retrogradeCalculationPlies must be integer0..2');if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxRetrogradeCalculationNodes must be integer0..50000');const goal=goalInput(input.retrogradeCalculationGoal,new Chess(input.fen).turn());
  const base=parent(input);let nodes=0,witness=null,status='history-prerequisite',events=base.events;const done=()=>({...base,schema:'coach-concepts-E146-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,retrogradeCalculationAnalysis:{limit,plies:H,nodes,status,witness}}),tick=()=>{if(++nodes>limit)throw Error('retrograde-budget');};if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{tick();if(input.history===undefined)return done();if(limit-nodes<5+input.history.moves.length)throw Error('retrograde-budget');const supplied=input.retrogradeCalculationGraph,g=supplied===undefined?collectTree(input,H,limit-nodes):supplied;if(!g||typeof g!=='object')throw Error('Expected continuation graph');if(g.nodes>limit-nodes)throw Error('retrograde-budget');const admitted=verifyTree(input,g);nodes+=admitted.nodes;if(g.after!==base.after)throw Error('Parent endpoint differs');const derived=passes(g,goal,tick);witness={experiment:'E146',graph:g,goal,...derived};if(g.claimNodes.length){status='claim-rule-prerequisite';return done();}
    const extra=[],add=(id,text)=>{if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E146',before:g.before,after:g.after,detail:{source:'retrogradeCalculationAnalysis.witness'}}});},root=derived.outcomes[0];
    if(root.outcome==='draw')add('resolved-calculation-stop','Calculation stopping point: the terminal-anchored minimax outcome is draw; every relevant legal continuation was resolved within the declared bound.');
    else if(root.outcome!==null)add('resolved-calculation-stop',`Calculation stopping point: ${root.outcome==='w'?'White':'Black'} can force mate within ${root.rank} continuation plies; unresolved alternatives do not change this certified outcome.`);
    if(goal&&derived.goalRanks[0]>0)add('backward-mating-goal',`Backward mating plan: work from ${goal.piece.toUpperCase()} on ${goal.square} at checkmate; the certified policy covers every defense within ${derived.goalRanks[0]} continuation plies.`);
    if(extra.length){events=[...base.events,...extra];status='proven';}else status='unresolved';
  }catch(e){if(e.message!=='retrograde-budget')throw e;nodes=limit+1;witness=null;events=base.events;status='exhausted';}return done();
}

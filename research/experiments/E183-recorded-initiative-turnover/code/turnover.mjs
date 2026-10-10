import {Chess} from '../../../../lib/chess.js';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {controls,admit,historyContext} from './context.mjs';
import {solvePrior,queryChecks} from './policy.mjs';
function run(source,input,result,options,collect){
  const {limit,H,key}=controls(source,input,options);let nodes=0;
  const answer={experiment:'E183',source,status:'history-prerequisite',limit,nodes:0,claims:{C0595:false,C0596:false,C0597:false},witness:null};
  const done=status=>({...answer,status,nodes}),tick=(n=1)=>{nodes+=n;if(nodes>limit)throw Error('turnover-budget');};
  try{
    tick(2);const h=validateHistory(input);if(!h)return done('history-prerequisite');if(!h.moves.length)return done('history-span-prerequisite');
    const sourceAnalysis=result?.[key],w=sourceAnalysis?.witness;if(!w)return done('source-prerequisite');
    const sourceCap=source==='tempo'?(input.maxForcingTempoNodes===undefined?50000:input.maxForcingTempoNodes):(input.maxDefenseComparisonNodes===undefined?50000:input.maxDefenseComparisonNodes);
    if(!Number.isSafeInteger(sourceAnalysis.nodes)||sourceAnalysis.nodes<0||sourceAnalysis.nodes>sourceCap)throw Error('Source proof exceeds declared source cap');
    admit(source,input,result,w);tick(sourceAnalysis.nodes);
    const ctx=historyContext(input,H,options.priorAlternative);tick(ctx.work);if(ctx.status!=='ready')return done(ctx.status);
    if(source==='tempo'?w.panel.claimContext:w.claim)return done('claim-rule-prerequisite');
    if(!collect&&options.priorTree===undefined)return done('prior-tree-prerequisite');
    const graph=options.priorTree===undefined?collectTree(ctx.priorInput,H,limit-nodes):options.priorTree;
    verifyTree(ctx.priorInput,graph);tick(graph.nodes);
    const {values,policy}=solvePrior(graph,ctx.previousActor,tick);
    if(graph.claimNodes.length)return done('claim-rule-prerequisite');
    const query=source==='tempo'?w.panel.rows.find(r=>r.move===input.move).actor:w.panel.variants.find(v=>v.move===input.move).own;
    const c=new Chess(input.history.fen);for(const move of input.history.moves)c.move(move);c.move(input.move);
    const currentChecking=ctx.currentAfter.checked&&queryChecks(c,query.tree,ctx.actor),earlierChecking=values[0].checkingWin;
    const loss=earlierChecking&&currentChecking,live=!Object.values(ctx.currentAfter.flags).some(Boolean),seized=loss&&live,counter=seized&&ctx.currentBefore.checked;
    return {...answer,status:loss?'proven':'bounded-unresolved',nodes,claims:{C0595:loss,C0596:seized,C0597:counter},witness:{source,priorInput:ctx.priorInput,priorTree:graph,priorValues:values,priorPolicy:policy,frames:{prior:ctx.prior,currentBefore:ctx.currentBefore,currentAfter:ctx.currentAfter},previous:ctx.previous,current:ctx.current,priorAlternative:ctx.priorMove,actors:{lost:ctx.previousActor,seized:ctx.actor},earlierBound:H+1,currentBound:query.plies+1,earlierChecking,currentChecking}};
  }catch(e){if(e.message!=='turnover-budget')throw e;return {...answer,status:'exhausted',nodes:limit+1};}
}
export const inspectTurnover=(source,input,result,options={})=>run(source,input,result,options,false);
export const evaluateTurnover=(source,input,result,options={})=>run(source,input,result,options,true);

import {Chess} from '../../../../lib/chess.js';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {collectTree} from '../../E146-retrograde-calculation/code/tree.mjs';
import {verifyTree} from '../../E146-retrograde-calculation/code/verify-tree.mjs';
import {decisions,quietIds} from './scopes.mjs';
export function evaluateQuiet(input){
  const H=input.quietPlies===undefined?2:input.quietPlies,limit=input.maxQuietNodes===undefined?50000:input.maxQuietNodes;
  if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('quietPlies must be integer0..2');
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxQuietNodes must be integer0..50000');
  let nodes=0,graph=null,status='history-prerequisite',noisy=[],terminal=[];
  const done=()=>({schema:'E180-quiet-v1',limit,plies:H,nodes,status,graph,noisy,terminal,decisions:decisions(quietIds,status,graph?{source:'E146',frame:'after-actual',fen:graph.after,actor:graph.actor,plies:H,frontier:'unresolved beyond declared horizon',nodes:graph.tree.length}:null)});
  const tick=()=>{if(++nodes>limit)throw Error('quiet-budget');};
  try{
    tick();const history=validateHistory(input);if(!history)return done();
    const c=new Chess(history.start);for(const move of history.moves){if(c.isGameOver())throw Error('History-terminal position');c.move(move);}if(c.isGameOver())throw Error('History-terminal position');c.move(input.move);tick();
    if(H!==2){status='horizon-prerequisite';return done();}
    const supplied=input.quietPanel,g=supplied===undefined?collectTree(input,H,limit-nodes):supplied;
    if(!g||typeof g!=='object'||!Number.isSafeInteger(g.nodes)||g.nodes<0)throw Error('Expected complete quiet continuation graph');
    if(g.nodes>limit-nodes)throw Error('quiet-budget');
    const admitted=verifyTree({...input,retrogradeCalculationPlies:H},g);nodes+=admitted.nodes;graph=g;
    for(const n of g.tree){tick();if(!['branch','limit'].includes(n.kind))terminal.push({node:n.id,kind:n.kind});for(const e of n.edges){tick();const reason=e.move.length>4?'promotion':e.san.includes('x')?'capture':/[+#]/.test(e.san)?'check':null;if(reason)noisy.push({parent:n.id,move:e.move,san:e.san,child:e.child,reason});}}
    status=g.claimNodes.length?'claim-rule-prerequisite':terminal.length?'terminal-prerequisite':new Chess(g.after).isCheck()?'checked-frame-prerequisite':noisy.length?'noisy-continuation':'available';return done();
  }catch(e){if(!['quiet-budget','retrograde-budget'].includes(e.message))throw e;nodes=limit+1;graph=null;noisy=[];terminal=[];status='exhausted';return done();}
}

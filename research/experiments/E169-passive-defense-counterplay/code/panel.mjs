import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {describe,flags} from '../../E153-second-target-defense/code/panel.mjs';
import {tracedQuery} from '../../E144-causal-piece-coordination/code/query.mjs';
export function collectPanel(ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('defense-comparison-budget');},i=ctx.config,c=legalPosition(i.history.fen);tick();for(const m of i.history.moves){tick();c.move(m);}
  const actor=c.turn(),enemy=actor==='w'?'b':'w',state=()=>({fen:c.fen(),flags:flags(c)}),p={schema:'E169-defense-comparison-panel-v1',config:i,roles:ctx.roles,actor,root:state(),variants:[],nodes:0};
  for(const code of i.moves){tick();const played=c.move(code),v={move:code,role:code===ctx.roles.quiet?'quiet':'active',played:describe(played),state:state(),legal:c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))).map(describe),own:tracedQuery(c,actor,i.counterplayPlies,tick),enemy:tracedQuery(c,enemy,i.passiveLossPlies,tick)};p.variants.push(v);c.undo();}
  p.nodes=nodes;return p;
}

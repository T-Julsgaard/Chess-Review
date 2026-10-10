import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';import {describe,flags,balance} from '../../E153-second-target-defense/code/panel.mjs';import {tracedQuery} from '../../E144-causal-piece-coordination/code/query.mjs';
export function collectPanel(ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('counterthreat-budget');},i=ctx.config,c=legalPosition(i.history.fen);tick();for(const m of i.history.moves){tick();c.move(m);}
  const actor=c.turn(),state=()=>({fen:c.fen(),balance:balance(c,actor),flags:flags(c)}),inventory=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),p={schema:'E170-capture-deterrence-panel-v1',config:i,actor,victim:{square:i.victim,type:c.get(i.victim).type,color:c.get(i.victim).color},rootAttackers:ctx.rootAttackers,root:state(),variants:[],nodes:0};
  for(const move of i.moves){tick();const played=c.move(move),v={played:describe(played),state:state(),legal:inventory().map(describe),replies:[]};for(const defense of inventory()){
    tick();c.move(uci(defense));const captures=describe(defense).victim===i.victim,r={played:describe(defense),state:state(),query:tracedQuery(c,actor,i.plies,tick),counterLegal:captures?inventory().map(describe):[],counters:[]};if(captures)for(const reply of inventory()){tick();c.move(uci(reply));r.counters.push({played:describe(reply),state:state()});c.undo();}v.replies.push(r);c.undo();
  }p.variants.push(v);c.undo();}p.nodes=nodes;return p;
}

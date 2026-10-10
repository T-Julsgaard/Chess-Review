import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {describe,flags} from '../../E153-second-target-defense/code/panel.mjs';
import {tracedQuery} from '../../E144-causal-piece-coordination/code/query.mjs';
export function collectPanel(ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('forced-weakness-budget');};
  const i=ctx.input,c=legalPosition(i.history.fen);tick();for(const m of i.history.moves){tick();c.move(m);}
  const actor=c.turn(),target=i.weaknessPawn,color=c.get(target).color,claims=[];
  const state=()=>({fen:c.fen(),flags:flags(c)}),live=()=>!Object.values(flags(c)).some(Boolean);
  const adjacent=()=>c.board().flat().filter(p=>p&&p.type==='p'&&p.color===color&&Math.abs(p.square.charCodeAt(0)-target.charCodeAt(0))===1).map(p=>p.square).sort();
  const inventory=()=>live()?c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))):[];
  const record=path=>{if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition())claims.push(path+'|'+c.fen());};
  const p={schema:'E168-forced-weakness-panel-v1',input:i,actor,target,color,root:state(),adjacent:adjacent(),variants:[],claimContexts:claims,nodes:0};record('root');
  for(const code of [i.move,i.weaknessQuiet]){
    tick();const played=c.move(code),v={played:describe(played),state:state(),legal:inventory().map(describe),replies:[]};record(code);
    for(const defense of inventory()){
      tick();c.move(uci(defense));const present=c.get(target)?.type==='p'&&c.get(target)?.color===color;
      const captures=present?inventory().filter(m=>m.captured&&describe(m).victim===target):[];
      const r={played:describe(defense),state:state(),targetPresent:present,adjacent:adjacent(),legalCaptures:captures.map(describe),captures:[]};record(code+'/'+uci(defense));
      for(const capture of captures){tick();c.move(uci(capture));const a={played:describe(capture),state:state(),query:tracedQuery(c,actor,ctx.H,tick)};record(code+'/'+uci(defense)+'/'+uci(capture));r.captures.push(a);c.undo();}
      v.replies.push(r);c.undo();
    }
    p.variants.push(v);c.undo();
  }
  p.nodes=nodes;return p;
}

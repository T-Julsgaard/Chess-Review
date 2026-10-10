import {Chess} from '../../../../lib/chess.js';
import {tracedQuery} from '../../E144-causal-piece-coordination/code/query.mjs';
const code=m=>m.from+m.to+(m.promotion||''),describe=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
export function collectPanel(ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('ending-preparation-budget');},i=ctx.config,c=new Chess(i.history.fen);tick();for(const m of i.history.moves){tick();c.move(m);}
  const actor=c.turn(),values={p:1,n:3,b:3,r:5,q:9,k:0},units=()=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square)),state=()=>({fen:c.fen(),units:units(),balance:units().reduce((n,p)=>n+values[p.type]*(p.color===actor?1:-1),0),flags:{mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()}}),moves=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));
  const p={schema:'E177-queen-ending-panel-v1',config:i,actor,root:state(),variants:[],nodes:0};
  for(const first of [i.move,i.alternative]){
    tick();const played=c.move(first),v={played:describe(played),state:state(),query:tracedQuery(c,actor,i.plies,tick),replies:[]};
    for(const reply of moves()){
      tick();c.move(code(reply));const r={played:describe(reply),state:state(),counters:[]};
      if(reply.captured)for(const counter of moves()){tick();c.move(code(counter));r.counters.push({played:describe(counter),state:state()});c.undo();}
      v.replies.push(r);c.undo();
    }
    p.variants.push(v);c.undo();
  }
  p.nodes=nodes;return p;
}

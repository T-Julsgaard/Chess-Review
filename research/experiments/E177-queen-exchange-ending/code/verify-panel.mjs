import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {Chess} from '../../../../lib/chess.js';
import {replayTrace} from '../../E144-causal-piece-coordination/code/trace-check.mjs';
const code=m=>m.from+m.to+(m.promotion||''),describe=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
export function verifyPanel(i,H,p){
  assert.equal(H,2);assert.ok(i.history&&Array.isArray(i.history.moves));const c=new Chess(i.history.fen);let nodes=1,claim=false;
  for(const m of i.history.moves){assert.ok(!c.isGameOver());c.move(m);nodes++;}assert.equal(c.fen(),new Chess(i.fen).fen());assert.ok(!c.isGameOver());
  const actor=c.turn(),values={p:1,n:3,b:3,r:5,q:9,k:0},state=()=>{const units=c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square)),flags={mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()};claim||=(flags.fifty||flags.threefold)&&!flags.mate;return{fen:c.fen(),units,balance:units.reduce((n,u)=>n+values[u.type]*(u.color===actor?1:-1),0),flags};},moves=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));
  const root=state();assert.equal(root.units.length,5);for(const color of ['w','b']){assert.equal(root.units.filter(u=>u.color===color&&u.type==='k').length,1);assert.equal(root.units.filter(u=>u.color===color&&u.type==='q').length,1);}assert.equal(root.units.filter(u=>u.color===actor&&u.type==='r').length,1);
  const legal=moves(),actual=legal.find(m=>code(m)===i.move),alternative=legal.find(m=>code(m)===i.endingAlternative);assert.ok(actual&&alternative&&i.move!==i.endingAlternative);assert.equal(actual.piece,'q');assert.equal(actual.captured,'q');assert.ok(!actual.promotion&&!alternative.promotion&&!alternative.captured);
  const expected={schema:'E177-queen-ending-panel-v1',config:{fen:i.fen,history:i.history,move:i.move,alternative:i.endingAlternative,plies:H},actor,root,variants:[],nodes:0};assert.equal(p.variants.length,2);
  for(const [vi,first]of [i.move,i.endingAlternative].entries()){
    nodes++;const played=c.move(first),s=state(),saved=p.variants[vi],checked=replayTrace(c,saved.query,actor,H);nodes+=checked.nodes;claim||=checked.claim;const v={played:describe(played),state:s,query:saved.query,replies:[]},replies=moves();assert.equal(saved.replies.length,replies.length);
    for(const [ri,reply]of replies.entries()){
      nodes++;c.move(code(reply));const r={played:describe(reply),state:state(),counters:[]},counters=reply.captured?moves():[];assert.equal(saved.replies[ri].counters.length,counters.length);
      for(const counter of counters){nodes++;c.move(code(counter));r.counters.push({played:describe(counter),state:state()});c.undo();}v.replies.push(r);c.undo();
    }
    expected.variants.push(v);c.undo();
  }
  expected.nodes=nodes;assert.ok(isDeepStrictEqual(p,expected),'Altered queen-ending panel');return{nodes,claim};
}

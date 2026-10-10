import assert from 'node:assert/strict';import {isDeepStrictEqual} from 'node:util';import {Chess} from '../../../../lib/chess.js';import {replayTrace} from '../../E144-causal-piece-coordination/code/trace-check.mjs';
const code=m=>m.from+m.to+(m.promotion||''),describe=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
export function verifyPanel(i,H,p){
  const c=new Chess(i.history.fen);let nodes=1,claim=false;for(const m of i.history.moves){assert.equal(c.isGameOver(),false);c.move(m);nodes++;}assert.equal(c.fen(),new Chess(i.fen).fen());assert.equal(c.isGameOver(),false);assert.equal(c.isCheck(),false);
  const actor=c.turn(),victim=i.counterthreatVictim,target=c.get(victim);assert.ok(target&&target.color===actor&&target.type!=='k');const rootAttackers=c.attackers(victim,actor==='w'?'b':'w').sort().map(square=>({square,type:c.get(square).type}));assert.ok(rootAttackers.length);
  const flags=()=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()}),values={p:1,n:3,b:3,r:5,q:9,k:0},state=()=>{const f=flags();claim||=f.fifty||f.threefold;return{fen:c.fen(),balance:c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===actor?1:-1),0),flags:f};},inventory=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),moves=[i.move,i.counterthreatAlternative].sort(),pair=moves.map(move=>inventory().find(m=>code(m)===move));assert.ok(pair.every(Boolean));assert.notEqual(moves[0],moves[1]);assert.equal(pair[0].from,pair[1].from);assert.ok(pair.every(m=>m.from!==victim&&!m.captured&&!m.promotion&&!/[+#]/.test(m.san)));
  const expected={schema:'E170-capture-deterrence-panel-v1',config:{fen:i.fen,history:i.history,moves,victim,plies:H},actor,victim:{square:victim,type:target.type,color:target.color},rootAttackers,root:state(),variants:[],nodes:0};assert.equal(p.variants.length,2);
  for(const [vi,move]of moves.entries()){
    nodes++;const played=c.move(move),v={played:describe(played),state:state(),legal:inventory().map(describe),replies:[]},sv=p.variants[vi];assert.equal(sv.replies.length,v.legal.length);
    for(const [ri,defense]of inventory().entries()){
      nodes++;c.move(code(defense));const sr=sv.replies[ri],checked=replayTrace(c,sr.query,actor,H);nodes+=checked.nodes;claim||=checked.claim;const capture=describe(defense).victim===victim,counters=capture?inventory():[],r={played:describe(defense),state:state(),query:sr.query,counterLegal:counters.map(describe),counters:[]};assert.equal(sr.counters.length,counters.length);
      for(const reply of counters){nodes++;c.move(code(reply));r.counters.push({played:describe(reply),state:state()});c.undo();}v.replies.push(r);c.undo();
    }expected.variants.push(v);c.undo();
  }
  expected.nodes=nodes;assert.ok(isDeepStrictEqual(p,expected),'Altered counterthreat proof');return{nodes,claim};
}

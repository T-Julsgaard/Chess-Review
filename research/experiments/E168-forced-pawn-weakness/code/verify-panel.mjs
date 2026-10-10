import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {Chess} from '../../../../lib/chess.js';
import {replayTrace} from '../../E144-causal-piece-coordination/code/trace-check.mjs';
const eq=(a,b)=>assert.ok(isDeepStrictEqual(a,b),'Altered forced-weakness proof'),code=m=>m.from+m.to+(m.promotion||'');
const describe=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
export function verifyPanel(i,H,p){
  const c=new Chess(i.history.fen);let nodes=1;for(const m of i.history.moves){assert.equal(c.isGameOver(),false);c.move(m);nodes++;}assert.equal(c.fen(),new Chess(i.fen).fen());assert.equal(c.isGameOver(),false);
  const actor=c.turn(),target=i.weaknessPawn,color=c.get(target)?.color;assert.equal(c.get(target)?.type,'p');assert.notEqual(color,actor);
  const flags=()=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()}),state=()=>({fen:c.fen(),flags:flags()}),adjacent=()=>c.board().flat().filter(p=>p&&p.type==='p'&&p.color===color&&Math.abs(p.square.charCodeAt(0)-target.charCodeAt(0))===1).map(p=>p.square).sort();
  const moves=()=>Object.values(flags()).some(Boolean)?[]:c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),claims=[];let searchClaim=false;
  const record=path=>{if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition())claims.push(path+'|'+c.fen());};
  const expected={schema:'E168-forced-weakness-panel-v1',input:{fen:i.fen,history:i.history,move:i.move,weaknessQuiet:i.weaknessQuiet,weaknessPawn:target,weaknessMatePlies:H},actor,target,color,root:state(),adjacent:adjacent(),variants:[],claimContexts:claims,nodes:0};record('root');
  assert.ok(expected.adjacent.length);const legal=moves(),a=legal.find(m=>code(m)===i.move),b=legal.find(m=>code(m)===i.weaknessQuiet);assert.ok(a&&b&&a.from===b.from&&code(a)!==code(b)&&/[+#]/.test(a.san)&&!/[+#]/.test(b.san)&&!b.captured&&!b.promotion);
  assert.equal(p.variants.length,2);
  for(const [vi,choice]of [i.move,i.weaknessQuiet].entries()){
    nodes++;const played=c.move(choice),v={played:describe(played),state:state(),legal:moves().map(describe),replies:[]},saved=p.variants[vi];record(choice);assert.equal(saved.replies.length,v.legal.length);
    for(const [ri,defense]of moves().entries()){
      nodes++;c.move(code(defense));const targetPresent=c.get(target)?.type==='p'&&c.get(target)?.color===color,captures=targetPresent?moves().filter(m=>m.captured&&describe(m).victim===target):[],r={played:describe(defense),state:state(),targetPresent,adjacent:adjacent(),legalCaptures:captures.map(describe),captures:[]},sr=saved.replies[ri];record(choice+'/'+code(defense));assert.equal(sr.captures.length,captures.length);
      for(const [ci,capture]of captures.entries()){nodes++;c.move(code(capture));const q=sr.captures[ci].query,checked=replayTrace(c,q,actor,H);nodes+=checked.nodes;searchClaim||=checked.claim;r.captures.push({played:describe(capture),state:state(),query:q});record(choice+'/'+code(defense)+'/'+code(capture));c.undo();}
      v.replies.push(r);c.undo();
    }
    expected.variants.push(v);c.undo();
  }
  expected.nodes=nodes;eq(p,expected);return{nodes,claim:claims.length>0||searchClaim};
}

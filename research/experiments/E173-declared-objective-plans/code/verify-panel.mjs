import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {Chess} from '../../../../lib/chess.js';
const code=m=>m.from+m.to+(m.promotion||''),record=m=>({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null});
export function verifyPanel(i,H,p){
  const c=new Chess(i.history.fen);let nodes=1,claim=false;
  for(const m of i.history.moves){assert.equal(c.isGameOver(),false);assert.ok(c.move(m));nodes++;}
  assert.equal(c.fen(),new Chess(i.fen).fen());assert.equal(c.isGameOver(),false);
  const actor=c.turn(),origin=i.planObjective.unit;assert.equal(i.planObjective.kind,'rook-seventh-rank');assert.equal(c.get(origin)?.type,'r');assert.equal(c.get(origin)?.color,actor);assert.notEqual(origin[1],actor==='w'?'7':'2');
  const state=unit=>{const flags={mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()},goal=!Object.values(flags).some(Boolean)&&unit!==null&&c.get(unit)?.type==='r'&&c.get(unit)?.color===actor&&unit[1]===(actor==='w'?'7':'2');claim||=flags.fifty||flags.threefold;return{fen:c.fen(),unit,flags,goal};};
  const inventory=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),advance=(square,m)=>record(m).victim===square?null:m.from===square?m.to:square;
  const legal=inventory(),moves=[i.move,i.planAlternative].map(s=>legal.find(m=>code(m)===s));assert.ok(moves.every(Boolean));assert.notEqual(i.move,i.planAlternative);assert.equal(moves[0].from,moves[1].from);assert.ok(moves.every(m=>!m.captured&&!m.promotion&&!/[+#]/.test(m.san)));
  const expected={schema:'E173-objective-policy-panel-v1',config:{fen:i.fen,history:i.history,move:i.move,alternative:i.planAlternative,objective:i.planObjective,plies:H},actor,root:state(origin),variants:[],nodes:0};
  for(const m of moves){
    nodes++;c.move(code(m));const unit=advance(origin,m),after=state(unit),trace=[];let queryClaim=false;
    function walk(square,remaining){
      nodes++;const s=state(square);trace.push({fen:s.fen,unit:square,remaining});queryClaim||=s.flags.fifty||s.flags.threefold;
      const choices=inventory(),node={state:s,remaining,legal:choices.map(record),win:false,kind:null,branches:[]};
      if(s.goal){node.win=true;node.kind='goal';return node;}
      if(c.isGameOver()){node.kind='terminal';return node;}
      if(remaining===0){node.kind='limit';return node;}
      const own=c.turn()===actor;
      for(const move of choices){c.move(code(move));let child;try{child=walk(advance(square,move),remaining-1);}finally{c.undo();}node.branches.push({played:record(move),child});if(child.win===own){node.win=own;node.kind=own?'choice':'counterchoice';return node;}}
      assert.ok(choices.length);node.win=!own;node.kind=own?'all-fail':'all';return node;
    }
    const tree=walk(unit,H-1);expected.variants.push({played:record(m),state:after,query:{actor,plies:H-1,tree,trace,claim:queryClaim}});c.undo();
  }
  expected.nodes=nodes;assert.ok(isDeepStrictEqual(p,expected),'Altered objective-policy proof');return{nodes,claim};
}

import {Chess} from '../../../../lib/chess.js';
import assert from 'node:assert/strict';
const uci=m=>m.from+m.to+(m.promotion||'');
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
function replay(history,moves){
 const c=new Chess(history),states=[c.fen()],records=[],identity=new Map(),paths=new Map();
 for(const row of c.board())for(const p of row)if(p){const id=p.color+p.type+p.square;identity.set(p.square,id);paths.set(id,[]);}
 for(const code of moves){assert.ok(!c.isGameOver());const m=c.moves({verbose:true}).find(m=>uci(m)===code);assert.ok(m);
  const id=identity.get(m.from);assert.ok(id);const victim=m.flags.includes('e')?m.to[0]+m.from[1]:m.to;
  identity.delete(victim);identity.delete(m.from);identity.set(m.to,id);paths.get(id).push(record(m));
  if(m.flags.includes('k')||m.flags.includes('q')){const kingside=m.flags.includes('k'),from=(kingside?'h':'a')+m.from[1],to=(kingside?'f':'d')+m.from[1];const rook=identity.get(from);assert.ok(rook);identity.delete(from);identity.set(to,rook);}
  c.move(code);records.push({...record(m),after:c.fen()});states.push(c.fen());
 }
 return{c,states,records,identity,paths};
}
export function checkWitness(w){
 const actual=replay(w.history.fen,[...w.history.moves,w.played.uci]);
 assert.equal(actual.c.fen(),w.after);assert.deepEqual(actual.states,w.states);assert.deepEqual(actual.records,w.records);assert.ok(!actual.c.isGameOver());
 assert.equal(actual.identity.get(w.played.to),w.selectedUnit);
 for(const unit of w.units){const located=[...actual.identity].find(([,id])=>id===unit.id);assert.equal(Boolean(located),unit.alive);
  if(located){assert.equal(located[0],unit.square);assert.equal(actual.c.get(unit.square).type,unit.type);assert.equal(actual.c.get(unit.square).color,unit.color);}
  assert.deepEqual(actual.paths.get(unit.id),unit.moves);
 }
 if(w.route){const moves=actual.paths.get(w.selectedUnit).filter(m=>m.piece===w.played.piece),path=[moves[0].from,...moves.map(m=>m.to)];
  assert.deepEqual(w.route.moves,moves);assert.deepEqual(w.route.path,path);assert.deepEqual(w.route.distinct,[...new Set(path)]);
  if(w.route.kind==='knight-checking-route'){assert.equal(w.played.piece,'n');assert.ok(moves.length>=2&&new Set(path).size>=3);
   const c=actual.c;assert.ok(c.isCheck());assert.ok(c.attackers(w.route.king,w.played.color).includes(w.played.to));
   const replies=[];for(const m of c.moves({verbose:true})){c.move(uci(m));replies.push({...record(m),after:c.fen(),terminal:c.isGameOver()});c.undo();}assert.deepEqual(replies,w.checkingReplies);
  }else{assert.equal(w.route.kind,'king-capturing-walk');assert.equal(w.played.piece,'k');assert.ok(w.played.captured);assert.ok(moves.length>=3&&new Set(path).size>=4);}
 }
 if(w.comparison){const x=w.comparison,other=replay(x.history.fen,x.history.moves);assert.equal(new Chess(x.history.fen).fen(),new Chess(w.history.fen).fen());
  assert.deepEqual(other.states,x.states);assert.equal(x.sameEndpoint,other.c.fen()===w.after);assert.equal(x.terminal,other.c.isGameOver());
  const codes=[...w.history.moves,w.played.uci];assert.equal(x.different,JSON.stringify(codes)!==JSON.stringify(x.history.moves));
  assert.equal(x.sameMoveMultiset,JSON.stringify([...codes].sort())===JSON.stringify([...x.history.moves].sort()));
  const keys=states=>states.map(f=>f.split(' ').slice(0,4).join(' '));assert.deepEqual(keys(actual.states),x.actualKeys);assert.deepEqual(keys(other.states),x.comparisonKeys);
 }
 return true;
}

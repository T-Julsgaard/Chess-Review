import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||''),values={p:1,n:3,b:3,r:5,q:9,k:0};
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+values[p.type]*(p.color===color?1:-1),0);
function claims(c,n){
  if(n.kind==='draw')return c.isDrawByFiftyMoves()||c.isThreefoldRepetition();
  if(n.kind==='limit'||n.kind==='mate')return false;
  let found=false;for(const e of n.child?[{move:n.move,child:n.child}]:n.branches){c.move(e.move);try{found=claims(c,e.child)||found;}finally{c.undo();}}return found;
}
export function checkWitness(w,result,input){
  assert.equal(w.experiment,'E142');assert.deepEqual(w.history,input.history);
  const c=new Chess(input.history.fen);let last,prior;
  for(const move of input.history.moves){assert.equal(c.isGameOver(),false);prior=c.fen();last=c.move(move);}
  assert.ok(last);assert.equal(c.fen(),new Chess(input.fen).fen());assert.equal(c.isGameOver(),false);
  const actor=c.turn(),opponent=actor==='w'?'b':'w',H=input.tradeMatePlies??1,before=c.fen();
  assert.equal(last.color,opponent);assert.ok(['n','b','r','q'].includes(last.piece)&&['n','b','r','q'].includes(last.captured));assert.equal(last.promotion,undefined);assert.equal(values[last.piece],values[last.captured]);
  assert.equal(w.actor,actor);assert.equal(w.before,before);const played=c.move(input.move),after=c.fen();c.undo();assert.equal(w.played,code(played));assert.equal(w.san,played.san);assert.equal(w.after,after);assert.equal(result.after,after);
  assert.deepEqual(w.exchange,{prior,initiating:code(last),square:last.to,lost:last.captured,capturer:last.piece,priorBalance:balance(new Chess(prior),actor)});
  const legal=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b)));assert.deepEqual(w.moves,legal.map(code));
  assert.deepEqual(w.rows.map(r=>r.move),w.moves.slice(0,w.rows.length));assert.ok(w.rows.length>0);
  let foundClaim=null;
  for(const [i,row]of w.rows.entries()){
    const m=legal[i];assert.equal(row.san,m.san);assert.equal(row.recapture,m.to===last.to&&m.captured===last.piece&&!m.promotion&&m.piece!=='p');c.move(row.move);
    try{assert.equal(row.after,c.fen());for(const [key,winner]of [['actor',actor],['opponent',opponent]]){const q=row[key];assert.equal(q.winner,winner);assert.equal(q.plies,H);replayQuery(c,q);}if(claims(c,row.actor.tree)||claims(c,row.opponent.tree))foundClaim=row.move;assert.ok(!(row.actor.tree.win&&row.opponent.tree.win));}finally{c.undo();}
    if(foundClaim)assert.equal(i,w.rows.length-1);
  }
  assert.equal(w.claimContext,foundClaim);const expected=[],add=(id,text)=>expected.push({id,text,qualityClaim:false,evidence:{experiment:'E142',before,after,detail:{source:'tacticalTradeAnalysis.witness'}}});
  if(foundClaim){assert.equal(result.tacticalTradeAnalysis.status,'claim-rule-prerequisite');assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E142'),[]);return;}
  assert.equal(w.rows.length,legal.length);
  const actual=w.rows.find(r=>r.move===w.played),keepWins=w.rows.filter(r=>!r.recapture&&r.actor.tree.win),keepLosses=w.rows.filter(r=>!r.recapture&&r.opponent.tree.win),tradeLosses=w.rows.filter(r=>r.recapture&&r.opponent.tree.win);
  if(actual.recapture&&actual.actor.tree.win&&keepLosses.length){
    add('tactical-good-trade',`Tactically good exchange: ${played.san} completes equal-value trades and forces mate within ${H} plies; ${keepLosses[0].san} instead allows forced mate.`);
    if(w.exchange.priorBalance>0)add('tactical-trade-while-ahead',`Trading while nominally ahead: ${played.san} completes an equal-value exchange and forces mate; a recorded nonrecapture loses by force.`);
  }
  if(actual.recapture&&actual.opponent.tree.win&&keepWins.length)add('tactical-bad-trade',`Tactically bad exchange: ${played.san} allows forced mate within ${H} plies; ${keepWins[0].san} keeps the exchange incomplete and forces mate instead.`);
  if(!actual.recapture&&actual.actor.tree.win&&tradeLosses.length&&w.exchange.priorBalance<0)add('tactical-keep-while-behind',`Keeping pieces while nominally behind: ${played.san} forces mate; ${tradeLosses[0].san} completes the equal-value exchange and allows forced mate instead.`);
  assert.deepEqual(result.events.filter(e=>e.evidence?.experiment==='E142'),expected);assert.equal(result.tacticalTradeAnalysis.status,expected.length?'proven':'compared');
  assert.equal(result.tacticalTradeAnalysis.plies,H);assert.equal(result.tacticalTradeAnalysis.limit,input.maxTradeNodes??50000);assert.ok(result.tacticalTradeAnalysis.nodes>0&&result.tacticalTradeAnalysis.nodes<=result.tacticalTradeAnalysis.limit);
}

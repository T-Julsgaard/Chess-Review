import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||''),pieces=c=>c.board().flat().filter(Boolean);
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E136');assert.deepEqual(w.history,input.history??null);const c=legalPosition(w.history?.fen||input.fen);let last=null;
  for(const move of w.history?.moves||[]){assert.equal(c.isGameOver(),false);const before=c.fen(),m=c.move(move);last={before,move:m};}
  assert.equal(c.fen(),legalPosition(input.fen).fen());assert.equal(w.before,c.fen());assert.equal(w.actor,c.turn());assert.equal(c.isGameOver(),false);
  const side=input.mateDistanceSide??'opponent',winner=side==='actor'?w.actor:w.actor==='w'?'b':'w';assert.equal(w.side,side);assert.equal(w.winner,winner);
  const beforePieces=pieces(c),m=c.move(input.move);assert.equal(w.played,code(m));assert.equal(w.san,m.san);assert.equal(w.after,c.fen());assert.equal(result.after,w.after);const afterPieces=pieces(c);let t=null;
  if(last&&['k','p'].includes(m.piece)&&!m.promotion&&m.captured==='r'&&last.move.piece==='r'&&last.move.captured==='r'&&last.move.color!==w.actor&&last.move.to===m.to){
    const prior=pieces(legalPosition(last.before)),ownR=prior.filter(p=>p.type==='r'&&p.color===w.actor),enemyR=prior.filter(p=>p.type==='r'&&p.color!==w.actor);
    if(prior.every(p=>['k','r','p'].includes(p.type))&&ownR.length===1&&enemyR.length===1&&beforePieces.filter(p=>p.type==='r').length===1&&beforePieces.every(p=>['k','r','p'].includes(p.type))&&afterPieces.every(p=>['k','p'].includes(p.type))&&afterPieces.some(p=>p.type==='p'))t={priorFen:last.before,priorMove:code(last.move),capturingRook:last.move.from,exchangeSquare:m.to,recapture:code(m),pawnEnding:afterPieces.map(p=>({square:p.square,type:p.type,color:p.color})).sort((a,b)=>a.square.localeCompare(b.square))};
  }
  assert.deepEqual(w.transition,t);assert.ok(w.queries.length>=1);assert.ok(w.queries.length<=(input.mateDistancePlies??3)+1);let claims=0;
  function scan(n){if(n.kind==='draw'){if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition())claims++;return;}if(n.kind==='mate'||n.kind==='limit')return;const edges=n.child?[{move:n.move,child:n.child}]:n.branches;for(const b of edges){c.move(b.move);try{scan(b.child);}finally{c.undo();}}}
  for(const [i,q]of w.queries.entries()){assert.equal(q.winner,winner);assert.equal(q.plies,i);assert.equal(q.rootFen,w.after);const checked=replayQuery(c,q);if(i<w.queries.length-1)assert.equal(checked.win,false);scan(q.tree);}
  assert.equal(w.claimLeaves,claims);const events=result.events.filter(e=>e.evidence?.experiment==='E136');
  if(claims){assert.equal(w.distance,null);assert.equal(result.mateDistanceAnalysis.status,'claim-rule-prerequisite');assert.deepEqual(events,[]);return;}
  const lastQuery=w.queries.at(-1);
  if(w.distance===null){assert.equal(lastQuery.tree.win,false);assert.deepEqual(events,[]);if(c.isGameOver()){assert.equal(w.queries.length,1);assert.equal(result.mateDistanceAnalysis.status,'terminal-without-mate');}else{assert.equal(w.queries.length,(input.mateDistancePlies??3)+1);assert.equal(result.mateDistanceAnalysis.status,'unresolved-within-bound');}return;}
  assert.equal(w.distance,w.queries.length-1);assert.equal(lastQuery.tree.win,true);assert.equal(result.mateDistanceAnalysis.status,'proven');assert.deepEqual(events.map(e=>e.id),['exact-mate-distance',...(side==='opponent'&&t?['entered-lost-pawn-ending']:[])]);
  const d=w.distance,unit=d===1?'ply':'plies',name=winner==='w'?'White':'Black';for(const e of events){assert.equal(e.qualityClaim,false);assert.deepEqual(e.evidence,{experiment:'E136',before:w.before,after:w.after,detail:{source:'mateDistanceAnalysis.witness'}});assert.equal(e.text,e.id==='exact-mate-distance'?`Exact mate distance after ${m.san}: ${name} forces checkmate in ${d} ${unit} against every defense; no shorter forced mate exists.`:`Lost pawn ending: ${m.san} completes the rook exchange; ${name} can force checkmate in ${d} ${unit}.`);}
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E135-lucena-rook-bridges/code/bridge.mjs';
const army=c=>c.board().flat().filter(Boolean),name=a=>a==='w'?'White':'Black';
export const priority=e=>e.evidence?.experiment==='E136'?182+(e.id==='entered-lost-pawn-ending'?1:0):inherited(e);
function claimLeaves(c,n,tick) {
  tick();if(n.kind==='draw')return Number(c.isDrawByFiftyMoves()||c.isThreefoldRepetition());
  if(n.kind==='mate'||n.kind==='limit')return 0;let count=0;
  for(const b of n.child?[{move:n.move,child:n.child}]:n.branches){tick();c.move(b.move);try{count+=claimLeaves(c,b.child,tick);}finally{c.undo();}}
  return count;
}
function transition(h,before,after,m,actor) {
  const last=h?.records.at(-1);if(!last||!['k','p'].includes(m.piece)||m.promotion||m.captured!=='r'||last.move.piece!=='r'||last.move.captured!=='r'||last.move.color===actor||last.move.to!==m.to)return null;
  const prior=army(legalPosition(last.before)),b=army(legalPosition(before)),a=army(legalPosition(after));
  if(prior.some(p=>!['k','r','p'].includes(p.type))||prior.filter(p=>p.type==='r'&&p.color===actor).length!==1||prior.filter(p=>p.type==='r'&&p.color!==actor).length!==1||b.filter(p=>p.type==='r').length!==1||b.some(p=>!['k','r','p'].includes(p.type))||a.some(p=>!['k','p'].includes(p.type))||!a.some(p=>p.type==='p'))return null;
  return {priorFen:last.before,priorMove:uci(last.move),capturingRook:last.move.from,exchangeSquare:m.to,recapture:uci(m),pawnEnding:a.map(p=>({square:p.square,type:p.type,color:p.color})).sort((a,b)=>a.square.localeCompare(b.square))};
}
export function explainMove(input) {
  const enabled=input.mateDistanceTags===undefined?false:input.mateDistanceTags;if(typeof enabled!=='boolean')throw Error('mateDistanceTags must be boolean');if(!enabled)return parent(input);
  const limit=input.maxMateDistanceNodes===undefined?50000:input.maxMateDistanceNodes,H=input.mateDistancePlies===undefined?3:input.mateDistancePlies,side=input.mateDistanceSide===undefined?'opponent':input.mateDistanceSide;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxMateDistanceNodes must be integer0..50000');if(!Number.isSafeInteger(H)||H<0||H>5)throw Error('mateDistancePlies must be integer0..5');if(!['actor','opponent'].includes(side))throw Error('mateDistanceSide must be actor or opponent');
  const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const tick=()=>{if(++nodes>limit)throw Error('mate-distance-budget');};
  const done=()=>({...base,schema:'coach-concepts-E136-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,mateDistanceAnalysis:{limit,plies:H,side,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try {
    tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const move of h?.moves||[]){tick();c.move(move);}if(c.isGameOver()){status='not-live';return done();}
    const before=c.fen(),actor=c.turn(),winner=side==='actor'?actor:actor==='w'?'b':'w',m=c.move(input.move),after=c.fen();if(after!==base.after)throw Error('Parent mate distance differs');
    witness={experiment:'E136',before,after,actor,winner,side,history:h?{fen:h.start,moves:h.moves}:null,played:uci(m),san:m.san,transition:transition(h,before,after,m,actor),queries:[],distance:null,claimLeaves:0};
    for(let d=0;d<=H;d++) {
      const proof=query(c,winner,d,{tick}),claims=claimLeaves(c,proof.tree,tick);witness.queries.push(proof);witness.claimLeaves+=claims;
      if(claims){status='claim-rule-prerequisite';return done();}
      if(proof.tree.win){witness.distance=d;break;}
      if(c.isGameOver()){status='terminal-without-mate';return done();}
    }
    if(witness.distance===null){status='unresolved-within-bound';return done();}tick();const d=witness.distance,unit=d===1?'ply':'plies';
    const e=(id,text)=>({id,text,qualityClaim:false,evidence:{experiment:'E136',before,after,detail:{source:'mateDistanceAnalysis.witness'}}});
    const added=[e('exact-mate-distance',`Exact mate distance after ${m.san}: ${name(winner)} forces checkmate in ${d} ${unit} against every defense; no shorter forced mate exists.`)];
    if(side==='opponent'&&witness.transition)added.push(e('entered-lost-pawn-ending',`Lost pawn ending: ${m.san} completes the rook exchange; ${name(winner)} can force checkmate in ${d} ${unit}.`));
    if(added.some(e=>e.text.split(/\s+/).length>24))throw Error('Comment exceeds24words');events=[...events,...added];status='proven';
  }catch(e){if(e.message!=='mate-distance-budget')throw e;events=base.events;witness=null;status='exhausted';}
  return done();
}

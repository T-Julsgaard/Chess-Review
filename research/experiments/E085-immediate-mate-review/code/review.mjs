import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E084-legal-line-clearance/code/lines.mjs';
const record=m=>({uci:uci(m),san:m.san,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
export const priority=e=>({'missed-immediate-mate-review':188,'retained-mate-threat':187,'immediate-mate-blunder-check':185,'prevented-immediate-mate':154}[e.id]??(e.evidence?.experiment==='E085'?30:inherited(e)));
export function explainMove(input){
 const enabled=input.reviewTags===undefined?false:input.reviewTags;
 if(typeof enabled!=='boolean')throw Error('reviewTags must be boolean');
 if(!enabled)return parent(input);
 const limit=input.maxReviewNodes===undefined?50000:input.maxReviewNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxReviewNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;
 const done=()=>({...base,schema:'coach-concepts-E085-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
  reviewAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const budget={tick(){if(++nodes>limit)throw Error('review-budget');}};
 const scan=c=>{
  budget.tick();const fen=c.fen();if(c.isGameOver())return{fen,terminal:true,moves:[],mates:[]};
  budget.tick();const legal=c.moves({verbose:true}),moves=[];
  for(const move of legal){budget.tick();c.move(uci(move));moves.push({...record(move),fen:c.fen(),check:c.isCheck(),mate:c.isCheckmate(),draw:c.isDraw(),terminal:c.isGameOver()});c.undo();}
  return{fen,terminal:false,moves,mates:moves.filter(m=>m.mate).map(m=>m.uci)};
 };
 try{
  budget.tick();const h=validateHistory(input),root=legalPosition(h?.start||input.fen);
  for(const move of h?.moves||[]){budget.tick();root.move(move);}
  if(root.isGameOver()){status='not-live';return done();}
  const before=root.fen(),actor=root.turn(),rootCheck=root.isCheck(),rootScan=scan(root);
  budget.tick();const actual=root.move(input.move),after=root.fen();
  if(after!==base.after)throw Error('Parent position differs');
  const actualScan=scan(root),extra=[];
  witness={experiment:'E085',actor,history:h?{fen:h.start,moves:h.moves}:null,before,after,played:record(actual),
   root:rootScan,actual:actualScan,beforeOpponent:null,alternatives:[],missedProof:null};
  const add=(id,text,details={})=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,...details}});};
  const forcing=rootScan.moves.filter(m=>m.check||m.captured);
  if(forcing.length)add('legal-forcing-candidates',`Candidate moves: ${forcing.length} legal checks or captures were available; the complete list is recorded.`,{candidates:forcing});
  add('one-ply-calculation-tree',`Legal calculation tree: ${rootScan.moves.length} root moves and ${actualScan.moves.length} replies to ${actual.san} are recorded.`);
  add('checks-captures-mates-inventory',`Checks and captures: ${rootScan.moves.filter(m=>m.check).length} checking moves, ${rootScan.moves.filter(m=>m.captured).length} captures, ${rootScan.mates.length} immediate mates.`,{horizon:'one ply; deeper threats unresolved'});
  if(!root.isCheckmate()&&rootScan.mates.length){
   const existing=base.events.find(e=>e.id==='missed-mate'&&e.evidence.mateIn===1);
   const proof=existing?existing.evidence.proof:query(legalPosition(before),actor,1,budget);
   if(!proof.tree.win||!rootScan.mates.includes(proof.tree.move))throw Error('Missed mate proof differs');
   witness.missedProof={proof,reusedParentEvent:existing?base.events.indexOf(existing):null};
   if(!existing){const chosen=rootScan.moves.find(m=>m.uci===proof.tree.move);add('missed-immediate-mate-review',`Missed mate in one: ${chosen.san} was legal; ${actual.san} does not checkmate.`);}
  }
  if(!actualScan.terminal){
   if(actualScan.mates.length){const threat=actualScan.moves.find(m=>m.uci===actualScan.mates[0]);add('immediate-mate-blunder-check',`Mate warning: your opponent can play ${threat.san} after ${actual.san}.`,{opponentMate:threat});}
   if(!rootCheck){
    budget.tick();const previous=legalPosition(before),hypothetical=turnBoard(previous,actor==='w'?'b':'w');
    witness.beforeOpponent=scan(hypothetical);
    if(witness.beforeOpponent.mates.length){
     // Exhaust every root alternative; absence of immediate mate is horizon-only.
     for(const move of rootScan.moves){budget.tick();const c=legalPosition(before);c.move(move.uci);witness.alternatives.push({move:move.uci,replyScan:scan(c)});}
     const safe=witness.alternatives.filter(a=>!a.replyScan.mates.length&&!a.replyScan.terminal);
     const retainedMates=actualScan.mates.filter(m=>witness.beforeOpponent.mates.includes(m));
     if(retainedMates.length&&safe.length){const alternate=rootScan.moves.find(m=>m.uci===safe[0].move);
      add('retained-mate-threat',`Existing mate threat remains: ${actual.san} allows mate in one; ${alternate.san} leaves no immediate mating reply.`,{alternative:safe[0],retainedMates});}
     if(!actualScan.mates.length)add('prevented-immediate-mate',`${actual.san} removes all ${witness.beforeOpponent.mates.length} immediate mates seen in the hypothetical opponent-turn snapshot.`,{horizon:'one ply only; not a proof of safety'});
    }
   }
  }
  events=[...base.events,...extra];status='proven';
 }catch(e){if(e.message!=='review-budget')throw e;status='exhausted';events=base.events;witness=null;}
 return done();
}

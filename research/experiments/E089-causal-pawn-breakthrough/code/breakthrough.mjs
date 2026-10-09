import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {pawnFeatures} from '../../E021-structural-concepts/code/features.mjs';
import {routeQuery} from '../../E037-promotion-routes/code/routes.mjs';
import {explainMove as parent,priority as inherited} from '../../E088-forced-queen-responses/code/pressure.mjs';
const pieces=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color}));
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
export const priority=e=>e.evidence?.experiment==='E089'?106:inherited(e);
export function explainMove(input){
 const enabled=input.breakthroughTags===undefined?false:input.breakthroughTags;
 if(typeof enabled!=='boolean')throw Error('breakthroughTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxBreakthroughNodes===undefined?50000:input.maxBreakthroughNodes,depth=input.breakthroughPushes===undefined?2:input.breakthroughPushes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxBreakthroughNodes must be integer0..50000');
 if(!Number.isSafeInteger(depth)||depth<1||depth>6)throw Error('breakthroughPushes must be integer1..6');
 const base=parent(input);let status='no-new-fact',events=base.events,witness=null;const budget={limit,nodes:0};
 const done=()=>({...base,schema:'coach-concepts-E089-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
  breakthroughAnalysis:{limit,depth,nodes:budget.nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const tick=()=>{if(++budget.nodes>limit)throw Error('breakthrough-budget');};
 try{
  tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){tick();c.move(m);}
  if(c.isGameOver()){status='not-live';return done();}
  const actor=c.turn(),before=c.fen(),beforePieces=pieces(c),beforeFeatures=pawnFeatures(c,actor);tick();const played=c.move(input.move);
  if(c.fen()!==base.after)throw Error('Parent breakthrough position differs');if(c.isGameOver()){status='not-live';return done();}
  if(played.piece!=='p'||played.promotion)return done();tick();const afterFeatures=pawnFeatures(c,actor),afterPieces=pieces(c);
  if(!afterFeatures.passed.includes(played.to))return done();
  const matching=base.events.findIndex(e=>e.id==='promotion-route'&&e.evidence.pawn===played.to&&e.evidence.proof.depth===depth&&e.evidence.afterFen===c.fen());
  let afterProof;
  if(matching>=0){tick();afterProof=base.events[matching].evidence.proof;}else afterProof=routeQuery(c,actor,played.to,depth,budget);
  witness={experiment:'E089',actor,history:h?{fen:h.start,moves:h.moves}:null,before,after:c.fen(),played:record(played),beforePieces,afterPieces,
   beforeFeatures,afterFeatures,afterProof,beforeProof:null,reusedRouteEvent:matching>=0?matching:null,
   purePawnEnding:[...beforePieces,...afterPieces].every(p=>'kp'.includes(p.type)),pawnCounts:{own:beforePieces.filter(p=>p.type==='p'&&p.color===actor).length,enemy:beforePieces.filter(p=>p.type==='p'&&p.color!==actor).length},breakthrough:false};
  if(!afterProof.win){status='promotion-refuted';return done();}
  const extra=[],add=(id,text)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness}});};
  if(played.captured==='p'&&!beforeFeatures.passed.includes(played.from)){
   c.undo();witness.beforeProof=routeQuery(c,actor,played.from,depth,budget);c.move(input.move);
   if(!witness.beforeProof.win){witness.breakthrough=true;
    add('certified-pawn-breakthrough',`Pawn breakthrough: ${played.san} creates a passed pawn with a certified surviving queen route; no such bounded straight route existed before.`);
    add('realized-candidate-passer',`Candidate passer realized: ${played.san} creates a passed pawn that can queen within ${depth} pushes against every reply.`);
    if(witness.purePawnEnding)add('pawn-ending-breakthrough',`Pawn-ending breakthrough: ${played.san} opens a certified surviving promotion route within ${depth} pushes against every legal defense.`);
   }
  }
  if(witness.purePawnEnding&&witness.pawnCounts.own>witness.pawnCounts.enemy)
   add('certified-extra-pawn-conversion',`Extra-pawn conversion: ${played.san} leaves a surviving queen route within ${depth} pushes; you already had more pawns before this move.`);
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(!['route-budget','breakthrough-budget'].includes(e.message))throw e;status='exhausted';events=base.events;witness=null;}
 return done();
}

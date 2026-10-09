import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E087-king-mobility-cutoffs/code/mobility.mjs';
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const balance=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0);
export const priority=e=>e.evidence?.experiment==='E088'?105:inherited(e);
function pressure(beforeFen,playedCode,budget){
 budget.tick();const before=legalPosition(beforeFen),actor=before.turn(),c=legalPosition(beforeFen),played=c.move(playedCode);
 if(before.isGameOver()||c.isGameOver()||played.piece==='k')return null;
 const hypothetical=turnBoard(c,actor);budget.tick();const contacts=hypothetical.moves({verbose:true}).filter(m=>m.from===played.to&&m.captured==='q'&&!before.attackers(m.to,actor).includes(played.from));
 if(!contacts.length)return null;
 const queen=contacts[0].to,root=c.fen(),baseline=balance(c,actor),branches=[];let responses=0,losses=0,refutations=0;
 budget.tick();const replies=c.moves({verbose:true});
 for(const reply of replies){
  budget.tick();c.move(uci(reply));const branch={reply:record(reply),after:c.fen(),terminal:c.isGameOver(),queenMoved:reply.from===queen&&reply.piece==='q',kind:null,capture:null,proof:null,materialOffset:balance(c,actor)-baseline,minimumGainFromThreat:null};
  const target=branch.queenMoved?reply.to:queen,attacker=c.get(played.to),queenPresent=c.get(target)?.type==='q'&&c.get(target)?.color!==actor;
  if(branch.terminal){branch.kind='refutation-terminal';refutations++;}
  else{
   budget.tick();const captures=c.moves({verbose:true}).filter(m=>m.from===played.to&&m.to===target&&m.captured==='q'),capture=captures[0];
   if(capture){budget.tick();const snapshot=legalPosition(c.fen());c.move(uci(capture));
    const proof=certifyCapture(snapshot,c,capture,budget);c.undo();
    if(proof){branch.capture=record(capture);branch.proof=proof;branch.minimumGainFromThreat=proof.minimumGain+branch.materialOffset;
     if(branch.minimumGainFromThreat>0){branch.kind='certified-queen-loss';losses++;}else{branch.kind='refutation-net-gain';refutations++;}}
    else{branch.kind='refutation-capture-gain';refutations++;}
   }else if(branch.queenMoved||attacker?.color!==actor||!queenPresent||!c.attackers(target,actor).includes(played.to)){
    branch.kind='capture-threat-removed';responses++;
   }else{branch.kind='refutation-nondefensive-check-or-pin';refutations++;}
  }
  branches.push(branch);c.undo();
 }
 return{before:beforeFen,after:root,played:record(played),actor,queen,hypotheticalActorFen:hypothetical.fen(),initialCaptures:contacts.map(uci),baseline,branches,
  responses,losses,refutations,proven:branches.length>0&&responses>0&&losses>0&&refutations===0};
}
export function explainMove(input){
 const enabled=input.queenPressureTags===undefined?false:input.queenPressureTags;
 if(typeof enabled!=='boolean')throw Error('queenPressureTags must be boolean');
 if(!enabled)return parent(input);
 const limit=input.maxQueenPressureNodes===undefined?50000:input.maxQueenPressureNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxQueenPressureNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;
 const done=()=>({...base,schema:'coach-concepts-E088-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
  queenPressureAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const budget={tick(){if(++nodes>limit)throw Error('queen-pressure-budget');}};
 try{
  budget.tick();const h=validateHistory(input),root=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){budget.tick();root.move(m);}
  if(root.isGameOver()){status='not-live';return done();}
  const before=root.fen(),played=root.move(input.move);if(root.fen()!==base.after)throw Error('Parent pressure position differs');
  if(root.isGameOver()){status='not-live';return done();}
  const current=pressure(before,input.move,budget),extra=[];
  witness={experiment:'E088',history:h?{fen:h.start,moves:h.moves}:null,before,after:root.fen(),played:record(played),current,previous:null,harassment:null,reusedHanging:[]};
  const add=(id,text)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness}});};
  if(current?.proven){
   add('forced-queen-response','Queen tempo: every legal reply removes the capture threat or allows certified queen gain through every immediate counterreply.');
   const last=h?.records.at(-1),previous=h?.records.at(-2);
   if(last?.move.piece==='q'&&last.move.to===current.queen&&previous?.move.color===played.color&&previous.move.to===played.from){
    const earlier=pressure(previous.before,uci(previous.move),budget);witness.previous=earlier;
    if(earlier?.proven&&earlier.queen===last.move.from){witness.harassment={previousAttacker:previous.move.to,currentAttacker:played.to,queenFrom:last.move.from,queenTo:last.move.to,evasion:uci(last.move)};
     add('certified-queen-harassment','Queen harassment: the same piece attacks the same queen again after its recorded evasion, with both bounded loss threats certified.');}
   }
  }
  // Reuse original parent events unchanged; authenticate their actual root/replies.
  for(let index=0;index<base.events.length;index++){
   const e=base.events[index];if(e.id!=='hanging-piece')continue;budget.tick();const capture=root.moves({verbose:true}).find(m=>uci(m)===e.evidence.capture);
   if(!capture||capture.captured!==e.evidence.piece)throw Error('Inherited hanging capture differs');
   const beforeCapture=legalPosition(root.fen());root.move(uci(capture));const proof=certifyCapture(beforeCapture,root,capture,budget);root.undo();
   if(!proof){status='reuse-refuted';continue;}
   if(proof.minimumGain!==e.evidence.proof.minimumGain||JSON.stringify(proof.witnesses)!==JSON.stringify(e.evidence.proof.witnesses))throw Error('Inherited hanging proof differs');
   witness.reusedHanging.push({eventIndex:index,capture:uci(capture),proof});
  }
  if(extra.length||witness.reusedHanging.length){events=extra.length?[...base.events,...extra]:base.events;status='proven';}
  else if(current&&!current.proven)status='pressure-refuted';
 }catch(e){if(e.message!=='queen-pressure-budget')throw e;status='exhausted';events=base.events;witness=null;}
 return done();
}

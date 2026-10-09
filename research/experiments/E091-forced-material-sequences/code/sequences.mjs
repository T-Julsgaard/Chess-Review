import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E090-opening-center-activity/code/center.mjs';
const men=c=>c.board().flat().filter(Boolean),balance=(c,a)=>men(c).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0);
const ending=c=>new Set(men(c).filter(p=>!['p','k'].includes(p.type)).map(p=>p.type)).size<=1;
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
function legal(c,tick){tick();const moves=c.moves({verbose:true});for(const m of moves)tick();return moves;}
function play(c,m,tick,fn){tick();c.move(m);try{return fn();}finally{c.undo();}}
export function materialPolicy(c,actor,baseline,threshold,requireEnding,tick){
 const proof={actor,root:c.fen(),baseline,threshold,requireEnding,branches:[],win:false};
 if(c.isGameOver()||c.turn()===actor){proof.terminal=true;return proof;}
 const replies=legal(c,tick);if(!replies.length)return proof;
 for(const reply of replies){const branch=play(c,reply,tick,()=>{
  const b={reply:uci(reply),fen:c.fen(),terminal:c.isGameOver(),captures:[],chosen:null};if(b.terminal)return b;
  const options=legal(c,tick).filter(m=>m.captured);b.options=options.map(uci);
  for(const capture of options){const attempt=play(c,capture,tick,()=>{
   const a={move:uci(capture),fen:c.fen(),terminal:c.isGameOver(),counters:[],passed:false};if(a.terminal)return a;
   const counters=legal(c,tick);if(!counters.length)return a;
   for(const counter of counters){const leaf=play(c,counter,tick,()=>({move:uci(counter),fen:c.fen(),gain:balance(c,actor)-baseline,ending:ending(c),terminal:c.isGameOver()}));a.counters.push(leaf);
    if(leaf.terminal||leaf.gain<threshold||requireEnding&&!leaf.ending)return a;
   }a.passed=true;return a;
  });b.captures.push(attempt);if(attempt.passed){b.chosen=attempt.move;return b;}
  }return b;
 });proof.branches.push(branch);if(!branch.chosen)return proof;
 }proof.win=true;return proof;
}
export const priority=e=>e.evidence?.experiment==='E091'?108:inherited(e);
export function explainMove(input){
 const enabled=input.sequenceTags===undefined?false:input.sequenceTags;if(typeof enabled!=='boolean')throw Error('sequenceTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxSequenceNodes===undefined?50000:input.maxSequenceNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxSequenceNodes must be integer0..50000');
 const base=parent(input);let events=base.events,nodes=0,status='no-new-fact',witness=null;
 const done=()=>({...base,schema:'coach-concepts-E091-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,sequenceAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const tick=()=>{if(++nodes>limit)throw Error('sequence-budget');};
 try{
 tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
 const actor=c.turn(),enemy=actor==='w'?'b':'w',before=c.fen(),rootBalance=balance(c,actor),rootCheck=c.isCheck(),last=h?.records.at(-1);
 const options=legal(c,tick),oldEnemy=rootCheck?[]:legal(turnBoard(c,enemy),tick);tick();const played=c.move(input.move);
 if(c.fen()!==base.after)throw Error('Parent sequence position differs');if(c.isGameOver()){status='not-live';return done();}
 witness={experiment:'E091',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(played),rootBalance,rootCheck,policies:{},delay:null,losses:[],priorLoss:null,threats:oldEnemy.filter(m=>m.captured&&m.to===played.from).map(uci)};
 const cache=new Map(),query=(threshold,requiredEnding=false)=>{const key=threshold+':'+requiredEnding;if(!cache.has(key))cache.set(key,materialPolicy(c,actor,rootBalance,threshold,requiredEnding,tick));const q=cache.get(key);witness.policies[key]=q;return q;};
 const extra=[],add=(id,text,detail)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
 if(played.captured&&!['p','k'].includes(played.captured)){
  const liquidation=query(0,true);if(liquidation.win)add('forced-tactical-liquidation',`Tactical liquidation: after ${played.san}, every defense permits a capture leaving one piece family or a pawn ending without nominal material loss.`,{policy:liquidation});
  const enemyOffset=balance(c,enemy)+rootBalance;
  for(const offer of legal(c,tick).filter(m=>m.captured)){
   const offerBefore=legalPosition(c.fen());const proof=play(c,offer,tick,()=>certifyCapture(offerBefore,c,offer,{tick}));
   if(proof&&proof.minimumGain+enemyOffset>0)witness.losses.push({capture:uci(offer),proof,enemyOffset,minimumNetLoss:proof.minimumGain+enemyOffset});
  }
  if(witness.losses.length)add('simplification-material-loss',`Simplification warning: ${played.san} allows ${witness.losses[0].capture}; that capture wins at least ${witness.losses[0].minimumNetLoss} nominal points through every immediate counterreply.`,{loss:witness.losses[0]});
 }
 const retreat=played.piece!=='p'&&played.piece!=='k'&&!played.captured&&(+played.to[1]-+played.from[1])*(actor==='w'?1:-1)<0&&witness.threats.length;
 if(retreat){const gain=query(1);if(gain.win)add('profitable-tactical-retreat',`Tactical retreat: ${played.san} withdraws a threatened piece; every defense then permits a capture preserving at least one nominal point of gain.`,{policy:gain});}
 if(rootCheck&&played.piece!=='k'){const defense=query(0);if(defense.win)add('defensive-material-combination',`Defensive combination: ${played.san} escapes check; every reply permits a capture retaining at least the material balance from before this move.`,{policy:defense});}
 if(last?.move.captured&&(played.to!==last.move.to||!played.captured)){
  const prior=balance(legalPosition(last.before),actor),loss=prior-rootBalance;
  if(loss>0){witness.priorLoss={before:last.before,after:last.after,capture:uci(last.move),preLossBalance:prior,loss};const recovery=query(loss);
   if(recovery.win){add('forced-material-recovery',`Material recovery: ${played.san} answers the recorded capture; every defense permits a capture restoring the pre-loss balance through every immediate counterreply.`,{policy:recovery});
    c.undo();for(const alternate of options.filter(m=>!m.captured&&uci(m)!==uci(played)).sort((a,b)=>uci(a).localeCompare(uci(b)))){
     const delay=play(c,alternate,tick,()=>{if(c.isCheck()||c.isGameOver())return null;return materialPolicy(c,actor,rootBalance,loss,false,tick);});
     if(delay&&!delay.win){witness.delay={move:uci(alternate),policy:delay};break;}
    }c.move(input.move);
    if(witness.delay)add('expiring-material-compensation',`Temporary material resource: ${played.san} restores the recorded loss against every defense; after ${witness.delay.move}, this bounded capture recovery is unavailable.`,{policy:recovery,delay:witness.delay});
   }
  }
 }
 if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='sequence-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}

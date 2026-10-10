import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E138-bounded-engine-panels/code/engine-panel.mjs';
import {targetPolicy} from './target-policy.mjs';
export const priority=e=>e.evidence?.experiment==='E139'?178:inherited(e);
export const knightContact=(from,to)=>{const x=Math.abs(from.charCodeAt(0)-to.charCodeAt(0)),y=Math.abs(+from[1]-+to[1]);return x*y===2&&x+y===3;};
export function explainMove(input){
 const enabled=input.recordedTrapTags===undefined?false:input.recordedTrapTags;if(typeof enabled!=='boolean')throw Error('recordedTrapTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxRecordedTrapNodes===undefined?50000:input.maxRecordedTrapNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxRecordedTrapNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const budget={tick(){if(++nodes>limit)throw Error('recorded-trap-budget');}},done=()=>({...base,schema:'coach-concepts-E139-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,recordedTrapAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
  budget.tick();const h=validateHistory(input);if(!h||h.records.length<2){status='history-unavailable';return done();}
  const c=legalPosition(h.start);for(const code of h.moves){budget.tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
  const before=c.fen(),actor=c.turn(),[first,reply]=h.records.slice(-2),prep=first.move,enemy=reply.move,played=c.move(input.move);budget.tick();const after=c.fen();if(after!==base.after)throw Error('Parent trap board differs');
  const quiet=m=>!m.captured&&!m.promotion&&!m.flags.includes('e');
  if(!quiet(prep)||!quiet(enemy)||!quiet(played)||prep.piece!=='n'||played.piece!=='n'||prep.color!==actor||enemy.color===actor||prep.to===played.from||c.get(prep.to)?.type!=='n'||c.get(prep.to)?.color!==actor||c.get(prep.from)||c.get(played.from)||c.isGameOver()||after.split(' ')[2]!=='-'||after.split(' ')[3]!=='-'){status='unsupported-arrivals';return done();}
  const old=legalPosition(first.before),mid=legalPosition(first.after),pre=legalPosition(reply.after),targets=c.board().flat().filter(p=>p&&p.color!==actor&&!['k','p'].includes(p.type)&&[old,mid,pre].every(b=>b.get(p.square)?.type===p.type&&b.get(p.square)?.color===p.color)&&knightContact(prep.to,p.square)&&knightContact(played.to,p.square)&&!knightContact(prep.from,p.square)&&!knightContact(played.from,p.square)).sort((a,b)=>a.square.localeCompare(b.square));
  if(!targets.length){status='no-joint-contact';return done();}
  witness={experiment:'E139',before,after,actor,history:{fen:h.start,moves:h.moves},preparation:{before:first.before,move:uci(prep),after:first.after,from:prep.from,to:prep.to,san:prep.san},reply:{before:reply.before,move:uci(enemy),after:reply.after},played:{move:uci(played),from:played.from,to:played.to,san:played.san},targets:[]};
  for(const p of targets){budget.tick();const target={square:p.square,type:p.type,color:p.color},row={target,actual:targetPolicy(c,target,budget),restored:[],success:false};witness.targets.push(row);if(!row.actual.success)continue;
   for(const m of [prep,played]){budget.tick();const frame=legalPosition(after);frame.remove(m.to);frame.put({type:'n',color:actor},m.from);const restored={from:m.to,to:m.from,fen:frame.fen(),historyScope:'hypothetical FEN-root placement control',legal:false,live:false,policy:null};row.restored.push(restored);let control;try{control=legalPosition(frame.fen());}catch{/* Illegal controls cannot prove necessity. */}if(control){restored.legal=true;restored.live=!control.isGameOver();if(restored.live)restored.policy=targetPolicy(control,target,budget);}}
   row.success=row.restored.length===2&&row.restored.every(r=>r.legal&&r.live&&!r.policy.success);
  }
  const proven=witness.targets.filter(t=>t.success),extra=[];for(const row of proven){const square=row.target.square,add=(id,text)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E139',before,after,detail:{source:'recordedTrapAnalysis.witness',target:square}}});};
   add('recorded-trapping-combination',`Trapping combination: recorded ${prep.san} then ${played.san} guarantee capture of ${square} with three-ply material gain; restoring either knight removes that guarantee.`);
   add('necessary-knight-trap-geometry',`Geometric trap: two new knight contacts cover ${square}; every defense permits three-ply material gain, and each recorded placement is independently necessary.`);
  }
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='recorded-trap-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}

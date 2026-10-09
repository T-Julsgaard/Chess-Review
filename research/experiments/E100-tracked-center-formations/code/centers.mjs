import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {inspect} from '../../E035-opening-development/code/opening.mjs';
import {explainMove as formationSource} from '../../E094-history-pawn-formations-breaks/code/formations.mjs';
import {explainMove as parent,priority as inherited} from '../../E099-material-offers-exchange-history/code/offers.mjs';
const core=new Set(['d4','e4','d5','e5']),other=a=>a==='w'?'b':'w',abs=(s,a)=>s[0]+(a==='w'?s[1]:9-+s[1]);
const record=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
export function profile(units,rows,a,name){
 const b=other(a),unit=(color,origin)=>units.find(u=>u.color===color&&u.origin===abs(origin,a)),live=(color,origin,square,type='p')=>{const u=unit(color,origin);return !!(u?.alive&&u.initialType===type&&u.type===type&&u.square===abs(square,a));},gone=(color,origin,type='p')=>{const u=unit(color,origin);return !!(u&&!u.alive&&u.initialType===type);};
 const owns=entries=>entries.every(([origin,square,type])=>live(a,origin,square,type)),enemies=entries=>entries.every(([origin,square,type])=>live(b,origin,square,type));
 const took=(actorColor,actorOrigin,victimColor,victimOrigin)=>{const u=unit(actorColor,actorOrigin),v=unit(victimColor,victimOrigin);return !!(u&&v&&rows.some(r=>r.actorId===u.id&&r.victimId===v.id));};
 if(name==='caro-kann')return owns([['d2','d4'],['e2','e5']])&&enemies([['c7','c6'],['d7','d5']]);
 if(name==='slav')return owns([['c2','c4'],['d2','d4'],['e2','e2']])&&enemies([['c7','c6'],['d7','d5'],['e7','e7']]);
 if(name==='queens-gambit')return owns([['c2','c4'],['d2','d4']])&&enemies([['d7','d5'],['e7','e6'],['c7','c7']]);
 if(name==='benko')return owns([['d2','d5'],['e2','e4']])&&enemies([['c7','c5'],['d7','d6']])&&gone(a,'c2')&&gone(b,'a7')&&gone(b,'b7')&&took(a,'c2',b,'b7')&&took(a,'c2',b,'a7')&&took(b,'c8',a,'c2');
 if(name==='kings-indian')return owns([['c2','c4'],['d2','d4'],['e2','e4']])&&enemies([['d7','d6'],['e7','e5'],['g7','g6'],['f8','g7','b']]);
 if(name==='grunfeld')return owns([['b2','c3'],['d2','d4'],['e2','e4'],['g1','f3','n']])&&enemies([['g7','g6'],['f8','g7','b']])&&gone(a,'c2')&&gone(a,'b1','n')&&gone(b,'d7')&&gone(b,'g8','n')&&took(a,'c2',b,'d7')&&took(b,'g8',a,'c2')&&took(b,'g8',a,'b1')&&took(a,'b2',b,'g8');
 return name==='najdorf'&&owns([['e2','e4'],['g1','d4','n'],['b1','c3','n'],['c1','e3','b']])&&enemies([['d7','d6'],['a7','a6'],['g8','f6','n']])&&gone(a,'d2')&&gone(b,'c7')&&took(b,'c7',a,'d2')&&took(a,'g1',b,'c7');
}
const activities=(s,a)=>[...s.rootMoves.filter(m=>m.piece==='p'&&m.captured==='p'&&'cdef'.includes(m.to[0])&&+abs(m.to,a)[1]>=3&&+abs(m.to,a)[1]<=6).map(m=>({kind:'capture',move:m,fen:s.fen,target:m.to})),...s.candidates.map(x=>({kind:'lever',advance:x.advance,move:x.move,fen:x.captureFen,target:x.target}))];
const activityKey=x=>x.kind+':'+(x.advance?.uci||'')+':'+x.move.uci;
export const priority=e=>e.evidence?.experiment==='E100'?100:inherited(e);
export function explainMove(input){
 const enabled=input.centerFormationTags===undefined?false:input.centerFormationTags;if(typeof enabled!=='boolean')throw Error('centerFormationTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxCenterFormationNodes===undefined?50000:input.maxCenterFormationNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxCenterFormationNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;const budget={tick(){if(++nodes>limit)throw Error('center-formation-budget');}},done=()=>({...base,schema:'coach-concepts-E100-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,centerFormationAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
  budget.tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){budget.tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
  const before=c.fen(),actor=c.turn(),enemy=other(actor),m=c.move(input.move);budget.tick();if(c.fen()!==base.after)throw Error('Parent central formation differs');if(c.isGameOver()){status='not-live';return done();}
  const source=formationSource({...input,openingStructureTags:true,maxOpeningStructureNodes:Math.max(0,limit-nodes)});nodes+=source.openingStructureAnalysis.nodes;if(source.openingStructureAnalysis.status==='exhausted'||nodes>limit)throw Error('center-formation-budget');
  const s=source.openingStructureAnalysis.witness;if(!s){status='source-frame-unavailable';return done();}const opening=inspect(input),current=activities(s.fresh.own,actor),old=activities(s.old.own,actor),central=c.board().flat().filter(p=>p?.color===actor&&p.type==='p'&&core.has(abs(p.square,actor))).map(p=>p.square);
  witness={experiment:'E100',actor,before,after:c.fen(),played:record(m),history:h?{fen:h.start,moves:h.moves}:null,source:s,opening,activities:current,oldActivities:old,central,profiles:[],remote:[]};
  const extra=[],add=(id,text,detail)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
  if(opening&&s.tracked&&current.length){for(const name of ['caro-kann','slav','queens-gambit','benko','kings-indian','grunfeld','najdorf']){budget.tick();if(!profile(s.tracked.units,s.tracked.rows,actor,name))continue;const prior=profile(s.tracked.beforeUnits,s.tracked.rows.slice(0,-1),actor,name),added=current.filter(x=>!old.some(y=>activityKey(x)===activityKey(y)));if(prior&&!added.length)continue;const activity=added[0]||current[0],p={name,reversed:actor==='b',activity,units:s.tracked.units,rows:s.tracked.rows,newProfile:!prior};witness.profiles.push(p);add(name+'-tracked-center',`${actor==='b'?'Reversed ':''}${name}-type structure: recorded origins and exchanges match; ${activity.move.uci} is a legal central pawn contact${activity.advance?' after '+activity.advance.uci:''}.`,{profile:p});}}
  if(central.length&&current.length){add('active-recorded-pawn-center',`Pawn center: ${central.join('/')} remain occupied by your pawns; ${current[0].move.uci} supplies a legal central contact${current[0].advance?' after '+current[0].advance.uci:''}.`,{central,activity:current[0]});if(central.length>=2){add('active-classical-center',`Classical center: ${central.join('/')} contain your pawns, with legal central pawn contact ${current[0].move.uci}; strategic center superiority remains unproved.`,{central,activity:current[0]});if(opening&&opening.turnNumber<=10)add('recorded-classical-opening-center',`Classical opening center: recorded home-board play leaves ${central.length} pawns on central squares and a legal pawn contact with ${current[0].target}.`,{central,activity:current[0]});}}
  if(!['p','k'].includes(m.piece)&&!core.has(abs(m.to,actor))){const frame=turnBoard(c,actor),oldFrame=legalPosition(before);budget.tick();const earlier=oldFrame.moves({verbose:true}),contacts=frame.moves({verbose:true}).filter(x=>x.from===m.to&&x.captured==='p'&&core.has(abs(x.to,actor))&&!earlier.some(o=>o.from===m.from&&o.to===x.to&&o.captured==='p'));
   for(const contact of contacts){budget.tick();const snapshot=legalPosition(frame.fen());frame.move(contact);let proof;try{proof=certifyCapture(snapshot,frame,contact,budget);}finally{frame.undo();}if(!proof)continue;const remote={frameFen:frame.fen(),capture:record(contact),proof};witness.remote.push(remote);add('certified-remote-center-contact',`Remote center influence: ${m.san} enables ${uci(contact)} on a central pawn in a next-actor-turn frame, retaining gain through every immediate counterreply.`,{remote});
    if(opening&&opening.turnNumber<=10&&!central.length&&h.records.some(r=>r.move.color===enemy&&r.move.piece==='p'&&r.move.to===contact.to)&&s.tracked?.units.some(u=>u.alive&&u.color===enemy&&u.type==='p'&&u.square===contact.to))add('recorded-hypermodern-center-contact',`Hypermodern opening contact: after recorded enemy central pawn occupation, ${m.san} creates certified ${uci(contact)} from outside the center in a next-actor-turn frame.`,{remote});
   }
  }if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='center-formation-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}

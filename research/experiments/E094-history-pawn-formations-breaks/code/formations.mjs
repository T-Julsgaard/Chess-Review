import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E093-forcing-draw-resources/code/draws.mjs';
const other=a=>a==='w'?'b':'w',abs=(s,a)=>s[0]+(a==='w'?s[1]:9-+s[1]),men=c=>c.board().flat().filter(Boolean);
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
function legal(c,tick){tick();const moves=c.moves({verbose:true});for(const m of moves)tick();return moves;}
function play(c,m,tick,fn){tick();c.move(m);try{return fn();}finally{c.undo();}}
export function trackHistory(h,played,tick){
 if(!h)return null;const units=men(legalPosition(h.start)).map(p=>({id:p.color+p.type+p.square,origin:p.square,color:p.color,initialType:p.type,type:p.type,square:p.square,alive:true})),rows=[];
 function update(m,index){tick();const moving=units.find(u=>u.alive&&u.square===m.from),lost=m.captured?units.find(u=>u.alive&&u.square===victim(m)):null;if(!moving||m.captured&&!lost)throw Error('Missing tracked formation unit');
  if(lost)lost.alive=false;moving.square=m.to;if(m.promotion)moving.type=m.promotion;
  if(m.isKingsideCastle()||m.isQueensideCastle()){const rank=m.from[1],from=(m.isKingsideCastle()?'h':'a')+rank,to=(m.isKingsideCastle()?'f':'d')+rank,rook=units.find(u=>u.alive&&u.square===from);if(!rook)throw Error('Missing castle rook');rook.square=to;}
  rows.push({ply:index,move:rec(m),actorId:moving.id,victimId:lost?.id||null});
 }
 h.records.forEach((r,i)=>update(r.move,i));const beforeUnits=structuredClone(units);update(played,h.moves.length);return{units,beforeUnits,rows};
}
function levers(c,color,tick){
 const b=turnBoard(c,color),rootMoves=legal(b,tick),candidates=[],attempts=[];
 for(const advance of rootMoves.filter(m=>m.piece==='p'&&!m.captured&&!m.promotion&&m.from[0]===m.to[0])){
  const attempt=play(b,advance,tick,()=>{
   const after=b.fen();if(b.isCheck()||b.isGameOver())return{advance:rec(advance),after,skipped:true,contacts:[]};
   const frame=turnBoard(b,color),contacts=legal(frame,tick).filter(m=>m.from===advance.to&&m.captured==='p'&&'cdef'.includes(victim(m)[0])&&!rootMoves.some(o=>o.from===advance.from&&o.captured==='p'&&victim(o)===victim(m))).map(m=>({move:rec(m),target:victim(m)}));
   return{advance:rec(advance),after,skipped:false,captureFen:frame.fen(),contacts};
  });attempts.push(attempt);for(const contact of attempt.contacts)candidates.push({advance:attempt.advance,after:attempt.after,captureFen:attempt.captureFen,...contact});
 }
 return{fen:b.fen(),rootMoves:rootMoves.map(rec),attempts,candidates};
}
const signature=x=>x.advance.uci+':'+x.target;
function shape(c,a,name){const b=other(a),own=s=>c.get(abs(s,a))?.type==='p'&&c.get(abs(s,a))?.color===a,enemy=s=>c.get(abs(s,a))?.type==='p'&&c.get(abs(s,a))?.color===b,piece=(s,type,color)=>c.get(abs(s,a))?.type===type&&c.get(abs(s,a))?.color===color;
 if(name==='benoni')return['d5','e4'].every(own)&&['c5','d6'].every(enemy);
 if(name==='dragon')return['d3','e2','g3'].every(own)&&enemy('e5')&&piece('g2','b',a)&&!men(c).some(p=>p.type==='p'&&(p.color===a&&p.square[0]==='c'||p.color===b&&p.square[0]==='d'));
 if(name==='closed-sicilian')return['c2','e4','d3','g3'].every(own)&&['c5','d6'].every(enemy)&&piece('g2','b',a)&&piece('c3','n',a);
 if(name==='botvinnik')return['c4','d3','e4','g3'].every(own)&&['e5','d6','g6'].every(enemy)&&piece('g2','b',a)&&piece('g7','b',b);
 return name==='panov'&&['c4','d4'].every(own)&&enemy('d5');
}
function provenance(tracked,c,a,name){
 if(!tracked||!shape(c,a,name))return null;const b=other(a),get=(color,origin)=>tracked.units.find(u=>u.color===color&&u.origin===abs(origin,a)),live=(color,origin,square,type='p')=>{const u=get(color,origin);return u?.alive&&u.initialType===type&&u.type===type&&u.square===abs(square,a);},gone=(color,origin)=>{const u=get(color,origin);return u?.initialType==='p'&&!u.alive;};
 let required,exchange=null;
 const pair=(firstColor,firstOrigin,victimColor,victimOrigin,secondColor,secondOrigin,nonpawn=false)=>{const first=get(firstColor,firstOrigin),victim=get(victimColor,victimOrigin),second=secondOrigin?get(secondColor,secondOrigin):null;if(!first||!victim||secondOrigin&&!second)return null;
  for(let i=0;i<tracked.rows.length-1;i++){const x=tracked.rows[i],y=tracked.rows[i+1];if(x.actorId===first.id&&x.victimId===victim.id&&y.victimId===first.id&&y.move.to===x.move.to&&y.move.color===secondColor&&(nonpawn?y.move.piece!=='p':y.actorId===second.id))return{capture:x,recapture:y};}return null;};
 if(name==='benoni'){required=live(a,'c2','d5')&&live(a,'e2','e4')&&live(b,'c7','c5')&&live(b,'d7','d6')&&gone(a,'d2')&&gone(b,'e7');exchange=pair(b,'e7',a,'d2',a,'c2');}
 if(name==='dragon'){required=live(a,'d2','d3')&&live(a,'e2','e2')&&live(a,'g2','g3')&&live(a,'f1','g2','b')&&live(b,'e7','e5')&&gone(a,'c2')&&gone(b,'d7');exchange=pair(a,'c2',b,'d7',b,null,true);}
 if(name==='closed-sicilian')required=live(a,'c2','c2')&&live(a,'d2','d3')&&live(a,'e2','e4')&&live(a,'g2','g3')&&live(a,'f1','g2','b')&&live(a,'b1','c3','n')&&live(b,'c7','c5')&&live(b,'d7','d6');
 if(name==='botvinnik')required=live(a,'c2','c4')&&live(a,'d2','d3')&&live(a,'e2','e4')&&live(a,'g2','g3')&&live(a,'f1','g2','b')&&live(b,'e7','e5')&&live(b,'d7','d6')&&live(b,'g7','g6')&&live(b,'f8','g7','b');
 if(name==='panov'){required=live(a,'c2','c4')&&live(a,'d2','d4')&&live(b,'c7','d5')&&gone(a,'e2')&&gone(b,'d7');exchange=pair(a,'e2',b,'d7',b,'c7');}
 return required&&(!['benoni','dragon','panov'].includes(name)||exchange)?{name,exchange,units:tracked.units}:null;
}
export const priority=e=>e.evidence?.experiment==='E094'?(e.id==='pawn-break-loss-warning'?111:99):inherited(e);
export function explainMove(input){
 const enabled=input.openingStructureTags===undefined?false:input.openingStructureTags;if(typeof enabled!=='boolean')throw Error('openingStructureTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxOpeningStructureNodes===undefined?50000:input.maxOpeningStructureNodes;if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxOpeningStructureNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;const tick=()=>{if(++nodes>limit)throw Error('opening-structure-budget');};
 const done=()=>({...base,schema:'coach-concepts-E094-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,openingStructureAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
 tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){tick();c.move(m);}if(c.isGameOver()){status='not-live';return done();}
 const actor=c.turn(),enemy=other(actor),before=c.fen(),oldCheck=c.isCheck();tick();const played=c.move(input.move);if(c.fen()!==base.after)throw Error('Parent formation position differs');if(c.isGameOver()){status='not-live';return done();}if(oldCheck||c.isCheck()){status='checking-frame-unavailable';return done();}
 const tracked=trackHistory(h,played,tick),fresh={own:levers(c,actor,tick),enemy:levers(c,enemy,tick)};c.undo();const old={own:levers(c,actor,tick),enemy:levers(c,enemy,tick)};c.move(input.move);
 witness={experiment:'E094',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(played),tracked,old,fresh,profiles:[],prevention:null,losses:[]};
 const extra=[],add=(id,text,detail)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
 const added=fresh.own.candidates.filter(x=>!old.own.candidates.some(o=>signature(o)===signature(x)));
 if(added.length)add('new-potential-pawn-break',`Potential pawn break: ${added[0].advance.uci} newly permits a legal capture contact with ${added[0].target} in a next-actor-turn snapshot.`,{candidates:added});
 if(added.length&&played.piece!=='p')add('legal-pawn-break-preparation',`Break preparation: ${played.san} makes ${added[0].advance.uci} possible, with a new legal pawn capture contact on ${added[0].target}; safe advancement remains unproved.`,{candidates:added});
 for(const name of ['benoni','dragon','closed-sicilian','botvinnik','panov']){tick();const p=provenance(tracked,c,actor,name);if(!p||shape(legalPosition(before),actor,name)&&!added.length)continue;
  let activity=fresh.own.candidates[0];if(name==='panov'){const frame=turnBoard(c,actor),capture=legal(frame,tick).find(m=>m.from===abs('c4',actor)&&m.to===abs('d5',actor)&&m.captured==='p');activity=capture?{capture:rec(capture),captureFen:frame.fen()}:null;}
  if(!activity)continue;const profile={...p,activity};witness.profiles.push(profile);
  const reversed=name==='dragon'?actor==='w':actor==='b',label=(reversed?'Reversed ':'')+name[0].toUpperCase()+name.slice(1);
  const text=name==='panov'?`${label}-type formation: recorded pawn exchanges leave ${['c4','d4'].map(s=>abs(s,actor)).join('/')} against ${abs('d5',actor)}; ${activity.capture.uci} is a legal pawn capture.`:`${label}-type formation: tracked pawn origins and current setup match; ${activity.advance.uci} gives a legal pawn contact with ${activity.target}.`;
  add(name+'-history-activity',text,{profile});
 }
 const denied=old.enemy.candidates.filter(o=>!fresh.enemy.candidates.some(x=>signature(x)===signature(o)));
 if(denied.length&&played.piece!=='k'){tick();const removed=legalPosition(c.fen());removed.remove(played.to);const fields=removed.fen().split(' ');fields[3]='-';let counter=null;try{counter=legalPosition(fields.join(' '));}catch{}
  if(counter&&!counter.isGameOver()&&!counter.isCheck()){const restored=levers(counter,enemy,tick),causal=denied.filter(o=>restored.candidates.some(x=>signature(x)===signature(o)));witness.prevention={counterFen:counter.fen(),removed:played.to,restored,causal};if(causal.length)add('causal-pawn-break-prevention',`Break prevented now: ${played.san} removes the legal ${causal[0].advance.uci}/${causal[0].move.uci} lever; deleting only your moved unit restores it.`,{prevention:witness.prevention});}
 }
 if(played.piece==='p'&&old.own.candidates.some(x=>x.advance.uci===uci(played))){for(const capture of legal(c,tick).filter(m=>m.captured==='p'&&victim(m)===played.to)){
  const prior=legalPosition(c.fen()),proof=play(c,capture,tick,()=>certifyCapture(prior,c,capture,{tick}));if(proof)witness.losses.push({capture:rec(capture),proof});
 }if(witness.losses.length)add('pawn-break-loss-warning',`Pawn-break warning: ${played.san} allows ${witness.losses[0].capture.uci}, preserving at least ${witness.losses[0].proof.minimumGain} nominal points of enemy gain through every immediate counterreply.`,{losses:witness.losses});}
 if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='opening-structure-budget')throw e;status='exhausted';events=base.events;witness=null;}return done();
}

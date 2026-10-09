import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E086-history-routes-transpositions/code/history.mjs';
const record=m=>({uci:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const pieces=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color}));
const kingSteps=s=>s.moves.filter(m=>m.piece==='k'&&!m.flags.includes('k')&&!m.flags.includes('q')).map(m=>m.to).sort();
export const priority=e=>e.evidence?.experiment==='E087'?46:inherited(e);
export function explainMove(input){
 const enabled=input.mobilityTags===undefined?false:input.mobilityTags;
 if(typeof enabled!=='boolean')throw Error('mobilityTags must be boolean');
 if(!enabled)return parent(input);
 const limit=input.maxMobilityNodes===undefined?50000:input.maxMobilityNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxMobilityNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;
 const done=()=>({...base,schema:'coach-concepts-E087-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,
  mobilityAnalysis:{limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const tick=()=>{if(++nodes>limit)throw Error('mobility-budget');};
 const scan=c=>{tick();const moves=[];for(const m of c.moves({verbose:true})){tick();c.move(uci(m));moves.push({...record(m),after:c.fen(),terminal:c.isGameOver()});c.undo();}return{fen:c.fen(),check:c.isCheck(),moves};};
 const counter=(fen,turn,remove)=>{tick();const c=legalPosition(fen);if(remove)c.remove(remove);const fields=c.fen().split(' ');fields[1]=turn;fields[3]='-';try{return legalPosition(fields.join(' '));}catch(e){if(!e.message.startsWith('Invalid position:'))throw e;return null;}};
 try{
  tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const m of h?.moves||[]){tick();c.move(m);}
  if(c.isGameOver()){status='not-live';return done();}
  const actor=c.turn(),enemy=actor==='w'?'b':'w',before=c.fen(),root=scan(c);tick();const played=c.move(input.move);
  if(c.fen()!==base.after)throw Error('Parent position differs');if(c.isGameOver()){status='not-live';return done();}
  const after=c.fen(),actual=scan(c),extra=[];
  witness={experiment:'E087',actor,enemy,history:h?{fen:h.start,moves:h.moves}:null,before,after,played:record(played),root,actual,
   beforeEnemy:null,removedAfter:null,actorAfter:null,denied:[],cutoffs:[],preventedCastles:[],escapeSquares:[]};
  const add=(id,text)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness}});};
  if(c.isCheck()&&actual.moves.length&&!actual.moves.some(m=>m.piece==='k'))add('no-king-evasion','No king escape: every legal check evasion is a capture or block by another piece.');
  if(played.piece!=='k'){
   const previous=counter(before,enemy,null),removed=counter(after,enemy,played.to);
   if(previous&&removed){
    witness.beforeEnemy=scan(previous);witness.removedAfter=scan(removed);
    const old=kingSteps(witness.beforeEnemy),now=kingSteps(actual),without=kingSteps(witness.removedAfter);
    witness.denied=old.filter(s=>!now.includes(s)&&without.includes(s)&&c.attackers(s,actor).includes(played.to));
    if(witness.denied.length)add('causal-king-restriction',`King restriction: ${played.san} removes ${witness.denied.slice(0,3).join(' and ')} from the enemy king's legal destinations now.`);
    if(['r','q'].includes(played.promotion||played.piece)){
     witness.cutoffs=witness.denied.filter(s=>s[0]===played.to[0]||s[1]===played.to[1]);
     if(witness.cutoffs.length){add('current-king-cutoff',`King cut-off now: ${played.to} denies the enemy king a legal step onto ${witness.cutoffs.slice(0,3).join(' and ')}.`);
      if(played.piece==='r'&&pieces(c).every(p=>'krp'.includes(p.type)))add('rook-ending-king-cutoff',`Rook-ending cut-off: ${played.san} causally denies ${witness.cutoffs.slice(0,3).join(' and ')} as current enemy king destinations.`);}
    }
    const castles=s=>s.moves.filter(m=>m.flags.includes('k')||m.flags.includes('q')).map(m=>m.uci);
    const restored=castles(witness.removedAfter),current=castles(actual);
    for(const code of castles(witness.beforeEnemy)){
     tick();if(current.includes(code)||!restored.includes(code))continue;
     const rank=enemy==='w'?'1':'8',squares=code.slice(2,4)[0]==='g'?['e'+rank,'f'+rank,'g'+rank]:['e'+rank,'d'+rank,'c'+rank];
     const attacked=squares.filter(s=>c.attackers(s,actor).includes(played.to));if(!attacked.length)continue;
     witness.preventedCastles.push({uci:code,attacked});
    }
    if(witness.preventedCastles.length)add('causal-castling-prevention',`Castling prevention: ${played.san} attacks ${witness.preventedCastles[0].attacked.join(' and ')}, removing a previously legal castle now.`);
   }
   const own=counter(after,actor,null);
   if(own){witness.actorAfter=scan(own);const prior=kingSteps(root);witness.escapeSquares=kingSteps(witness.actorAfter).filter(s=>!prior.includes(s));
    if(witness.escapeSquares.length)add('new-legal-king-step',`New king escape step: ${played.san} makes ${witness.escapeSquares.slice(0,3).join(' and ')} legal in an actor-turn snapshot.`);}
  }
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='mobility-budget')throw e;status='exhausted';events=base.events;witness=null;}
 return done();
}

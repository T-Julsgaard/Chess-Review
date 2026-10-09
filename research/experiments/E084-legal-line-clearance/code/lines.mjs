import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {explainMove as parent,priority as inherited} from '../../E083-contact-exchange-changes/code/changes.mjs';
const men=c=>c.board().flat().filter(Boolean).map(({square,type,color})=>({square,type,color})).sort((a,b)=>a.square.localeCompare(b.square));
const record=m=>({uci:uci(m),san:m.san,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
function ray(from,to,type){
 const dx=to.charCodeAt(0)-from.charCodeAt(0),dy=Number(to[1])-Number(from[1]);
 if(!dx&&!dy)return null;
 const diagonal=Math.abs(dx)===Math.abs(dy),straight=dx===0||dy===0;
 if(!(type==='b'?diagonal:type==='r'?straight:diagonal||straight))return null;
 const cells=[];for(let i=1;i<Math.max(Math.abs(dx),Math.abs(dy));i++)cells.push(String.fromCharCode(from.charCodeAt(0)+Math.sign(dx)*i)+(Number(from[1])+Math.sign(dy)*i));
 return cells;
}
export const priority=e=>e.evidence?.experiment==='E084'?40:inherited(e);
export function explainMove(input){
 const enabled=input.lineTags===undefined?false:input.lineTags;
 if(typeof enabled!=='boolean')throw Error('lineTags must be boolean');
 if(!enabled)return parent(input);
 const limit=input.maxLineNodes===undefined?50000:input.maxLineNodes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxLineNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witnesses=[];
 const done=()=>({...base,schema:'coach-concepts-E084-prototype',events,
  comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,lineAnalysis:{limit,nodes,status,witnesses}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 const tick=()=>{if(++nodes>limit)throw Error('line-budget');};
 try{
  tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);
  for(const m of h?.moves||[]){tick();c.move(m);}
  if(c.isGameOver()){status='not-live';return done();}
  const actor=c.turn(),before=c.fen(),beforePieces=men(c);tick();const played=c.move(input.move);
  if(c.fen()!==base.after)throw Error('Parent position differs');
  if(c.isGameOver()){status='not-live';return done();}
  const after=c.fen(),afterPieces=men(c),root=legalPosition(before),hypothetical=turnBoard(c,actor);
  tick();const legal=hypothetical.moves({verbose:true}),extra=[];
  for(const slider of afterPieces.filter(p=>p.color===actor&&'brq'.includes(p.type)&&p.square!==played.to)){
   tick();if(root.get(slider.square)?.type!==slider.type||root.get(slider.square)?.color!==actor)continue;
   for(const target of afterPieces.filter(p=>p.color!==actor)){
    tick();const cells=ray(slider.square,target.square,slider.type);if(!cells||!cells.includes(played.from))continue;
    if(cells.some(s=>c.get(s)))continue;
    const blockers=cells.filter(s=>root.get(s));if(blockers.length!==1||blockers[0]!==played.from)continue;
    if(root.get(target.square)?.type!==target.type||root.get(target.square)?.color!==target.color)continue;
    const captures=target.type==='k'?[]:legal.filter(m=>m.from===slider.square&&m.to===target.square&&m.captured===target.type&&!m.isEnPassant()).map(uci).sort();
    const checking=target.type==='k'&&c.isCheck()&&c.attackers(target.square,actor).includes(slider.square);
    if(!checking&&!captures.length)continue;
    const replies=[];
    if(checking){tick();for(const reply of c.moves({verbose:true})){tick();c.move(uci(reply));replies.push({...record(reply),fen:c.fen(),terminal:c.isGameOver()});c.undo();}}
    const witness={experiment:'E084',actor,history:h?{fen:h.start,moves:h.moves}:null,before,after,beforePieces,afterPieces,played:record(played),
     slider,target,cells,blocker:played.from,captures,checking,replies,hypotheticalActorFen:checking?null:hypothetical.fen()};
    witnesses.push(witness);
    const action=checking?'checks the king':'has a legal capture contact',suffix=`${slider.square}–${target.square}`;
    const add=(id,label)=>{tick();const text=`${label}: moving from ${played.from} clears ${suffix}; ${slider.type==='q'?'queen':slider.type==='r'?'rook':'bishop'} ${slider.square} ${action}${checking?'':` on ${target.square}`}.`;
     if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:witness});};
    add('legal-line-clearance','Line clearance');add('legal-clearance','Clearance');add('legal-line-opening','Line opening');
    add('legal-opening-lines','Opening lines');add('legal-alignment','Witnessed alignment');add('legal-line-contact','Line contact');add('legal-alignment-contact','Alignment contact');
    if(slider.square[0]===target.square[0])add('legal-file-opening','File opening');
    if(checking){add('checking-king-piece-alignment','King-piece alignment');if(slider.type==='q')add('checking-queen-king-alignment','Queen-king alignment');}
    if(slider.type==='r'&&target.type==='q')add('legal-rook-queen-alignment','Rook-queen alignment');
   }
  }
  if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='line-budget')throw e;status='exhausted';events=base.events;witnesses=[];}
 return done();
}

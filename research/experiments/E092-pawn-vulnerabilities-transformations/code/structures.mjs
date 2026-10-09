import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {pawnFeatures} from '../../E021-structural-concepts/code/features.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {routeQuery} from '../../E037-promotion-routes/code/routes.mjs';
import {explainMove as wedge,priority as wedgePriority} from '../../FRIEND-03-pawn-wedge/code/wedge.mjs';
import {explainMove as parent,priority as inherited} from '../../E091-forced-material-sequences/code/sequences.mjs';
const men=c=>c.board().flat().filter(Boolean),victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
const rank=(s,a)=>a==='w'?+s[1]:9-+s[1],rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
function legal(c,tick){tick();const list=c.moves({verbose:true});for(const m of list)tick();return list;}
function play(c,m,tick,fn){tick();c.move(m);try{return fn();}finally{c.undo();}}
function targets(c,color,tick){
 const b=turnBoard(c,color),captures=[];for(const m of legal(b,tick).filter(m=>m.captured==='p')){const before=legalPosition(b.fen()),proof=play(b,m,tick,()=>certifyCapture(before,b,m,{tick}));captures.push({move:rec(m),pawn:victim(m),proof});}
 return {fen:b.fen(),features:pawnFeatures(c,color),captures};
}
function backwards(c,color,tick){
 const b=turnBoard(c,color),all=men(b).filter(p=>p.type==='p'&&p.color===color),moves=legal(b,tick),rows=[];
 for(const p of all){tick();const neighbors=all.filter(q=>Math.abs(q.square.charCodeAt(0)-p.square.charCodeAt(0))===1),pawnMoves=moves.filter(m=>m.from===p.square);
  if(!neighbors.length||neighbors.some(q=>rank(q.square,color)<=rank(p.square,color))||!pawnMoves.length||pawnMoves.some(m=>m.captured||m.promotion))continue;
  const advances=[];for(const advance of pawnMoves){const losses=play(b,advance,tick,()=>{
   const result=[];for(const capture of legal(b,tick).filter(m=>m.captured==='p'&&victim(m)===advance.to)){
    const before=legalPosition(b.fen()),proof=play(b,capture,tick,()=>certifyCapture(before,b,capture,{tick}));if(proof)result.push({move:rec(capture),proof});
   }return result;
  });advances.push({move:rec(advance),losses});}
  rows.push({pawn:p.square,neighbors:neighbors.map(q=>q.square),advances,weak:advances.every(a=>a.losses.length>0)});
 }return {fen:b.fen(),rows};
}
const positive=s=>s.captures.filter(x=>x.proof),shape=s=>({isolated:s.features.isolated.length,doubled:s.features.doubled.length,islands:s.features.islands.length,passed:s.features.passed.length});
export const priority=e=>e.id==='pawn-wedge'?wedgePriority(e):e.evidence?.experiment==='E092'?102:inherited(e);
export function explainMove(input){
 const enabled=input.structureTags===undefined?false:input.structureTags;if(typeof enabled!=='boolean')throw Error('structureTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxStructureNodes===undefined?50000:input.maxStructureNodes,depth=input.structurePushes===undefined?2:input.structurePushes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxStructureNodes must be integer0..50000');if(!Number.isSafeInteger(depth)||depth<1||depth>6)throw Error('structurePushes must be integer1..6');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null,wedgeAnalysis=null;const tick=()=>{if(++nodes>limit)throw Error('structure-budget');};
 const done=()=>({...base,schema:'coach-concepts-E092-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,structureAnalysis:{limit,depth,nodes,status,witness,wedgeAnalysis}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
 tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
 const actor=c.turn(),enemy=actor==='w'?'b':'w',before=c.fen(),oldCheck=c.isCheck();tick();const played=c.move(input.move);if(c.fen()!==base.after)throw Error('Parent structure position differs');if(c.isGameOver()){status='not-live';return done();}
 const extra=[],add=(id,text,detail)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,detail}});};
 if(!oldCheck&&!c.isCheck()){
  const fresh={own:targets(c,actor,tick),enemy:targets(c,enemy,tick)},newBackward=backwards(c,enemy,tick);c.undo();const old={own:targets(c,actor,tick),enemy:targets(c,enemy,tick)},oldBackward=backwards(c,enemy,tick);c.move(input.move);
  witness={experiment:'E092',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(played),old,fresh,oldBackward,newBackward,repeated:[],route:null};
  const selected=positive(fresh.own).filter(x=>!positive(old.own).some(o=>o.pawn===x.pawn&&o.move.from===(x.move.from===played.to?played.from:x.move.from))).sort((a,b)=>b.proof.minimumGain-a.proof.minimumGain||a.move.uci.localeCompare(b.move.uci));
  if(selected.length)add('certified-pawn-target-selection',`Pawn target: ${selected[0].move.uci} is legally available on your turn and preserves at least ${selected[0].proof.minimumGain} nominal points through every immediate counterreply.`,{selected});
  const newWeak=newBackward.rows.filter(p=>p.weak&&!oldBackward.rows.some(o=>o.pawn===p.pawn&&o.weak));
  if(newWeak.length)add('certified-backward-pawn',`Backward pawn: ${newWeak[0].pawn} lacks neighboring support; each legal advance allows a certified loss of that pawn through every immediate counterreply.`,{pawns:newWeak});
  const fs={own:shape(fresh.own),enemy:shape(fresh.enemy)},os={own:shape(old.own),enemy:shape(old.enemy)},vulnerable={own:positive(fresh.enemy).map(x=>x.pawn),enemy:positive(fresh.own).map(x=>x.pawn)};
  vulnerable.own=[...new Set(vulnerable.own)].sort();vulnerable.enemy=[...new Set(vulnerable.enemy)].sort();
  if(JSON.stringify(fs.own)!==JSON.stringify(fs.enemy)&&JSON.stringify(fs)!==JSON.stringify(os)&&vulnerable.own.length!==vulnerable.enemy.length)add('legal-pawn-structure-imbalance',`Pawn-structure imbalance: conditional pawn-loss targets differ ${vulnerable.own.length} to ${vulnerable.enemy.length}; the changed pawn features and complete legal capture witnesses are recorded.`,{shapes:fs,vulnerable});
  const earlier=h?.records.at(-2),last=h?.records.at(-1);if(earlier?.move.color===actor&&!legalPosition(earlier.after).isCheck()&&last?.move.color===enemy&&earlier.move.to===played.from&&!earlier.move.promotion&&!played.promotion){
   const prior=targets(legalPosition(earlier.after),actor,tick);for(const x of positive(fresh.own).filter(x=>x.move.from===played.to)){
    const match=positive(prior).find(p=>p.pawn===x.pawn&&p.move.from===earlier.move.to);if(match&&legalPosition(earlier.before).get(x.pawn)?.type==='p'&&c.get(x.pawn)?.type==='p'&&last.move.from!==x.pawn)witness.repeated.push({pawn:x.pawn,earlier:{before:earlier.before,after:earlier.after,move:uci(earlier.move),target:match},current:x});
   }
   if(witness.repeated.length)add('repeated-certified-pawn-target',`Repeated pawn target: the same moved piece again has a certified legal capture of ${witness.repeated[0].pawn}; both recorded contacts survive immediate counterreplies.`,{contacts:witness.repeated});
  }
  if(played.piece==='p'&&!played.promotion&&fresh.own.features.passed.includes(played.to)){
   const ownCount=fresh.own.features.passed.length,enemyCount=fresh.enemy.features.passed.length,newPassed=!old.own.features.passed.includes(played.from),undoubled=old.own.features.doubled.filter(f=>!fresh.own.features.doubled.includes(f)),majority=old.own.features.majorities.find(m=>m.files.includes(played.from[0]));
   if(ownCount>enemyCount||played.captured==='p'&&newPassed&&(undoubled.length||majority.own>majority.enemy)){
    const reused=base.events.find(e=>e.id==='promotion-route'&&e.evidence.pawn===played.to&&e.evidence.proof.depth===depth&&e.evidence.afterFen===c.fen())?.evidence.proof||base.breakthroughAnalysis?.witness?.afterProof;
    const budget={limit:limit-nodes,nodes:0};let afterProof;try{afterProof=reused?.depth===depth&&reused.rootFen===c.fen()?reused:routeQuery(c,actor,played.to,depth,budget);}finally{nodes+=budget.nodes;}tick();
    witness.route={depth,ownCount,enemyCount,newPassed,undoubled,majority,afterProof,beforeProof:null,reused:afterProof===reused};
    if(afterProof.win){
     if(ownCount>enemyCount)add('certified-passed-pawn-imbalance',`Passed-pawn imbalance: ${ownCount} against ${enemyCount}; your pawn on ${played.to} has a surviving queen route within ${depth} pushes against every defense.`,{route:witness.route});
     if(played.captured==='p'&&newPassed&&(undoubled.length||majority.own>majority.enemy)){
      c.undo();const budget={limit:limit-nodes,nodes:0};try{witness.route.beforeProof=routeQuery(c,actor,played.from,depth,budget);}finally{nodes+=budget.nodes;c.move(input.move);}tick();
      if(!witness.route.beforeProof.win){if(undoubled.length)add('certified-structural-transformation',`Structural transformation: ${played.san} removes doubled pawns on ${undoubled.join(', ')} and creates a surviving queen route; the same bounded pre-move route failed.`,{route:witness.route});
       if(majority.own>majority.enemy)add('majority-to-certified-passer',`Majority transformed: ${played.san} turns the recorded ${majority.own}-against-${majority.enemy} pawn majority into a passer with a certified surviving queen route.`,{route:witness.route});
      }
     }
    }
   }
  }
 }
 if(input.wedgeTags!==undefined){const result=wedge(input);wedgeAnalysis=result.wedgeAnalysis;for(let n=0;n<(wedgeAnalysis?.nodes||0);n++)tick();const event=result.events.find(e=>e.id==='pawn-wedge');if(event&&!base.events.some(e=>e.id==='pawn-wedge'))extra.push(event);}
 if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(!['structure-budget','route-budget'].includes(e.message))throw e;events=base.events;witness=null;wedgeAnalysis=null;status='exhausted';}return done();
}




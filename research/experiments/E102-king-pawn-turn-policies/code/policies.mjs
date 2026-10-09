import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E101-tactical-constraints-vulnerabilities/code/constraints.mjs';
const men=c=>c.board().flat().filter(Boolean),points=(c,a)=>men(c).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0),rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,flags:m.flags});
const distance=(a,b)=>Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1]));
export function kingPawnQuery(c,actor,pawn,plies,allowKing,budget){
 const rootFen=c.fen(),initialBalance=points(c,actor),promotion=pawn[0]+(actor==='w'?8:1),cache=budget.cache||(budget.cache=new Map()),hitsBefore=budget.cacheHits||0;
 const positionKey=fen=>fen.split(' ').slice(0,4).join(' '),order=m=>m.from[0]+(actor==='w'?m.from[1]:9-+m.from[1])+m.to[0]+(actor==='w'?m.to[1]:9-+m.to[1])+(m.promotion||'');
 const history=c.history({verbose:true});let rootCounts=new Map([[positionKey(history[0]?.before||rootFen),1]]);for(const m of history){const key=positionKey(m.after);if(m.piece==='p'||m.captured)rootCounts=new Map([[key,1]]);else rootCounts.set(key,(rootCounts.get(key)||0)+1);}
 function queenGoal(square){budget.tick();const fen=c.fen(),responses=[],mate=c.isCheckmate()&&c.turn()!==actor;
  if(mate)return{kind:'queen-goal',win:true,fen,square,mate,responses};if(c.isGameOver()||points(c,actor)<=initialBalance)return{kind:'queen-goal',win:false,fen,square,mate:false,terminal:c.isGameOver(),responses};
  budget.tick();const legal=c.moves({verbose:true}).sort((a,b)=>order(a).localeCompare(order(b)));for(const m of legal){budget.tick();c.move(m);try{const unit=c.get(square),gain=points(c,actor)-initialBalance,terminal=c.isGameOver(),good=unit?.type==='q'&&unit.color===actor&&gain>0&&!terminal;responses.push({move:uci(m),fen:c.fen(),gain,terminal,good});if(!good)return{kind:'queen-goal',win:false,fen,square,mate:false,terminal:false,responses};}finally{c.undo();}}
  return{kind:'queen-goal',win:true,fen,square,mate:false,terminal:false,responses};
 }
 function walk(square,left,counts){
  budget.tick();const fen=c.fen(),unit=c.get(square);if(unit?.color===actor&&unit.type==='q')return queenGoal(square);
  if(c.isGameOver())return{kind:'terminal',win:false,fen,reason:c.isCheckmate()?'mate':c.isStalemate()?'stalemate':c.isInsufficientMaterial()?'insufficient':c.isThreefoldRepetition()?'repetition':'fifty-move'};
  if(unit?.type!=='p'||unit.color!==actor)return{kind:'lost-pawn-or-nonqueen-promotion',win:false,fen,square,type:unit?.type||null};
  if(!left)return{kind:'limit',win:false,fen,square};
  const currentKey=positionKey(fen),locations=budget.locations||(budget.locations=new Map()),kings=key=>{if(locations.has(key))return locations.get(key);const result={};for(const [row,text] of key.split(' ')[0].split('/').entries()){let file=0;for(const ch of text){if(/[1-8]/.test(ch))file+=+ch;else{if(ch==='K'||ch==='k')result[ch]='abcdefgh'[file]+(8-row);file++;}}}locations.set(key,result);return result;},now=kings(currentKey);
  // An unchanged king/pawn placement cannot repeat in fewer than four plies.
  // Keep every historical count capable of reaching threefold within this bound.
  const drawState=[...counts].filter(([key,n])=>{const old=kings(key),first=key===currentKey?4:Math.max(1,distance(old.K,now.K)+distance(old.k,now.k));return first+(n===1?4:0)<=left;}).sort((a,b)=>a[0].localeCompare(b[0]));
  const cacheKey=JSON.stringify([actor,initialBalance,allowKing,square,left,fen,drawState]);if(cache.has(cacheKey)){budget.cacheHits=(budget.cacheHits||0)+1;return cache.get(cacheKey);}const save=node=>{cache.set(cacheKey,node);return node;};
  budget.tick();const actorTurn=c.turn()===actor,all=c.moves({verbose:true}),moves=(actorTurn&&!allowKing?all.filter(m=>m.from===square):all).sort((a,b)=>{
   const score=m=>!actorTurn?0:m.piece==='p'?(m.promotion==='q'?10000:100+(actor==='w'?+m.to[1]:9-+m.to[1])):10+(actor==='w'?+m.to[1]:9-+m.to[1])-distance(m.to,promotion);
   return score(b)-score(a)||order(a).localeCompare(order(b));
  }),inventory=moves.map(uci),branches=[];
  for(const m of moves){budget.tick();c.move(m);let child;try{const key=positionKey(c.fen()),nextCounts=m.piece==='p'||m.captured?new Map([[key,1]]):new Map(counts);if(m.piece!=='p'&&!m.captured)nextCounts.set(key,(nextCounts.get(key)||0)+1);child=walk(m.from===square&&m.piece==='p'?m.to:square,left-1,nextCounts);}finally{c.undo();}
   if(child.win===actorTurn)return save({kind:actorTurn?'choice':'counterchoice',win:actorTurn,fen,square,moves:inventory,move:uci(m),child});branches.push({move:uci(m),child});
  }
  return save({kind:actorTurn?'all-fail':'all',win:!actorTurn,fen,square,moves:inventory,branches});
 }
 const tree=walk(pawn,plies,rootCounts);return{rootFen,actor,pawn,plies,allowKing,initialBalance,tree,win:tree.win,cacheHits:(budget.cacheHits||0)-hitsBefore};
}
export const priority=e=>e.evidence?.experiment==='E102'?158:inherited(e);
export function explainMove(input){
 const enabled=input.kingPawnPolicyTags===undefined?false:input.kingPawnPolicyTags;if(typeof enabled!=='boolean')throw Error('kingPawnPolicyTags must be boolean');if(!enabled)return parent(input);
 const plies=input.kingPawnPlies===undefined?6:input.kingPawnPlies,limit=input.maxKingPawnPolicyNodes===undefined?50000:input.maxKingPawnPolicyNodes;if(!Number.isSafeInteger(plies)||plies<0||plies>12)throw Error('kingPawnPlies must be integer0..12');if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxKingPawnPolicyNodes must be integer0..50000');
 const base=parent(input);let nodes=0,status='no-new-fact',witness=null,events=base.events;const budget={tick(){if(++nodes>limit)throw Error('king-pawn-policy-budget');}},done=()=>({...base,schema:'coach-concepts-E102-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,kingPawnPolicyAnalysis:{plies,limit,nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
  budget.tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){budget.tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
  const before=c.fen(),actor=c.turn(),units=men(c),pawn=units.find(p=>p.type==='p'&&p.color===actor);if(units.length!==3||!pawn||units.filter(p=>p.type==='k').length!==2){status='not-applicable';return done();}const m=c.move(input.move);budget.tick();if(c.fen()!==base.after)throw Error('Parent king-pawn policy differs');if(m.piece!=='k'||m.captured||c.isGameOver()){status='not-live-king-entry';return done();}
  const actual=kingPawnQuery(c,actor,pawn.square,plies,true,budget);witness={experiment:'E102',actor,before,after:c.fen(),played:rec(m),history:h?{fen:h.start,moves:h.moves}:null,pawn:pawn.square,actual,pawnOnly:null,restored:null,flipped:null};
  const extra=[],add=(id,text,detail)=>{budget.tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E102',before,after:c.fen(),detail}});};
  if(actual.win){
   add('full-king-pawn-queen-policy',`Pawn-ending policy: after ${m.san}, legal king and pawn continuations force a surviving queen within ${plies} further plies against every defense.`,{query:'actual'});
   witness.pawnOnly=kingPawnQuery(c,actor,pawn.square,plies,false,budget);if(!witness.pawnOnly.win){add('required-king-continuation',`King continuation required: after ${m.san}, the complete ${plies}-ply policy reaches a surviving queen; pawn-only choices cannot achieve that goal at this bound.`,{full:'actual',restricted:'pawnOnly'});
    if(['d4','e4','d5','e5'].includes(m.to))add('central-king-full-route-support',`Central king support: ${m.to} permits a complete surviving-queen policy requiring later king moves within ${plies} plies; enduring safety remains unproved.`,{full:'actual',restricted:'pawnOnly',center:m.to});
   }
   const restored=legalPosition(c.fen());restored.remove(m.to);restored.put({type:'k',color:actor},m.from);const fields=restored.fen().split(' ');fields[3]='-';const restoreFrame=legalPosition(fields.join(' '));witness.restored=kingPawnQuery(restoreFrame,actor,pawn.square,plies,true,budget);if(!witness.restored.win)add('bounded-key-square-entry',`Bounded key-square entry: ${m.to} admits a surviving-queen policy within ${plies} plies; restoring only your king to ${m.from} removes that bounded route.`,{full:'actual',counterfactual:'restored',square:m.to});
   const flipFields=c.fen().split(' ');flipFields[1]=actor;flipFields[3]='-';let flipped;try{flipped=legalPosition(flipFields.join(' '));}catch{}if(flipped){witness.flipped=kingPawnQuery(flipped,actor,pawn.square,plies,true,budget);if(!witness.flipped.win){add('bounded-defender-zugzwang',`Bounded zugzwang: the defender to move allows a surviving queen within ${plies} plies; the same placement with your turn has no such policy.`,{full:'actual',counterfactual:'flipped'});add('bounded-mutual-turn-disadvantage',`Bounded mutual turn disadvantage: your turn prevents the queen objective within ${plies} plies; defender's turn permits it. This is a finite comparison.`,{full:'actual',counterfactual:'flipped'});}}
   events=[...base.events,...extra];status='proven';
  }
 }catch(e){if(e.message!=='king-pawn-policy-budget')throw e;events=base.events;witness=null;status='exhausted';}return done();
}

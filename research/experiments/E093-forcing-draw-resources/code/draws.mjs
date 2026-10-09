import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E092-pawn-vulnerabilities-transformations/code/structures.mjs';
const balance=(c,a)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===a?1:-1),0);
const key=c=>c.fen().split(' ').slice(0,4).join(' ');
const rec=m=>({uci:uci(m),from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null});
export function drawQuery(c,actor,mode,plies,tick){
 const rootFen=c.fen();function solve(left){
  tick();const fen=c.fen(),goal=c.turn()===actor&&(mode==='repetition'?c.isThreefoldRepetition():c.isStalemate());
  if(goal)return{kind:'goal',win:true,fen,key:key(c),goal:mode};
  // A defender may decline a repetition claim; only the actor-side goal ends it.
  const reason=c.isCheckmate()?'mate':c.isStalemate()?'other-stalemate':c.isInsufficientMaterial()?'insufficient':c.isDrawByFiftyMoves()?'fifty-move-threshold':null;
  if(reason)return{kind:'terminal',win:false,fen,reason};if(!left)return{kind:'limit',win:false,fen};
  tick();const actorTurn=c.turn()===actor,legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),options=actorTurn&&mode==='repetition'?legal.filter(m=>/[+#]/.test(m.san)):legal,branches=[];
  for(const m of options){tick();c.move(m);let child;try{child=solve(left-1);}finally{c.undo();}
   if(child.win===actorTurn)return{kind:actorTurn?'choice':'counterchoice',win:actorTurn,fen,move:uci(m),child};branches.push({move:uci(m),child});
  }
  if(!actorTurn&&!legal.length)throw Error('Unclassified draw terminal');return{kind:actorTurn?'all-fail':'all',win:!actorTurn,fen,branches};
 }
 return{rootFen,actor,mode,plies,tree:solve(plies)};
}
export const priority=e=>e.evidence?.experiment==='E093'?145:inherited(e);
export function explainMove(input){
 const enabled=input.drawTags===undefined?false:input.drawTags;if(typeof enabled!=='boolean')throw Error('drawTags must be boolean');if(!enabled)return parent(input);
 const limit=input.maxDrawNodes===undefined?50000:input.maxDrawNodes,plies=input.drawPlies===undefined?3:input.drawPlies,modes=input.drawModes===undefined?['repetition','stalemate']:input.drawModes;
 if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxDrawNodes must be integer0..50000');if(!Number.isSafeInteger(plies)||plies<1||plies>9)throw Error('drawPlies must be integer1..9');
 if(!Array.isArray(modes)||!modes.length||modes.length>2||new Set(modes).size!==modes.length||modes.some(m=>!['repetition','stalemate'].includes(m)))throw Error('drawModes must be nonempty distinct repetition/stalemate array');
 const base=parent(input);let nodes=0,status='no-new-fact',events=base.events,witness=null;const tick=()=>{if(++nodes>limit)throw Error('draw-budget');};
 const done=()=>({...base,schema:'coach-concepts-E093-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,drawAnalysis:{limit,plies,modes:[...modes],nodes,status,witness}});
 if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
 try{
 tick();const h=validateHistory(input),c=legalPosition(h?.start||input.fen);for(const code of h?.moves||[]){tick();c.move(code);}if(c.isGameOver()){status='not-live';return done();}
 const actor=c.turn(),before=c.fen(),initialBalance=balance(c,actor);tick();const played=c.move(input.move);if(c.fen()!==base.after)throw Error('Parent draw position differs');if(c.isGameOver()){status='not-live';return done();}
 const offers=c.moves({verbose:true}).filter(m=>m.captured&&(m.isEnPassant()?m.to[0]+m.from[1]:m.to)===played.to).map(uci);tick();
 witness={experiment:'E093',actor,before,after:c.fen(),history:h?{fen:h.start,moves:h.moves}:null,played:rec(played),initialBalance,check:c.isCheck(),offers,queries:[]};
 const extra=[],add=(id,text,query)=>{tick();if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{...witness,query}});};
 if(modes.includes('repetition')&&c.isCheck()){
  const query=drawQuery(c,actor,'repetition',plies,tick);witness.queries.push(query);
  if(query.tree.win){add('forcing-check-repetition',`Checking draw resource: ${played.san} forces your threefold claim opportunity within ${plies} further plies; every defense is covered by checking continuations.`,query);
   if(initialBalance<0)add('checking-draw-fortress',`Checking fortress resource: despite a ${-initialBalance}-point nominal deficit, ${played.san} forces your repetition claim opportunity within ${plies} further plies.`,query);
  }
 }
 if(modes.includes('stalemate')&&played.piece!=='k'&&VALUES[played.promotion||played.piece]>0&&offers.length){
  const query=drawQuery(c,actor,'stalemate',plies,tick);witness.queries.push(query);
  if(query.tree.win)add('forced-own-stalemate-resource',`Forced stalemate resource: ${played.san} offers the moved piece; every legal defense permits forcing your stalemate within ${plies} further plies.`,query);
 }
 if(extra.length){events=[...base.events,...extra];status='proven';}
 }catch(e){if(e.message!=='draw-budget')throw e;status='exhausted';events=base.events;witness=null;}return done();
}


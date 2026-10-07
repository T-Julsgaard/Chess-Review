import {Chess} from '../../../../lib/chess.js';
import {uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent,priority as parentPriority} from '../../E032-draw-history/code/draws.mjs';
const names={n:'knight',b:'bishop',r:'rook',q:'queen'},balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const board=f=>{const c=new Chess(f.history?.fen||f.fen);if(f.history)for(const m of f.history.moves)c.move(m);return c;};
export function opponentBoard(c,color){const fields=c.fen().split(' ');if(fields[1]!==color){fields[1]=color;fields[3]='-';}return new Chess(fields.join(' '));}
const dest=moves=>[...new Set(moves.map(m=>m.to))].sort();
function witness(c,target,reply,color,budget,initialBalance){
 budget.tick();c.move(reply);try{if(c.isGameOver())return null;const square=reply.from===target.square?reply.to:target.square,piece=c.get(square);if(piece?.type!==target.type||piece.color!==target.color)return null;
 for(const capture of c.moves({verbose:true}).filter(m=>m.captured&&m.to===square)){
  budget.tick();c.move(capture);try{if(c.isDraw())continue;let worstGain=balance(c,color)-initialBalance;const responses=[];if(worstGain<=0)continue;
   const terminalMate=c.isCheckmate(),counters=c.moves({verbose:true});let good=true;for(const counter of counters){budget.tick();c.move(counter);try{const gain=balance(c,color)-initialBalance;if(c.isGameOver()||gain<=0){good=false;break;}worstGain=Math.min(worstGain,gain);responses.push({move:uci(counter),gain});}finally{c.undo();}}
   if(good)return{reply:uci(reply),target:square,capture:uci(capture),terminalMate,worstGain,responses};
  }finally{c.undo();}
 }return null;}finally{c.undo();}
}
export function priority(e){return e.id==='trapped-piece'?159.5:e.id==='dominated-piece'?152:e.id==='mobility-reduction'?91:parentPriority(e);}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
export function explainMove(input){
 const limit=input.maxTrapNodes??50000;if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxTrapNodes must be an integer from 0 to 50000');const base=parent(input),before=board(input),after=board(input),played=after.move(input.move);if(after.isGameOver()||after.isCheck())return base;
 const color=played.color,enemy=after.turn(),old=before.isCheck()?null:opponentBoard(before,enemy),allReplies=after.moves({verbose:true}),initialBalance=balance(after,color),facts=[],proofs=[],budget={nodes:0,tick(){if(++this.nodes>limit)throw Error('trap-budget');}},targets=after.board().flat().filter(p=>p&&p.color===enemy&&names[p.type]);let status='complete';
 try{for(const p of targets){const target={square:p.square,type:p.type,color:p.color},targetMoves=allReplies.filter(m=>m.from===p.square),oldMoves=old?.moves({verbose:true}).filter(m=>m.from===p.square)||[],newDest=dest(targetMoves),oldDest=dest(oldMoves);
  if(oldDest.length-newDest.length>=2&&newDest.length<=2)facts.push({id:'mobility-reduction',text:`${names[p.type][0].toUpperCase()+names[p.type].slice(1)} mobility on ${p.square} falls from ${oldDest.length} to ${newDest.length} legal destinations.`,evidence:{target,beforeFen:old.fen(),afterFen:after.fen(),beforeMoves:oldMoves.map(uci),afterMoves:targetMoves.map(uci),beforeDestinations:oldDest,afterDestinations:newDest,hypotheticalBeforeTurn:enemy},qualityClaim:false});
  const cache=new Map(),get=m=>{const key=uci(m);if(!cache.has(key))cache.set(key,witness(after,target,m,color,budget,initialBalance));return cache.get(key);};
  const build=(replies,scope)=>{if(!replies.length)return null;const witnesses=[];for(const r of replies){const w=get(r);if(!w)return null;witnesses.push(w);}return{baselineFen:after.fen(),color,initialBalance,horizonPliesAfterMove:3,scope,minimumGain:Math.min(...witnesses.map(w=>w.worstGain)),witnesses};};
  const domination=build(targetMoves,'target-moves');if(domination)proofs.push({id:'dominated-piece',text:`${names[p.type][0].toUpperCase()+names[p.type].slice(1)} domination: every legal move by ${p.square} permits its capture with immediate material gain.`,evidence:{target,proof:domination},qualityClaim:false});
  const attackers=after.attackers(p.square,color);if(attackers.length){const trapped=build(allReplies,'all-replies');if(trapped)proofs.push({id:'trapped-piece',text:`Trapped ${names[p.type]} on ${p.square}: every legal reply permits its capture with immediate material gain.`,evidence:{target,attackers,proof:trapped},qualityClaim:false});}
 }}catch(e){if(e.message!=='trap-budget')throw e;status='exhausted';proofs.length=0;
  // Complete exact mobility facts even when the finite proof budget is exhausted.
  for(const p of targets){if(!old||facts.some(e=>e.evidence.target.square===p.square))continue;const a=allReplies.filter(m=>m.from===p.square),b=old.moves({verbose:true}).filter(m=>m.from===p.square),ad=dest(a),bd=dest(b);if(bd.length-ad.length>=2&&ad.length<=2)facts.push({id:'mobility-reduction',text:`${names[p.type][0].toUpperCase()+names[p.type].slice(1)} mobility on ${p.square} falls from ${bd.length} to ${ad.length} legal destinations.`,evidence:{target:{square:p.square,type:p.type,color:p.color},beforeFen:old.fen(),afterFen:after.fen(),beforeMoves:b.map(uci),afterMoves:a.map(uci),beforeDestinations:bd,afterDestinations:ad,hypotheticalBeforeTurn:enemy},qualityClaim:false});}
 }
 const events=[...base.events,...facts,...proofs],comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v14',events,comment,trapAnalysis:{maxTrapNodes:limit,nodes:budget.nodes,status}};
}

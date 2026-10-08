import {Chess} from '../../chess.js';
import {uci,VALUES} from './E020-concepts.mjs';
import {validateHistory} from './E024-transitions.mjs';
import {explainMove as parent,priority as parentPriority} from './E030-sacrifices.mjs';
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const victim=m=>m.flags.includes('e')?m.to[0]+m.from[1]:m.to;
const board=f=>{const c=new Chess(f.history?.fen||f.fen);if(f.history)for(const m of f.history.moves)c.move(m);return c;};
export function priority(e){return e.id==='intermediate-mate'?193:e.id==='intermediate-check'?159.4:e.id==='intermediate-capture'?159.3:parentPriority(e);}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
function certify(after,target,color,budget){
 const initialBalance=balance(after,color),baselineFen=after.fen(),witnesses=[];budget.tick();const replies=after.moves({verbose:true});if(!replies.length)return null;
 for(const reply of replies){budget.tick();after.move(reply);let witness=null;try{
  if(after.isGameOver())return null;const square=reply.from===target?reply.to:target,piece=after.get(square);if(!piece||piece.color===color)return null;
  for(const capture of after.moves({verbose:true}).filter(m=>m.captured&&victim(m)===square)){
   budget.tick();after.move(capture);try{
    if(after.isCheckmate()){witness={reply:uci(reply),target:{square,type:piece.type},recapture:uci(capture),terminalMate:true,worstGain:null,responses:[]};break;}
    if(after.isDraw())continue;budget.tick();const responses=[],counters=after.moves({verbose:true});let worstGain=Infinity,good=true;
    for(const counter of counters){budget.tick();after.move(counter);try{const gain=balance(after,color)-initialBalance;if(after.isGameOver()||gain<=0){good=false;break;}responses.push({move:uci(counter),gain});worstGain=Math.min(worstGain,gain);}finally{after.undo();}}
    if(good&&responses.length===counters.length){witness={reply:uci(reply),target:{square,type:piece.type},recapture:uci(capture),terminalMate:false,worstGain,responses};break;}
   }finally{after.undo();}
  }
 }finally{after.undo();}if(!witness)return null;witnesses.push(witness);
 }return{baselineFen,color,initialBalance,horizonPliesAfterMove:3,witnesses};
}
export function explainMove(input){
 const limit=input.maxIntermediateNodes??50000;if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxIntermediateNodes must be an integer from 0 to 50000');
 const base=parent(input),history=validateHistory(input),last=history?.records.at(-1)?.move;if(!last?.captured||last.promotion)return base;
 const before=board(input),directRecaptures=before.moves({verbose:true}).filter(m=>m.captured&&victim(m)===last.to).map(uci);if(!directRecaptures.length)return base;
 const after=board(input),played=after.move(input.move);if(played.captured&&victim(played)===last.to)return base;
 const context={history:{start:history.start,moves:history.moves},prior:{move:uci(last),piece:last.piece,captured:last.captured,square:last.to},directRecaptures,played:uci(played)},extra=[];let status='not-required',nodes=0;
 if(after.isCheckmate())extra.push({id:'intermediate-mate',text:'Intermediate mate: you deliver checkmate instead of recapturing.',evidence:{...context,afterFen:after.fen()},qualityClaim:false});
 else if(!after.isGameOver()&&(after.isCheck()||played.captured)){
  const budget={tick(){if(++nodes>limit)throw Error('intermediate-budget');}};status='refuted';try{const proof=certify(after,last.to,played.color,budget);if(proof){status='proved';const id=after.isCheck()?'intermediate-check':'intermediate-capture',name=after.isCheck()?'Intermediate check':'Intermediate capture';extra.push({id,text:`${name}: every legal reply still lets you recapture the ${last.piece==='p'?'pawn':last.piece==='n'?'knight':last.piece==='b'?'bishop':last.piece==='r'?'rook':'queen'}.`,evidence:{...context,proof},qualityClaim:false});}}catch(e){if(e.message!=='intermediate-budget')throw e;status='exhausted';}
 }
 if(!extra.length&&status==='not-required')return base;const events=[...base.events,...extra],comment=selectComment(events);return{...base,schema:'coach-concepts-v12',events,comment,intermediateAnalysis:{maxIntermediateNodes:limit,nodes,status}};
}

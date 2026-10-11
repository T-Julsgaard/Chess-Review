import {uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {tracedQuery} from '../../E144-causal-piece-coordination/code/query.mjs';
import {prepare,quiet} from './context.mjs';
const ordered=c=>c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const claim=c=>!c.isCheckmate()&&(c.isDrawByFiftyMoves()||c.isThreefoldRepetition());
const target=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
export function collectProofs(input,H,limit){
 const x=prepare(input);if(x.status!=='ready')throw Error('Context not ready');let nodes=0,claims=false;const tick=()=>{if(++nodes>limit)throw Error('order-resource-budget');},observe=c=>{claims=claim(c)||claims;};
 for(let n=0;n<x.setup;n++)tick();const c=x.c,actor=c.turn(),before=c.fen(),rootMoves=ordered(c).map(uci),branches=[];c.move(input.move);observe(c);const after=c.fen(),actualCheck=c.isCheck(),replies=ordered(c).map(uci);
 for(const reply of replies){tick();tick();c.move(reply);try{observe(c);const terminal=c.isGameOver(),b=terminal?null:ordered(c).find(m=>uci(m)===input.followup),valid=!!quiet(b),r={reply,fen:c.fen(),terminal,followup:valid?uci(b):null,post:null,query:null};if(valid){c.move(input.followup);try{observe(c);r.post=c.fen();r.query=tracedQuery(c,actor,H,tick);claims=r.query.searchClaim||claims;}finally{c.undo();}}branches.push(r);}finally{c.undo();}}
 function captures(frame){tick();observe(frame);const enemy=frame.turn(),legal=ordered(frame),baseline=balance(frame,enemy),out={fen:frame.fen(),enemy,legal:legal.map(uci),baseline,rows:[]};for(const m of legal.filter(m=>m.captured&&m.captured!=='k')){tick();tick();const square=target(m),victim=frame.get(square);frame.move(uci(m));try{observe(frame);const live=!frame.isGameOver(),gain=balance(frame,enemy)-baseline,replies=ordered(frame),rows=[];let positive=live&&gain>0,minimum=gain;for(const reply of replies){tick();frame.move(uci(reply));try{observe(frame);const g=balance(frame,enemy)-baseline,terminal=frame.isGameOver();rows.push({move:uci(reply),after:frame.fen(),gain:g,terminal,claim:claim(frame)});positive=positive&&!terminal&&g>0;minimum=Math.min(minimum,g);}finally{frame.undo();}}out.rows.push({move:uci(m),target:square,type:victim.type,after:frame.fen(),live,gain,replies:rows,minimumGain:minimum,positive});}finally{frame.undo();}}return out;}
 const actualCaptures=captures(c);c.undo();c.move(input.followup);observe(c);const reverseFen=c.fen(),reverse=tracedQuery(c,actor,H+2,tick);claims=reverse.searchClaim||claims;const reverseCaptures=captures(c);c.undo();tick();
 return{schema:'E188-order-resources-proof-v1',before,after,actor,history:structuredClone(input.history),plies:H,played:input.move,followup:input.followup,rootMoves,actualCheck,replies,branches,reverseFen,reverse,actualCaptures,reverseCaptures,claimContext:claims,nodes};
}

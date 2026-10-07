import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent,priority as prior} from '../../E055-intermediate-sacrifices/code/timed.mjs';
const code=m=>m.from+m.to+(m.promotion||''),names={n:'Knight',b:'Bishop',r:'Rook',q:'Queen',k:'King'};
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export const priority=e=>e.id==='pawn-blockade'?74:prior(e);
export function explainMove(input){
 const enabled=input.blockadeTags??false,limit=input.maxBlockadeNodes??50000;
 if(typeof enabled!=='boolean')throw Error('blockadeTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxBlockadeNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;
 let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('blockade-budget');};
 try{
  tick();const c=new Chess(input.history?.fen||input.fen);
  if(input.history)for(const m of input.history.moves){tick();c.move(m);}
  if(!c.isGameOver()){
   const beforeFen=c.fen(),played=record(c,input.move),unit=c.get(played.to);
   if(!c.isGameOver()&&names[unit.type]){
    tick();const square=played.to[0]+(+played.to[1]+(played.color==='w'?1:-1)),pawn=/^[a-h][2-7]$/.test(square)?c.get(square):null;
    if(pawn?.type==='p'&&pawn.color!==played.color){
     const replies=[];for(const m of c.moves({verbose:true})){tick();replies.push(record(new Chess(c.fen()),code(m)));}
     if(replies.some(r=>r.from===square&&r.to[0]===square[0]))throw Error('Pawn advances into occupied blockade square');
     extra.push({id:'pawn-blockade',qualityClaim:false,text:`${names[unit.type]} blockade: ${played.san} occupies ${played.to} directly ahead of pawn ${square}, preventing its straight advance.`,
      evidence:{beforeFen,afterFen:c.fen(),played,blocker:{square:played.to,...unit},pawn:{square,...pawn},replies,pawnCaptures:replies.filter(r=>r.from===square&&r.captured).map(r=>r.move).sort(),blockerCaptures:replies.filter(r=>r.to===played.to&&r.captured).map(r=>r.move).sort()}});
    }
   }
  }
 }catch(error){if(error.message!=='blockade-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v37',events,comment,blockadeAnalysis:{limit,nodes,status}};
}

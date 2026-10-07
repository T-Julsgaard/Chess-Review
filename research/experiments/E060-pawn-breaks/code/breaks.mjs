import {Chess} from '../../../../lib/chess.js';import {explainMove as parent,priority as prior} from '../../E059-pawn-restraint/code/restraint.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
const unit=(c,s,color)=>/^[a-h][2-7]$/.test(s)&&c.get(s)?.type==='p'&&c.get(s).color===color;
export const priority=e=>e.id==='pawn-break'?101.3:prior(e);
export function explainMove(input){const enabled=input.pawnBreakTags??false,limit=input.maxPawnBreakNodes??50000;if(typeof enabled!=='boolean')throw Error('pawnBreakTags must be boolean');if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxPawnBreakNodes must be an integer from 0 to 50000');const base=parent(input);if(!enabled)return base;
 let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('pawn-break-budget');};
 try{tick();const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves){tick();c.move(m);}if(!c.isGameOver()){const beforeFen=c.fen(),before=new Chess(beforeFen),played=record(c,input.move),d=played.color==='w'?1:-1,enemy=played.color==='w'?'b':'w',profiles=[];
  if(!c.isGameOver()&&played.piece==='p'&&!played.promotion){
   if(!played.captured&&played.from[0]===played.to[0])for(const file of [String.fromCharCode(played.to.charCodeAt(0)-1),String.fromCharCode(played.to.charCodeAt(0)+1)]){const target=file+(+played.to[1]+d),pawn=file+played.to[1];if(unit(before,target,enemy)&&unit(c,target,enemy)&&unit(before,pawn,played.color)&&unit(c,pawn,played.color))profiles.push({kind:'challenge',pawn,pawnBefore:pawn,blocker:target,capturedSquare:null,actor:played.to});}
   if(played.captured==='p'){const capturedSquare=before.get(played.to)?.type==='p'?played.to:played.to[0]+played.from[1],pawn=capturedSquare[0]+(+capturedSquare[1]-d),oldFront=played.from[0]+(+played.from[1]+d),newFront=played.to[0]+(+played.to[1]+d);
    if(unit(before,capturedSquare,enemy)&&unit(before,pawn,played.color)&&unit(c,pawn,played.color)&&!c.get(capturedSquare))profiles.push({kind:'release',pawn,pawnBefore:pawn,blocker:capturedSquare,capturedSquare,actor:pawn});
    if(unit(before,oldFront,enemy)&&!c.get(newFront))profiles.push({kind:'escape',pawn:played.to,pawnBefore:played.from,blocker:oldFront,capturedSquare,actor:played.to});
   }
   for(const p of profiles){tick();const responses=[];for(const m of c.moves({verbose:true})){tick();const child=new Chess(c.fen()),reply=record(child,code(m)),terminal=child.isGameOver(),pawnPresent=unit(child,p.pawn,played.color),blockerVacated=!unit(child,p.blocker,enemy),ownMoves=[];
     if(!terminal&&unit(child,p.actor,played.color))for(const own of child.moves({verbose:true})){tick();if(own.from!==p.actor)continue;if(p.kind==='challenge'?own.to===p.blocker&&own.captured==='p':own.to===p.pawn[0]+(+p.pawn[1]+d)&&!own.captured)ownMoves.push(record(new Chess(child.fen()),code(own)));}
     responses.push({reply,terminal,pawnPresent,blockerVacated,ownMoves});}
    if(responses.some(r=>r.terminal||!r.pawnPresent||(p.kind==='challenge'?!r.blockerVacated&&!r.ownMoves.length:!r.ownMoves.length)))continue;
    const text=p.kind==='challenge'?`Pawn break: ${played.san} challenges ${p.blocker}'s blockade of ${p.pawn}; every legal reply vacates ${p.blocker} or permits capturing its pawn next turn.`:p.kind==='release'?`Pawn break: ${played.san} removes ${p.blocker}'s blocker; pawn ${p.pawn} can advance straight after every legal reply.`:`Pawn break: ${played.san} escapes ${p.blocker}'s blockade; pawn ${p.pawn} can advance straight after every legal reply.`;
    extra.push({id:'pawn-break',qualityClaim:false,text,evidence:{beforeFen,afterFen:c.fen(),played,...p,pawnUnit:{type:'p',color:played.color},blockerUnit:{type:'p',color:enemy},responses}});
   }
  }
 }}catch(error){if(error.message!=='pawn-break-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v41',events,comment,pawnBreakAnalysis:{limit,nodes,status}};
}

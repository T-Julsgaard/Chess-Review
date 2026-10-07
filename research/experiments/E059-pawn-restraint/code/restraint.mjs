import {Chess} from '../../../../lib/chess.js';import {explainMove as parent,priority as prior} from '../../E058-wrong-bishop-rook-pawn/code/corner.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export const priority=e=>e.id==='self-blocking-pawn'?94.5:e.id==='fixed-pawn-next-turn'?101.4:prior(e);
export function explainMove(input){
 const enabled=input.pawnRestraintTags??false,limit=input.maxPawnRestraintNodes??50000;if(typeof enabled!=='boolean')throw Error('pawnRestraintTags must be boolean');if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxPawnRestraintNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('pawn-restraint-budget');};
 try{tick();const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves){tick();c.move(m);}
  if(!c.isGameOver()){const beforeFen=c.fen(),before=new Chess(beforeFen),played=record(c,input.move);
   if(!c.isGameOver()){
    const back=played.to[0]+(+played.to[1]+(played.color==='w'?-1:1)),front=played.to[0]+(+played.to[1]+(played.color==='w'?1:-1));
    const own=/^[a-h][2-7]$/.test(back)?c.get(back):null,enemy=/^[a-h][2-7]$/.test(front)?c.get(front):null;
    const profiles=[];
    if(own?.type==='p'&&own.color===played.color&&before.get(back)?.type==='p'&&before.get(back).color===played.color)profiles.push({id:'self-blocking-pawn',pawn:back,blocker:played.to});
    if(played.piece==='p'&&!played.promotion&&enemy?.type==='p'&&enemy.color!==played.color)profiles.push({id:'fixed-pawn-next-turn',pawn:played.to,blocker:front});
    for(const p of profiles){tick();const responses=[];
     for(const m of c.moves({verbose:true})){tick();const child=new Chess(c.fen()),reply=record(child,code(m)),terminal=child.isGameOver(),unit=child.get(p.pawn),blocker=child.get(p.blocker),pawnMoves=[];
      if(!terminal&&unit?.type==='p'&&unit.color===played.color)for(const ownMove of child.moves({verbose:true})){tick();if(ownMove.from===p.pawn)pawnMoves.push(record(new Chess(child.fen()),code(ownMove)));}
      responses.push({reply,terminal,pawnPresent:unit?.type==='p'&&unit.color===played.color,blockerPresent:!!blocker&&blocker.type===c.get(p.blocker).type&&blocker.color===c.get(p.blocker).color,pawnMoves});
     }
     if(p.id==='fixed-pawn-next-turn'&&responses.some(r=>r.terminal||!r.pawnPresent||!r.blockerPresent||r.pawnMoves.length))continue;
     const text=p.id==='self-blocking-pawn'?`Self-blocking pawns: ${played.san} occupies ${p.blocker} directly ahead of your pawn ${p.pawn}, blocking its straight advance.`:`Pawn fixation: ${played.san} locks pawn ${p.pawn} against ${p.blocker}; every legal reply leaves it without a legal move next turn.`;
     extra.push({id:p.id,qualityClaim:false,text,evidence:{beforeFen,afterFen:c.fen(),played,pawn:{square:p.pawn,...c.get(p.pawn)},blocker:{square:p.blocker,...c.get(p.blocker)},responses}});
    }
   }
  }
 }catch(error){if(error.message!=='pawn-restraint-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v40',events,comment,pawnRestraintAnalysis:{limit,nodes,status}};
}

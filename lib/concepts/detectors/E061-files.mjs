import {Chess} from '../../chess.js';import {explainMove as parent,priority as prior} from './E060-breaks.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
function pawns(c,file,tick){const out=[];for(let r=1;r<=8;r++){tick();const square=file+r,p=c.get(square);if(p?.type==='p')out.push({square,...p});}return out;}
function ray(c,square,d,tick){const squares=[];let blocker=null;for(let r=+square[1]+d;r>=1&&r<=8;r+=d){tick();const s=square[0]+r;squares.push(s);const p=c.get(s);if(p){blocker={square:s,...p};break;}}return{squares,blocker,edge:square[0]+(d===1?8:1)};}
export const priority=e=>e.id==='closed-file'?101.2:prior(e);
export function explainMove(input){const enabled=input.closedFileTags??false,limit=input.maxClosedFileNodes??50000;if(typeof enabled!=='boolean')throw Error('closedFileTags must be boolean');if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxClosedFileNodes must be an integer from 0 to 50000');const base=parent(input);if(!enabled)return base;let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('closed-file-budget');};
 try{tick();const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves){tick();c.move(m);}if(!c.isGameOver()){const beforeFen=c.fen(),played=record(c,input.move),type=played.promotion||played.piece;if(!c.isGameOver()&&['r','q'].includes(type)){const file=played.to[0],occupancy=pawns(c,file,tick);if(occupancy.some(p=>p.color==='w')&&occupancy.some(p=>p.color==='b')){const d=played.color==='w'?1:-1,forward=ray(c,played.to,d,tick),backward=ray(c,played.to,-d,tick),responses=[];
   for(const m of c.moves({verbose:true})){tick();const child=new Chess(c.fen()),reply=record(child,code(m)),terminal=child.isGameOver(),p=child.get(played.to),sliderPresent=p?.type===type&&p.color===played.color,fileMoves=[];
    if(!terminal&&sliderPresent)for(const own of child.moves({verbose:true})){tick();if(own.from===played.to&&own.to[0]===file)fileMoves.push(record(new Chess(child.fen()),code(own)));}
    responses.push({reply,terminal,sliderPresent,pawns:pawns(child,file,tick),fileMoves});
   }
   const b=forward.blocker,text=b?`Closed file: ${played.san} occupies ${file}-file with pawns of both colors; its forward ray stops at ${b.square}, occupied by ${b.color===played.color?'your':'their'} ${names[b.type]}.`:forward.squares.length?`Closed file: ${played.san} occupies ${file}-file with pawns of both colors; its forward ray reaches ${forward.edge} without a blocker.`:`Closed file: ${played.san} occupies ${file}-file with pawns of both colors; the forward ray has no further square.`;
   extra.push({id:'closed-file',qualityClaim:false,text,evidence:{beforeFen,afterFen:c.fen(),played,file,slider:{square:played.to,type,color:played.color},pawns:occupancy,forward,backward,responses}});
  }}}
 }catch(error){if(error.message!=='closed-file-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v42',events,comment,closedFileAnalysis:{limit,nodes,status}};
}

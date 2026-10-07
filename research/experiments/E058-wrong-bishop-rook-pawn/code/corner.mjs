import {Chess} from '../../../../lib/chess.js';import {explainMove as parent,priority as prior} from '../../E057-rook-checking-distance/code/checking.mjs';
const code=m=>m.from+m.to+(m.promotion||''),shade=s=>(s.charCodeAt(0)-97+Number(s[1])-1)%2;
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export const priority=e=>e.id==='wrong-rook-pawn-corner'?101.5:e.id==='wrong-colored-bishop'?100.5:prior(e);
export function explainMove(input){
 const enabled=input.wrongBishopTags??false,limit=input.maxWrongBishopNodes??50000;
 if(typeof enabled!=='boolean')throw Error('wrongBishopTags must be boolean');if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxWrongBishopNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('wrong-bishop-budget');};
 try{
  tick();const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves){tick();c.move(m);}
  if(!c.isGameOver()){
   const beforeFen=c.fen(),played=record(c,input.move);
   if(!c.isGameOver()){
    const board=c.board().flat().filter(Boolean);for(const p of board)tick();
    if(board.length===4){
     const bishop=board.find(p=>p.type==='b'),pawn=board.find(p=>p.type==='p');
     if(bishop&&pawn&&bishop.color===pawn.color&&['a','h'].includes(pawn.square[0])){
      const attacker=board.find(p=>p.type==='k'&&p.color===pawn.color),defender=board.find(p=>p.type==='k'&&p.color!==pawn.color),corner=pawn.square[0]+(pawn.color==='w'?'8':'1');
      if(shade(bishop.square)!==shade(corner)){
       const replies=[];for(const m of c.moves({verbose:true})){tick();replies.push(record(new Chess(c.fen()),code(m)));}
       const cornerMoves=replies.filter(r=>r.piece==='k'&&r.color===defender.color&&r.to===corner),occupied=defender.square===corner;
       const identity=p=>({square:p.square,type:p.type,color:p.color});
       const evidence={beforeFen,afterFen:c.fen(),played,material:board.map(p=>p.color+p.type+'@'+p.square).sort(),bishop:identity(bishop),pawn:identity(pawn),attackingKing:identity(attacker),defendingKing:identity(defender),promotionSquare:corner,bishopColor:shade(bishop.square),cornerColor:shade(corner),occupied,replies,cornerMoves,pawnCaptures:replies.filter(r=>r.to===pawn.square&&r.captured==='p').map(r=>r.move).sort(),bishopCaptures:replies.filter(r=>r.to===bishop.square&&r.captured==='b').map(r=>r.move).sort()};
       extra.push({id:'wrong-colored-bishop',qualityClaim:false,text:`Wrong-colored bishop: bishop ${bishop.square} cannot control ${corner}, the promotion square of pawn ${pawn.square}.`,evidence});
       if(occupied||cornerMoves.length){const line=occupied?`occupied by the defending king`:`${defender.color==='b'?'...':''}${cornerMoves[0].san} is legal now`;
        extra.push({id:'wrong-rook-pawn-corner',qualityClaim:false,text:`Wrong rook pawn: bishop ${bishop.square} cannot control ${corner}; ${line}.`,evidence});
       }
      }
     }
    }
   }
  }
 }catch(error){if(error.message!=='wrong-bishop-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v39',events,comment,wrongBishopAnalysis:{limit,nodes,status}};
}

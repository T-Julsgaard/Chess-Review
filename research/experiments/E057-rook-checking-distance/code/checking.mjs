import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent,priority as prior} from '../../E056-pawn-blockades/code/blockade.mjs';
const code=m=>m.from+m.to+(m.promotion||''),file=s=>s.charCodeAt(0),rank=s=>+s[1];
function record(c,uci){const before=c.fen(),m=c.move(uci);return{move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before,after:c.fen()};}
export const priority=e=>e.id==='rook-checking-distance'?76.5:e.id==='side-rook-check'?76.4:e.id==='rear-rook-check'?76.3:prior(e);
export function explainMove(input){
 const enabled=input.rookCheckTags??false,limit=input.maxRookCheckNodes??50000;
 if(typeof enabled!=='boolean')throw Error('rookCheckTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxRookCheckNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;
 let nodes=0,status='complete';const extra=[],tick=()=>{if(++nodes>limit)throw Error('rook-check-budget');};
 try{
  tick();const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves){tick();c.move(m);}
  if(!c.isGameOver()){
   const beforeFen=c.fen(),played=record(c,input.move);
   if(played.piece==='r'&&c.isCheck()&&!c.isGameOver()){
    const board=c.board().flat().filter(Boolean);for(const p of board)tick();
    if(board.every(p=>'krp'.includes(p.type))&&board.filter(p=>p.type==='r'&&p.color===played.color).length===1&&board.filter(p=>p.type==='r'&&p.color!==played.color).length===1){
     const king=board.find(p=>p.type==='k'&&p.color!==played.color),enemyRook=board.find(p=>p.type==='r'&&p.color!==played.color),dir=king.color==='w'?1:-1;
     const rear=file(played.to)===file(king.square)&&dir*(rank(played.to)-rank(king.square))<0,side=rank(played.to)===rank(king.square);
     if(rear||side){
      const dx=Math.sign(file(king.square)-file(played.to)),dy=Math.sign(rank(king.square)-rank(played.to)),ray=[];let x=file(played.to)+dx,y=rank(played.to)+dy;
      while(x!==file(king.square)||y!==rank(king.square)){tick();ray.push(String.fromCharCode(x)+y);x+=dx;y+=dy;}
      if(ray.every(s=>!c.get(s))){
       const pawns=[];for(const p of board.filter(p=>p.type==='p'&&p.color===king.color)){tick();
        const rr=p.color==='w'?rank(p.square):9-rank(p.square);
        if(rr>=5&&rr<=7&&file(p.square)===file(king.square)&&dir*(rank(p.square)-rank(king.square))>0&&!board.some(q=>q.type==='p'&&q.color===played.color&&Math.abs(file(q.square)-file(p.square))<=1&&dir*(rank(q.square)-rank(p.square))>0))pawns.push({square:p.square,type:p.type,color:p.color});
       }
       pawns.sort((a,b)=>a.square.localeCompare(b.square));
       if(pawns.length){
        const replies=[];for(const m of c.moves({verbose:true})){tick();replies.push(record(new Chess(c.fen()),code(m)));}
        const captures=replies.filter(r=>r.to===played.to&&r.captured==='r').map(r=>r.move).sort();
        const evidence={beforeFen,afterFen:c.fen(),played,checker:{square:played.to,type:'r',color:played.color},king:{square:king.square,type:'k',color:king.color},enemyRook:{square:enemyRook.square,type:'r',color:enemyRook.color},pawns,selectedPawn:pawns[0].square,ray,clearSquares:ray.length,direction:rear?'rear':'side',replies,checkerCaptures:captures};
        const id=rear?'rear-rook-check':'side-rook-check',label=rear?'Rook check from behind':'Rook check from the side',line=rear?`along the ${played.to[0]}-file, behind pawn ${pawns[0].square}`:`along rank ${played.to[1]}, beside pawn ${pawns[0].square}`;
        extra.push({id,qualityClaim:false,text:`${label}: ${played.san} checks king ${king.square} ${line}.`,evidence});
        if(ray.length>=3&&!captures.length)extra.push({id:'rook-checking-distance',qualityClaim:false,text:`Checking distance: ${played.san} leaves ${ray.length} clear squares between rook and king; no immediate legal reply captures the rook.`,evidence});
       }
      }
     }
    }
   }
  }
 }catch(error){if(error.message!=='rook-check-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v38',events,comment,rookCheckAnalysis:{limit,nodes,status}};
}

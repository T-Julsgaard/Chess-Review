import {Chess} from '../../chess.js';
import {uci,VALUES} from './E020-concepts.mjs';
import {explainMove as parent,priority as prior} from './E052-desperado.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const row=m=>({move:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured||null,promotion:m.promotion||null,before:m.before,after:m.after});
const units=(c,squares)=>squares.sort().map(square=>({square,...c.get(square)}));
const king=(c,color)=>c.board().flat().find(p=>p?.color===color&&p.type==='k');
const material=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+(p.color===color?1:-1)*VALUES[p.type],0);
const terminal=c=>c.isCheckmate()?'mate':c.isDraw()?'draw':'live';
function ray(a,b,type){const dx=b.charCodeAt(0)-a.charCodeAt(0),dy=+b[1]- +a[1];if(!(dx||dy)||!(type==='r'?(!dx||!dy):type==='b'?(dx&&Math.abs(dx)===Math.abs(dy)):type==='q'&&(!dx||!dy||Math.abs(dx)===Math.abs(dy))))return null;return Array.from({length:Math.max(Math.abs(dx),Math.abs(dy))-1},(_,i)=>String.fromCharCode(a.charCodeAt(0)+Math.sign(dx)*(i+1))+(+a[1]+Math.sign(dy)*(i+1)));}
export const crossIds=new Set(['cross-check']);
export const priority=e=>crossIds.has(e.id)?158.7:prior(e);
export function explainMove(input){
 const enabled=input.crossCheckTags??false,limit=input.maxCrossCheckNodes??50000;
 if(typeof enabled!=='boolean')throw Error('crossCheckTags must be boolean');
 if(!Number.isInteger(limit)||limit<0||limit>50000)throw Error('maxCrossCheckNodes must be an integer from 0 to 50000');
 const base=parent(input);if(!enabled)return base;
 const before=new Chess(input.history?.fen||input.fen),c=new Chess(input.history?.fen||input.fen);
 if(input.history)for(const m of input.history.moves){before.move(m);c.move(m);}
 const played=c.move(input.move),color=played.color,enemy=c.turn(),ownBefore=king(before,color),ownAfter=king(c,color),enemyKing=king(c,enemy),initialBalance=material(before,color);
 let nodes=0,status='complete';const tick=()=>{if(++nodes>limit)throw Error('cross-check-budget');};const extra=[];
 try{
  tick();if(before.isCheck()&&c.isCheck()&&(!c.isDraw()||c.isCheckmate())&&!c.attackers(ownAfter.square,enemy).length){
   const beforeCheckers=units(before,before.attackers(ownBefore.square,enemy)),afterCheckers=units(c,c.attackers(enemyKing.square,color));
   const rays=beforeCheckers.filter(p=>'brq'.includes(p.type)).map(p=>({checker:p,between:ray(p.square,ownBefore.square,p.type)}));
   if(rays.some(r=>!r.between||r.between.some(s=>before.get(s))))throw Error('Invalid checking ray');
   const blocked=rays.filter(r=>r.between.includes(played.to)).map(r=>r.checker.square);
   const capturedSquare=played.captured?(played.flags.includes('e')?played.to[0]+(color==='w'?'5':'4'):played.to):null;
   const capturedChecker=beforeCheckers.find(p=>p.square===capturedSquare);
   const mechanism=blocked.length?{kind:'block',checkers:blocked}:capturedChecker?{kind:'capture',checker:capturedChecker.square,capturedSquare}:played.piece==='k'?{kind:'king-discovery'}:null;
   if(mechanism){
    const direct=afterCheckers.filter(p=>p.square===played.to).map(p=>p.square),discovered=afterCheckers.filter(p=>p.square!==played.to).map(p=>p.square),evasions=[];
    for(const evasion of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){
     tick();c.move(uci(evasion));try{
      if(c.attackers(king(c,enemy).square,color).length)throw Error('Illegal check evasion');
      evasions.push({...row(evasion),gain:material(c,color)-initialBalance,terminal:terminal(c)});
     }finally{c.undo();}
    }
    const action=mechanism.kind==='block'?'blocks their check':mechanism.kind==='capture'?`captures the checking ${names[capturedChecker.type]}`:'escapes check';
    extra.push({id:'cross-check',qualityClaim:false,text:`Cross-check: ${played.san} ${action} and gives check back.`,evidence:{before:before.fen(),after:c.fen(),played:row(played),color,ownBefore,ownAfter,enemyKing,beforeCheckers,afterCheckers,rays,mechanism,direct,discovered,initialBalance,terminal:terminal(c),evasions}});
   }
  }
 }catch(error){if(error.message!=='cross-check-budget')throw error;extra.length=0;status='exhausted';}
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v34',events,comment,crossCheckAnalysis:{limit,nodes,status}};
}

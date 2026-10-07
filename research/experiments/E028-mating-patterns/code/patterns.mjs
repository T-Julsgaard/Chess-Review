import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent,priority as inheritedPriority} from '../../E027-defensive-resources/code/defense.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const xy=s=>[s.charCodeAt(0)-97,+s[1]-1],square=([x,y])=>x>=0&&x<8&&y>=0&&y<8?String.fromCharCode(97+x)+(y+1):null;
const at=(s,v)=>square(xy(s).map((n,i)=>n+v[i])),plus=(a,b)=>a.map((n,i)=>n+b[i]);
const distance=(a,b)=>Math.max(...xy(a).map((n,i)=>Math.abs(n-xy(b)[i])));
const all=c=>c.board().flat().filter(Boolean),own=(c,color,s)=>s&&c.get(s)?.color===color;
const neighbors=s=>[-1,0,1].flatMap(x=>[-1,0,1].filter(y=>x||y).map(y=>at(s,[x,y]))).filter(Boolean);
function frames(s){const [x,y]=xy(s),ns=[];if(x===0)ns.push([1,0]);if(x===7)ns.push([-1,0]);if(y===0)ns.push([0,1]);if(y===7)ns.push([0,-1]);return ns.flatMap(normal=>[1,-1].map(sign=>({normal,tangent:[-normal[1]*sign,normal[0]*sign]})));}
function roles(c,flight,king,checker,helper,color){
 const support=distance(checker.square,king)===1&&c.attackers(checker.square,color).includes(helper.square);
 const flights=neighbors(king).filter(s=>!c.get(s)&&flight.attackers(s,color).includes(helper.square)&&!flight.attackers(s,color).includes(checker.square));
 return{support,flights};
}
const named=new Set(['arabian-mate','anastasia-mate','boden-mate','epaulette-mate','dovetail-mate','swallow-tail-mate','opera-mate','morphy-mate','ladder-mate']);
export function priority(e){return named.has(e.id)?196:e.id==='double-check-mate'?194:['discovered-mate','underpromotion-mate'].includes(e.id)?193:e.id==='promotion-mate'?192:e.id.startsWith('mate-pair-')||e.id==='pawn-supported-mate'?191:e.id==='mate-in-one'?179:inheritedPriority(e);}
export function selectComment(events){return[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
export function mateEvents(before,after,move){
 if(!after.isCheckmate())return[];const color=move.color,enemy=color==='w'?'b':'w',king=all(after).find(p=>p.type==='k'&&p.color===enemy).square,checkers=after.attackers(king,color),pieces=all(after).filter(p=>p.color===color&&p.type!=='k'),flight=new Chess(after.fen());flight.remove(king);
 const events=[],seen=new Set(),add=(id,text,evidence={})=>{if(seen.has(id))return;seen.add(id);events.push({id,text,evidence:{after:after.fen(),king,color,checkers,...evidence},qualityClaim:false});};
 add('mate-in-one','You found mate in one; the opponent has no legal reply.',{move:uci(move)});
 if(move.promotion){add('promotion-mate',`Promotion mate: ${move.to} becomes a ${names[move.promotion]} and checkmates the king.`,{promotion:move.promotion,move:uci(move)});if(move.promotion!=='q')add('underpromotion-mate',`Underpromotion mate: promoting to ${names[move.promotion]} on ${move.to} delivers checkmate.`,{promotion:move.promotion,move:uci(move)});}
 const stationary=checkers.filter(s=>s!==move.to&&before.get(s)?.type===after.get(s)?.type&&before.get(s)?.color===color&&!before.attackers(king,color).includes(s));
 if(stationary.length)add('discovered-mate',`Discovered mate: ${move.from}–${move.to} opens ${stationary[0]}’s checking line, leaving no legal defense.`,{stationary,move:uci(move)});
 if(checkers.length>=2)add('double-check-mate',`Double-check mate: ${checkers[0]} and ${checkers[1]} both check; the king has no legal escape.`,{});
 for(const checker of pieces.filter(p=>checkers.includes(p.square))){
  for(const helper of pieces.filter(p=>p.square!==checker.square)){
   const role=roles(after,flight,king,checker,helper,color),e={checker,helper,...role},key=[checker.type,helper.type].sort().join(''),pair={qr:'Queen-and-rook',nq:'Queen-and-knight',bq:'Queen-and-bishop',br:'Bishop-and-rook',nr:'Rook-and-knight',bb:'Double-bishop'}[key];
   if(pair&&(role.support||role.flights.length)&&(key!=='bb'||(xy(checker.square).reduce((a,b)=>a+b,0)%2!==xy(helper.square).reduce((a,b)=>a+b,0)%2)))add(`mate-pair-${key}`,`${pair} mate: ${names[helper.type]} ${helper.square} ${role.support?`protects checking ${checker.square}`:`seals escape square ${role.flights[0]}`}.`,e);
   if(helper.type==='p'&&role.support)add('pawn-supported-mate',`Pawn-supported mate: pawn ${helper.square} protects the checking ${names[checker.type]} on ${checker.square}.`,e);
   if(checkers.length!==1)continue;
   const corner=frames(king).length===4;
   if(corner&&checker.type==='r'&&helper.type==='n'&&role.support&&role.flights.length)add('arabian-mate',`Arabian mate: knight ${helper.square} protects rook ${checker.square} and seals ${role.flights[0]}.`,e);
   if(checker.type==='q'&&role.support){
    const delta=xy(checker.square).map((n,i)=>n-xy(king)[i]),diagonal=Math.abs(delta[0])===1&&Math.abs(delta[1])===1,straight=Math.abs(delta[0])+Math.abs(delta[1])===1;
    const uncovered=neighbors(king).filter(s=>s!==checker.square&&!flight.attackers(s,color).includes(checker.square));
    if(uncovered.length===2&&uncovered.every(s=>own(after,enemy,s))){const id=diagonal?'dovetail-mate':straight?'swallow-tail-mate':null;if(id)add(id,`${diagonal?'Dovetail':'Swallow’s-tail'} mate: protected queen ${checker.square} checks; ${uncovered.join(' and ')} block the king’s remaining exits.`,{...e,blockers:uncovered});}
   }
   for(const frame of frames(king)){
    const n=frame.normal,t=frame.tangent,inward=at(king,n),diagonals=[at(king,plus(n,t)),at(king,plus(n,t.map(v=>-v)))],shoulders=[at(king,t),at(king,t.map(v=>-v))],sideBlocks=[at(king,t),at(king,plus(t,n))],delta=xy(checker.square).map((v,i)=>v-xy(king)[i]);
    if(!corner&&['r','q'].includes(checker.type)&&helper.type==='n'&&delta[0]*n[0]+delta[1]*n[1]===0&&own(after,enemy,inward)&&diagonals.every(s=>s&&!after.get(s)&&flight.attackers(s,color).includes(helper.square)))add('anastasia-mate',`Anastasia’s mate: ${names[checker.type]} ${checker.square} checks; knight ${helper.square} seals ${diagonals.join(' and ')} while ${inward} blocks escape.`,{...e,frame,blockers:[inward],flights:diagonals});
    if(!corner&&checker.type==='b'&&helper.type==='b'&&xy(checker.square).reduce((a,b)=>a+b,0)%2!==xy(helper.square).reduce((a,b)=>a+b,0)%2&&role.flights.length>=2&&sideBlocks.every(s=>own(after,enemy,s)))add('boden-mate',`Boden’s mate: bishops ${checker.square} and ${helper.square} cross their diagonals; ${sideBlocks.join(' and ')} block escape.`,{...e,frame,blockers:sideBlocks});
    if(checker.type==='r'&&helper.type==='b'&&role.support&&delta.every((v,i)=>v===-t[i])&&inward&&!after.get(inward)&&flight.attackers(inward,color).includes(helper.square)&&sideBlocks.every(s=>own(after,enemy,s)))add('opera-mate',`Opera mate: bishop ${helper.square} supports rook ${checker.square} and seals ${inward}; ${sideBlocks.join(' and ')} block escape.`,{...e,frame,blockers:sideBlocks,flights:[inward]});
    if(checker.type==='r'&&helper.type==='r'&&delta[0]*n[0]+delta[1]*n[1]===0){const helperDelta=xy(helper.square).map((v,i)=>v-xy(king)[i]),squares=[at(king,plus(n,t)),inward,at(king,plus(n,t.map(v=>-v)))].filter(s=>s&&!after.get(s));if(helperDelta[0]*n[0]+helperDelta[1]*n[1]===1&&squares.length&&squares.every(s=>flight.attackers(s,color).includes(helper.square)))add('ladder-mate',`Ladder mate: rook ${checker.square} checks while rook ${helper.square} seals the adjacent escape ${n[0]?'file':'rank'}.`,{...e,frame,flights:squares});}
   }
   if(corner&&checker.type==='b'&&helper.type==='r'){
    const orthogonal=neighbors(king).filter(s=>xy(s).filter((n,i)=>n!==xy(king)[i]).length===1),sealed=orthogonal.find(s=>!after.get(s)&&flight.attackers(s,color).includes(helper.square)&&!flight.attackers(s,color).includes(checker.square)),blocked=orthogonal.find(s=>own(after,enemy,s));
    if(sealed&&blocked)add('morphy-mate',`Morphy’s mate: bishop ${checker.square} checks; rook ${helper.square} seals ${sealed}, and ${blocked} blocks escape.`,{...e,flights:[sealed],blockers:[blocked]});
   }
  }
  if(checkers.length===1&&checker.type==='q')for(const frame of frames(king)){
   const shoulders=[at(king,frame.tangent),at(king,frame.tangent.map(v=>-v))];if(at(king,frame.normal.map(v=>v*2))===checker.square&&shoulders.every(s=>own(after,enemy,s)))add('epaulette-mate',`Epaulette mate: queen ${checker.square} checks while ${shoulders.join(' and ')} block the king’s shoulders.`,{checker,frame,blockers:shoulders});
  }
 }
 return events;
}
export function explainMove(input){const base=parent(input),before=legalPosition(input.fen),after=legalPosition(input.fen),move=after.move(input.move),events=[...base.events,...mateEvents(before,after,move)],comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v9',events,comment};}

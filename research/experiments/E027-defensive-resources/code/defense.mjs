import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent} from '../../E026-pin-proofs/code/proofs.mjs';
import {priority as inheritedPriority} from '../../E025-pawn-formations/code/selection.mjs';
import {segment} from '../../E021-structural-concepts/code/features.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'},other=c=>c==='w'?'b':'w';
const all=c=>c.board().flat().filter(Boolean),victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
const balance=(c,color)=>all(c).reduce((n,p)=>n+(p.color===color?1:-1)*VALUES[p.type],0);
const king=(c,color)=>all(c).find(p=>p.type==='k'&&p.color===color).square;
export function turnBoard(c,color){const f=c.fen().split(' ');if(f[1]!==color){f[1]=color;f[3]='-';}return new Chess(f.join(' '));}
export function priority(e){return({'relative-pin':156,'cross-pin':157,'certified-removal':156,'saving-piece':153,'defending-piece':153,'defensive-pawn-move':154,'eliminating-attacker':154,'active-defense':154,'luft':155,'line-interposition':128,'king-escape':128,'blocking-file':90,'blocking-diagonal':90,'closing-line':89,'escape-square':88}[e.id]??inheritedPriority(e));}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
function oldProof(c,capture,color,budget){
 const baselineFen=c.fen(),initialBalance=balance(c,color);budget.tick();c.move(capture);try{
  if(c.isDraw())return null;let minimumGain=balance(c,color)-initialBalance;const responses=[];
  for(const reply of c.moves({verbose:true})){budget.tick();c.move(reply);try{const gain=balance(c,color)-initialBalance;if(c.isCheckmate()||c.isDraw()||gain<=0)return null;minimumGain=Math.min(minimumGain,gain);responses.push({reply:uci(reply),gain});}finally{c.undo();}}
  return minimumGain>0?{baselineFen,initialBalance,capture:uci(capture),minimumGain,responses}:null;
 }finally{c.undo();}
}
function newProof(c,target,color,budget){
 const baselineFen=c.fen(),initialBalance=balance(c,color),captures=c.moves({verbose:true}).filter(m=>m.captured&&victim(m)===target),witnesses=[];
 for(const capture of captures){budget.tick();c.move(capture);try{
  if(c.isGameOver())return null;let found=null;
  for(const reply of c.moves({verbose:true})){budget.tick();c.move(reply);try{const gain=balance(c,color)-initialBalance;if(gain<=0){found={capture:uci(capture),reply:uci(reply),gain};break;}}finally{c.undo();}}
  if(!found)return null;witnesses.push(found);
 }finally{c.undo();}}
 return{baselineFen,initialBalance,target,witnesses};
}
function mateScan(c,color,budget){const mates=[];if(c.isGameOver())return mates;for(const move of c.moves({verbose:true})){budget.tick();c.move(move);try{if(c.isCheckmate())mates.push({move:uci(move),piece:move.piece,to:move.to,king:king(c,other(color)),checking:c.attackers(king(c,other(color)),color),after:c.fen()});}finally{c.undo();}}return mates;}
function steps(c,color){return turnBoard(c,color).moves({verbose:true}).filter(m=>m.piece==='k'&&!m.captured).map(m=>m.to).sort();}
export function explainMove(input){
 if(input.maxDefenseNodes!==undefined&&(!Number.isInteger(input.maxDefenseNodes)||input.maxDefenseNodes<0||input.maxDefenseNodes>50000))throw Error('maxDefenseNodes must be an integer from 0 to 50000');
 const base=parent(input),before=legalPosition(input.fen),after=input.history?new Chess(input.history.fen):legalPosition(input.fen);if(input.history)for(const code of input.history.moves)after.move(code);
 const move=after.move(input.move),color=move.color,enemy=other(color),events=[...base.events],finite=[],budget={nodes:0,limit:input.maxDefenseNodes??50000,tick(){if(++this.nodes>this.limit)throw Error('defense-budget');}};
 const add=(list,id,text,evidence)=>list.push({id,text,evidence,qualityClaim:false});
 if(before.isCheck()&&move.piece==='k')add(events,'king-escape',`King escape: ${move.from}–${move.to} gets your king out of check.`,{from:move.from,to:move.to});
 for(const target of all(before).filter(p=>p.color===color&&p.square!==move.from)){
  if(after.get(target.square)?.color!==color)continue;
  for(const attacker of before.attackers(target.square,enemy)){
   const p=before.get(attacker),line=segment(attacker,target.square);if(!['b','r','q'].includes(p.type)||!line?.includes(move.to)||after.attackers(target.square,enemy).includes(attacker)||after.get(attacker)?.type!==p.type)continue;
   const evidence={attacker,attackerType:p.type,target,blocker:move.to,line};
   if(target.type==='k'&&before.isCheck())add(events,'line-interposition',`Interposition: ${names[move.piece]} ${move.to} blocks ${attacker}’s checking line to your king ${target.square}.`,evidence);
   const file=attacker[0]===target.square[0],diagonal=attacker[0]!==target.square[0]&&attacker[1]!==target.square[1];
   if(file||diagonal)add(events,file?'blocking-file':'blocking-diagonal',`Blocking ${file?'file':'diagonal'}: ${move.to} interrupts ${attacker}’s line to your ${names[target.type]} ${target.square}.`,evidence);
   add(events,'closing-line',`Closing an attack line: ${move.to} blocks ${attacker}’s direct attack on your ${names[target.type]} ${target.square}.`,evidence);
  }
 }
 try{if(!before.isCheck()&&!after.isGameOver()){
  const old=turnBoard(before,enemy),done=new Set();
  for(const capture of old.moves({verbose:true}).filter(m=>m.captured&&['n','b','r','q'].includes(m.captured))){
   const original=victim(capture);if(done.has(original))continue;const threat=oldProof(old,capture,enemy,budget);if(!threat)continue;
   const target=original===move.from?move.to:original;if(after.get(target)?.type!==capture.captured||after.get(target)?.color!==color)continue;
   const defense=newProof(after,target,enemy,budget);if(!defense)continue;done.add(original);
   const evidence={piece:capture.captured,original,target,hypotheticalOpponentTurn:true,threat,defense},moved=original===move.from;
   const text=`You ${moved?'save':'defend'} ${names[capture.captured]} ${target} against immediate capture loss; every capture allows a reply without net material loss.`;
   add(finite,moved?'saving-piece':'defending-piece',text,evidence);
   if(move.piece==='p')add(finite,'defensive-pawn-move',`Defensive pawn move: ${move.from}–${move.to} protects ${names[capture.captured]} ${target} against immediate net capture loss.`,evidence);
   if(move.captured&&victim(move)===capture.from)add(finite,'eliminating-attacker',`You eliminate ${capture.from}, which threatened immediate material gain by capturing your ${names[capture.captured]} ${original}.`,evidence);
   if(move.captured||after.isCheck())add(finite,'active-defense',`Active defense: ${move.captured?'a capture':'check'} meets the immediate material-loss threat to your ${names[capture.captured]} ${target}.`,evidence);
  }
  if(move.piece==='p'&&!move.captured&&!after.isCheck()&&king(before,color)===king(after,color)&&+king(after,color)[1]===(color==='w'?1:8)){
   const oldSteps=steps(before,color),newSteps=steps(after,color);if(newSteps.includes(move.from)&&!oldSteps.includes(move.from)){
    const evidence={king:king(after,color),square:move.from,pawnMove:uci(move),oldSteps,newSteps};add(finite,'escape-square',`New escape square: your king ${evidence.king} can now legally step to ${move.from}.`,evidence);
    const oldMates=mateScan(old,enemy,budget),newMates=mateScan(after,enemy,budget),rank=color==='w'?'1':'8',backRank=oldMates.filter(m=>['r','q'].includes(m.piece)&&m.to[1]===rank&&m.king[1]===rank&&m.checking.includes(m.to)&&m.to[1]===m.king[1]);
    if(backRank.length&&!newMates.length)add(finite,'luft',`Luft: ${move.from}–${move.to} creates escape square ${move.from} and removes the opponent’s immediate back-rank mate.`,{...evidence,beforeOpponentFen:old.fen(),oldMates,newMates,backRank});
   }
  }
 }}catch(error){if(error.message!=='defense-budget')throw error;finite.length=0;}
 events.push(...finite);const comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v8',events,comment,defenseBudget:{nodes:budget.nodes,limit:budget.limit,exhausted:budget.nodes>budget.limit}};
}

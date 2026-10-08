import {legalPosition,uci,VALUES} from './E020-concepts.mjs';
import {Chess} from '../../chess.js';
import {explainMove as parent} from './E025-formations.mjs';
import {priority} from './E025-selection.mjs';
import {xRays} from './E023-tactics.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+(p.color===color?1:-1)*(VALUES[p.type]||0),0);
const key=m=>typeof m==='string'?m:uci(m);
const identity=(c,p)=>c.get(p.square)?.type===p.type&&c.get(p.square)?.color===p.color;
const same=(a,b,move)=> (a.slider===b.slider||a.slider===move.from&&b.slider===move.to)&&a.blocker.square===b.blocker.square&&a.target.square===b.target.square;
const pinRays=(c,color)=>xRays(c,color).filter(r=>r.blocker.color!==color&&r.target.color!==color&&r.target.type==='q'&&VALUES[r.blocker.type]<VALUES.q);
export function offLineMoves(c,ray){const line=new Set([ray.slider,...ray.line,ray.target.square]);return c.moves({verbose:true}).filter(m=>m.from===ray.blocker.square&&!line.has(m.to));}
function certify(c,replies,attackers,target,color,budget){
 const baselineFen=c.fen(),initialBalance=balance(c,color),witnesses=[];if(!replies.length||c.isGameOver())return null;
 const tick=()=>{if(++budget.nodes>budget.limit)throw Error('proof-budget');};
 for(const reply of replies){tick();c.move(reply);try{
  if(c.isGameOver()||!identity(c,target))return null;
  const captures=c.moves({verbose:true}).filter(m=>m.to===target.square&&m.captured&&attackers.some(a=>a.square===m.from&&identity(c,a)));let best=null;
  for(const capture of captures){tick();c.move(capture);try{
   if(c.isDraw())continue;const responses=[];let worstGain=balance(c,color)-initialBalance,valid=true;
   for(const response of c.moves({verbose:true})){tick();c.move(response);try{const gain=balance(c,color)-initialBalance;responses.push({reply:key(response),gain});worstGain=Math.min(worstGain,gain);if(c.isCheckmate()||c.isDraw()||gain<=0)valid=false;}finally{c.undo();}}
   if(valid&&worstGain>0&&(!best||worstGain>best.worstGain))best={reply:key(reply),capture:key(capture),target:target.square,worstGain,responses};
  }finally{c.undo();}}
  if(!best)return null;witnesses.push(best);
 }finally{c.undo();}}
 return{baseline:'afterMove',baselineFen,initialBalance,horizonPliesAfterMove:3,minimumGain:Math.min(...witnesses.map(w=>w.worstGain)),witnesses};
}
export function explainMove(input){
 if(input.maxProofNodes!==undefined&&(!Number.isInteger(input.maxProofNodes)||input.maxProofNodes<0||input.maxProofNodes>50000))throw Error('maxProofNodes must be an integer from 0 to 50000');
 const base=parent(input),before=legalPosition(input.fen),after=input.history?new Chess(input.history.fen):legalPosition(input.fen);if(input.history)for(const code of input.history.moves)after.move(code);
 const move=after.move(input.move),color=move.color,budget={nodes:0,limit:input.maxProofNodes??50000},extra=[];
 const add=(id,text,evidence)=>extra.push({id,text,evidence,qualityClaim:false});
 try{
  const old=pinRays(before,color),oldAbsolute=xRays(before,color).filter(r=>r.blocker.color!==color&&r.target.color!==color&&r.target.type==='k'),absolute=xRays(after,color).filter(r=>r.blocker.color!==color&&r.target.color!==color&&r.target.type==='k');
  for(const ray of pinRays(after,color)){
   const cross=absolute.find(a=>a.blocker.square===ray.blocker.square&&a.slider!==ray.slider),newPin=!old.some(o=>same(o,ray,move)),newCross=cross&&!old.some(o=>same(o,ray,move)&&oldAbsolute.some(a=>same(a,cross,move)));
   if(!newPin&&!newCross)continue;
   const proof=certify(after,offLineMoves(after,ray),[{square:ray.slider,type:ray.sliderType,color}],ray.target,color,budget);if(!proof)continue;
   const evidence={...ray,proof};
   if(newPin)add('relative-pin',`Relative pin: moving ${names[ray.blocker.type]} ${ray.blocker.square} off the line lets ${ray.slider} capture queen ${ray.target.square} with immediate material gain.`,evidence);
   if(newCross)add('cross-pin',`Cross-pin on ${ray.blocker.square} to king ${cross.target.square} and queen ${ray.target.square}. Legal moves off the queen’s line allow immediate material gain.`,{...evidence,absolute:cross});
  }
  for(const event of base.events.filter(e=>e.id==='removal-defender')){
   const target=event.evidence.target;if(!target||target.type==='k')continue;
   const attackers=after.board().flat().filter(p=>p&&p.color===color&&after.attackers(target.square,color).includes(p.square));
   const proof=certify(after,after.moves({verbose:true}),attackers,target,color,budget);if(proof)add('certified-removal',`You remove a defender of ${names[target.type]} ${target.square}; every reply permits its capture with immediate net material gain.`,{...event.evidence,attackers,proof});
  }
 }catch(error){if(error.message!=='proof-budget')throw error;extra.length=0;}
 const events=[...base.events,...extra],rank=e=>({'relative-pin':121,'cross-pin':123,'certified-removal':148}[e.id]??priority(e));
 const comment=[...events].sort((a,b)=>rank(b)-rank(a))[0]?.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v7',events,comment,proofBudget:{nodes:budget.nodes,limit:budget.limit,exhausted:budget.nodes>budget.limit}};
}

import {Chess} from '../../chess.js';
import {VALUES,legalPosition,uci} from './E020-concepts.mjs';
import {explainMove as parent} from './E022-tactics.mjs';
import {segment} from './E021-features.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const pieces=c=>c.board().flat().filter(Boolean),other=c=>c==='w'?'b':'w';
const balance=(c,color)=>pieces(c).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const event=(id,text,evidence)=>({id,text,evidence,qualityClaim:false});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
class Exhausted extends Error{}
function budget(limit){if(!Number.isSafeInteger(limit)||limit<1)throw Error('maxBroadNodes must be a positive safe integer');return{used:0,tick(){if(++this.used>limit)throw new Exhausted();}};}
function moves(c,w){w.tick();return c.moves({verbose:true});}
function play(c,m,w,fn){w.tick();c.move(m);try{return fn();}finally{c.undo();}}
const bad=c=>c.isCheckmate()||c.isDraw();
function turnBoard(c,color){const f=c.fen().split(' ');if(f[1]!==color){f[1]=color;f[3]='-';}return new Chess(f.join(' '));}

function certify(c,color,attackers,targets,initial,w){
 if(c.isGameOver())return null;const witnesses=[];let minimum=Infinity;
 for(const reply of moves(c,w)){
  const witness=play(c,reply,w,()=>{
   if(c.isGameOver())return null;
   const captures=moves(c,w).filter(m=>m.captured&&attackers.some(a=>a.square===m.from&&c.get(a.square)?.color===color&&c.get(a.square).type===a.type)&&targets.some(t=>t.type!=='k'&&victim(m)===t.square&&t.type===m.captured));
   let best=null;
   for(const capture of captures){const candidate=play(c,capture,w,()=>{
    if(c.isDraw())return null;let worst=balance(c,color)-initial;const responses=[];
    for(const response of moves(c,w)){const gain=play(c,response,w,()=>bad(c)?-Infinity:balance(c,color)-initial);if(gain<=0)return null;worst=Math.min(worst,gain);responses.push({reply:uci(response),gain});}
    if(worst<=0)return null;return{capture:uci(capture),target:victim(capture),worstGain:worst,responses};
   });if(candidate&&(!best||candidate.worstGain>best.worstGain))best=candidate;}
   return best;
  });
  if(!witness)return null;minimum=Math.min(minimum,witness.worstGain);witnesses.push({reply:uci(reply),...witness});
 }
 return{horizonPliesAfterMove:3,materialValues:VALUES,minimumGain:minimum,witnesses};
}
function captureProof(c,capture,color,w){
 const initial=balance(c,color);
 return play(c,capture,w,()=>{
  if(c.isDraw())return null;let minimum=balance(c,color)-initial;const witnesses=[];
  for(const reply of moves(c,w)){const gain=play(c,reply,w,()=>bad(c)?-Infinity:balance(c,color)-initial);if(gain<=0)return null;minimum=Math.min(minimum,gain);witnesses.push({reply:uci(reply),gain});}
  if(minimum<=0)return null;return{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses};
 });
}
export function xRays(c,color){
 const result=[];
 for(const slider of pieces(c).filter(p=>p.color===color&&['b','r','q'].includes(p.type))){
  const dirs=slider.type==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:slider.type==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dx,dy] of dirs){let x=slider.square.charCodeAt(0)-97+dx,y=+slider.square[1]+dy,blocker=null;while(x>=0&&x<8&&y>=1&&y<=8){const square=String.fromCharCode(97+x)+y,p=c.get(square);if(p){if(!blocker)blocker={...p,square};else{result.push({slider:slider.square,sliderType:slider.type,blocker,target:{...p,square},kind:p.color===color?'defense':'attack',line:segment(slider.square,square)});break;}}x+=dx;y+=dy;}}
 }
 return result;
}
export function lineEvents(before,after,move){
 const result=[],old=xRays(before,move.color),fresh=xRays(after,move.color);
 for(const r of fresh){if(old.some(o=>(o.slider===r.slider||o.slider===move.from&&r.slider===move.to)&&o.blocker.square===r.blocker.square&&o.target.square===r.target.square&&o.kind===r.kind))continue;
  result.push(event(`x-ray-${r.kind}`,`X-ray ${r.kind} alignment: ${r.slider}, blocker ${r.blocker.square}, ${names[r.target.type]} ${r.target.square}. The blocker prevents direct ${r.kind==='attack'?'attack':'defense'}.`,r));}
 for(const target of pieces(before).filter(p=>p.color===move.color&&p.square!==move.from))for(const attacker of before.attackers(target.square,other(move.color))){
  const p=before.get(attacker);if(!['b','r','q'].includes(p.type)||after.get(attacker)?.color!==p.color||after.get(target.square)?.color!==move.color)continue;
  const line=segment(attacker,target.square);if(!line?.includes(move.to)||after.attackers(target.square,p.color).includes(attacker))continue;
  result.push(event('interference',`Interference: your ${names[move.piece]} on ${move.to} blocks ${attacker}’s line to ${names[target.type]} ${target.square}.`,{attacker,target:target.square,blocker:move.to,line}));
 }
 return result;
}
export function broadEvents(before,after,move,base,options={}){
 const geometry=lineEvents(before,after,move);if(after.isGameOver())return{events:[],diagnostics:{status:'terminal',nodes:0}};
 const finite=[],w=budget(options.maxBroadNodes??50000),color=move.color,targets=pieces(after).filter(p=>p.color!==color&&after.attackers(p.square,color).includes(move.to));let status='complete';
 try{
  const oldTargets=pieces(before).filter(p=>p.color!==color&&before.attackers(p.square,color).includes(move.from));
  if(targets.length>=2&&targets.some(t=>!oldTargets.some(o=>o.square===t.square))&&(!base.events.some(e=>e.id==='fork')||targets.length>=3)){
   const attackers=[{square:move.to,type:move.promotion||move.piece}],proof=certify(after,color,attackers,targets,balance(before,color),w);
   if(proof){const evidence={attackers,targets,proof,royal:targets.some(t=>t.type==='k')&&targets.some(t=>t.type==='q')};if(!base.events.some(e=>e.id==='fork'))finite.push(event('broad-fork',`${names[attackers[0].type]} fork on ${move.to}: ${targets.length} targets. Every defense permits a target capture with immediate net material gain.`,evidence));if(targets.length>=3)finite.push(event('triple-attack',`Triple attack: ${names[attackers[0].type]} ${move.to} attacks ${targets.length} targets; every defense permits a capture with immediate material gain.`,evidence));}
  }
  const discovered=base.events.filter(e=>e.id==='discovered-attack'),newMoved=targets.filter(t=>!oldTargets.some(o=>o.square===t.square));
  if(discovered.length&&newMoved.length){
   const allTargets=[...new Map([...newMoved,...discovered.map(e=>e.evidence.target)].map(t=>[t.square,t])).values()],attackers=[{square:move.to,type:move.promotion||move.piece},...discovered.map(e=>({square:e.evidence.attacker,type:after.get(e.evidence.attacker).type}))];
   if(allTargets.length>=2){const proof=certify(after,color,attackers,allTargets,balance(before,color),w);if(proof)finite.push(event('discovered-double-attack','Discovered double attack: two attackers create distinct threats; every defense permits a target capture with immediate material gain.',{attackers,targets:allTargets,proof}));}
  }
  for(const reply of moves(after,w)){
   const mate=play(after,reply,w,()=>after.isCheckmate()?{move:uci(reply),after:after.fen()}:null);
   if(mate)finite.push(event('allows-mate',`Watch out: ${reply.san} is checkmate.`,mate));
  }
  const oldEnemy=turnBoard(before,after.turn()).moves({verbose:true}).filter(m=>m.captured);
  for(const capture of moves(after,w).filter(m=>m.captured&&m.captured!=='k')){
   const square=victim(capture),oldSquare=square===move.to?move.from:square;
   if(oldEnemy.some(m=>m.from===capture.from&&victim(m)===oldSquare))continue;
   const proof=captureProof(after,capture,after.turn(),w);if(proof)finite.push(event('hanging-piece',`Watch out: ${capture.san} captures your ${names[capture.captured]} on ${square}, gaining material through every immediate reply.`,{capture:uci(capture),target:square,piece:capture.captured,color:after.turn(),proof}));
  }
 }catch(error){if(!(error instanceof Exhausted))throw error;status='exhausted';finite.length=0;}
 return{events:[...geometry,...finite],diagnostics:{status,nodes:w.used}};
}
const score=e=>e.id==='allows-mate'?140:['checkmate','stalemate','smothered-mate','back-rank-mate'].includes(e.id)?130:e.id==='allows-fork'?125:e.id==='hanging-piece'?120:['broad-fork','discovered-double-attack','triple-attack','fork','absolute-skewer','insufficient-material','fifty-move-threshold'].includes(e.id)?110:['absolute-pin','discovered-check','double-check','avoids-fork'].includes(e.id)?100:['winning-exchange','profitable-capture'].includes(e.id)?90:e.id==='interference'?60:e.id.startsWith('x-ray-')?20:40;
export function explainMove(input){
 const inherited=parent(input),before=legalPosition(input.fen),after=legalPosition(input.fen),move=after.move(input.move);
 // Correct the location of an en-passant victim in inherited capture warnings.
 const parentEvents=inherited.events.map(e=>{if(e.id!=='allows-capture')return e;const m=after.moves({verbose:true}).find(m=>uci(m)===e.evidence.capture);if(!m?.isEnPassant())return e;const square=victim(m);return{...e,text:`Watch out: ${m.san} legally captures your pawn on ${square}.`,evidence:{...e.evidence,target:square,enPassant:true}};});
 const extra=broadEvents(before,after,move,{...inherited,events:parentEvents},input),events=[...parentEvents,...extra.events];
 const comment=events.map((e,i)=>({e,i})).sort((a,b)=>score(b.e)-score(a.e)||a.i-b.i)[0]?.e.text||null;
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...inherited,schema:'coach-concepts-v4',events,comment,diagnostics:{...inherited.diagnostics,broadTactics:extra.diagnostics}};
}

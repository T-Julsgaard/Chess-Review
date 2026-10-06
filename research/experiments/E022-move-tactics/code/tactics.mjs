import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as structural} from '../../E021-structural-concepts/code/explain.mjs';
import {segment} from '../../E021-structural-concepts/code/features.mjs';
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const pieces=c=>c.board().flat().filter(Boolean);
const balance=(c,color)=>pieces(c).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const event=(id,text,evidence)=>({id,text,evidence,qualityClaim:false});
const sameTurn=(c,color)=>{const f=c.fen().split(' ');if(f[1]!==color){f[1]=color;f[3]='-';}return new Chess(f.join(' '));};
const captures=(c,color)=>sameTurn(c,color).moves({verbose:true}).filter(m=>m.captured&&m.captured!=='k');
const king=(c,color)=>pieces(c).find(p=>p.type==='k'&&p.color===color).square;
class Exhausted extends Error{}
function work(limit){if(!Number.isSafeInteger(limit)||limit<1)throw Error('maxTacticNodes must be a positive safe integer');return{used:0,tick(){if(++this.used>limit)throw new Exhausted();}};}
function moves(c,w){w.tick();return c.moves({verbose:true});}
function play(c,m,w,fn){w.tick();c.move(m);try{return fn();}finally{c.undo();}}
const defenderTerminal=c=>c.isCheckmate()||c.isDraw();

export function certifyCapture(before,after,move,w){
  if(!move.captured||after.isDraw())return null;
  const start=balance(before,move.color),replies=moves(after,w),witnesses=[];
  let minimum=balance(after,move.color)-start;
  for(const reply of replies){const gain=play(after,reply,w,()=>defenderTerminal(after)?-Infinity:balance(after,move.color)-start);if(gain<=0)return null;minimum=Math.min(minimum,gain);witnesses.push({reply:uci(reply),gain});}
  if(minimum<=0)return null;
  return{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses};
}
function skewer(before,after,move,w){
  if(!['b','r','q'].includes(move.promotion||move.piece)||!after.isCheck()||after.isGameOver())return null;
  const enemyKing=king(after,after.turn());
  if(!after.attackers(enemyKing,move.color).includes(move.to)||before.attackers(enemyKing,move.color).includes(move.from))return null;
  const dx=enemyKing.charCodeAt(0)-move.to.charCodeAt(0),dy=+enemyKing[1]-+move.to[1];
  const sx=Math.sign(dx),sy=Math.sign(dy);let x=enemyKing.charCodeAt(0)-97+sx,y=+enemyKing[1]+sy,target=null;
  while(x>=0&&x<8&&y>=1&&y<=8){const sq=String.fromCharCode(97+x)+y,p=after.get(sq);if(p){if(p.color!==move.color&&p.type!=='k')target={...p,square:sq};break;}x+=sx;y+=sy;}
  if(!target)return null;
  const start=balance(before,move.color),witnesses=[];let minimum=Infinity;
  for(const reply of moves(after,w)){
    const witness=play(after,reply,w,()=>{
      if(after.isGameOver())return null;
      const attacker=after.get(move.to);if(attacker?.color!==move.color||attacker.type!==(move.promotion||move.piece))return null;
      const capture=moves(after,w).find(m=>m.from===move.to&&m.to===target.square&&m.captured===target.type);if(!capture)return null;
      return play(after,capture,w,()=>{
        if(after.isDraw())return null;
        let worst=balance(after,move.color)-start;const responses=[];
        for(const response of moves(after,w)){const gain=play(after,response,w,()=>defenderTerminal(after)?-Infinity:balance(after,move.color)-start);if(gain<=0)return null;worst=Math.min(worst,gain);responses.push({reply:uci(response),gain});}
        if(worst<=0)return null;
        return{capture:uci(capture),worstGain:worst,responses};
      });
    });
    if(!witness)return null;minimum=Math.min(minimum,witness.worstGain);witnesses.push({reply:uci(reply),...witness});
  }
  return{attacker:move.to,king:enemyKing,target,line:segment(move.to,target.square),proof:{horizonPliesAfterSkewer:3,materialValues:VALUES,minimumGain:minimum,witnesses}};
}
export function moveEvents(before,after,move,options={}){
  const result=[],color=move.color,enemy=after.turn(),oldLegal=before.moves({verbose:true});
  const add=(id,text,evidence)=>result.push(event(id,text,evidence));
  if(oldLegal.length===1)add('only-legal-move','Only legal move: every other move would be illegal.',{legalMoves:oldLegal.map(uci)});
  if(move.captured){add('capture',`You capture the ${names[move.captured]} on ${move.isEnPassant()?move.to[0]+move.from[1]:move.to}.`,{from:move.from,to:move.to,captured:move.captured,enPassant:move.isEnPassant()});const oldCount=pieces(before).filter(p=>!['p','k'].includes(p.type)).length,newCount=pieces(after).filter(p=>!['p','k'].includes(p.type)).length;if(newCount<oldCount)add('piece-simplification','One fewer non-pawn piece remains after this capture.',{before:oldCount,after:newCount});}
  if(before.isCheck()){
    const checkers=before.attackers(king(before,color),enemy);
    if(move.piece==='k')add('king-check-evasion','King escape: your king moves out of check.',{checkers,from:move.from,to:move.to});
    else if(checkers.includes(move.isEnPassant()?move.to[0]+move.from[1]:move.to)&&move.captured)add('capture-checker',`You escape check by capturing the checking ${names[move.captured]} on ${move.isEnPassant()?move.to[0]+move.from[1]:move.to}.`,{checkers,capture:uci(move)});
    else add('interposition',`Interposition: your ${names[move.piece]} on ${move.to} blocks the check.`,{checkers,to:move.to});
  }
  if(after.isCheckmate()){
    const sq=king(after,enemy),neighbors=[];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){if(!dx&&!dy)continue;const x=sq.charCodeAt(0)-97+dx,y=+sq[1]+dy;if(x>=0&&x<8&&y>=1&&y<=8)neighbors.push(String.fromCharCode(97+x)+y);}
    const checkers=after.attackers(sq,color);
    if(checkers.some(s=>after.get(s).type==='n')&&neighbors.every(s=>after.get(s)?.color===enemy))add('smothered-mate','Smothered mate: a knight checks the king, surrounded by its own pieces.',{king:sq,checkers,neighbors});
    const home=enemy==='w'?1:8,forward=enemy==='w'?1:-1,front=neighbors.filter(s=>+s[1]===home+forward);
    if(+sq[1]===home&&checkers.some(s=>['r','q'].includes(after.get(s).type)&&s[1]===sq[1])&&front.every(s=>after.get(s)?.color===enemy&&after.get(s).type==='p'))add('back-rank-mate','Back-rank mate: a rook or queen checks along the rank; friendly pawns block the king’s forward escapes.',{king:sq,checkers,front});
    return{events:result,diagnostics:{status:'complete',nodes:0}};
  }
  if(after.isInsufficientMaterial())add('insufficient-material','Insufficient mating material: this position is drawn.',{fen:after.fen()});
  if(+after.fen().split(' ')[4]>=100)add('fifty-move-threshold','Fifty-move threshold reached: 100 half-moves without a pawn move or capture. Draw-claim procedures depend on the rules.',{halfMoves:+after.fen().split(' ')[4]});
  if(after.isGameOver())return{events:result,diagnostics:{status:'complete',nodes:0}};
  const legalCaptures=captures(after,color),oldCaptures=captures(before,color);
  for(const target of pieces(after).filter(p=>p.color===enemy&&p.type!=='k')){
    const revealed=after.attackers(target.square,color).filter(s=>s!==move.to&&['b','r','q'].includes(after.get(s).type)&&!before.attackers(target.square,color).includes(s)&&legalCaptures.some(m=>m.from===s&&m.to===target.square));
    for(const attacker of revealed){const between=segment(attacker,target.square);if(!between?.includes(move.from))continue;add('discovered-attack',`Discovered attack: moving from ${move.from} opens ${attacker}’s attack on the ${names[target.type]} at ${target.square}.`,{vacated:move.from,attacker,target,legalCapture:uci(legalCaptures.find(m=>m.from===attacker&&m.to===target.square)),line:between});}
    if(!after.attackers(target.square,enemy).length&&before.get(target.square)&&before.attackers(target.square,enemy).length)add('loose-piece',`Loose ${names[target.type]} on ${target.square}: no friendly piece geometrically defends it.`,{target,defenders:[],oldDefenders:before.attackers(target.square,enemy)});
    const capture=legalCaptures.find(m=>m.to===target.square);if(capture&&!oldCaptures.some(m=>m.to===target.square&&(m.from===capture.from||m.from===move.from&&capture.from===move.to)))add('en-prise',`The ${names[target.type]} on ${target.square} is en prise: ${capture.san} is a legal capture if available next turn.`,{target,capture:uci(capture),hypotheticalTurn:color});
  }
  const oldEnemyCaptures=captures(before,enemy);
  for(const capture of after.moves({verbose:true}).filter(m=>m.captured&&m.captured!=='k')){
    const oldSquare=capture.to===move.to?move.from:capture.to;
    if(!oldEnemyCaptures.some(m=>m.from===capture.from&&m.to===oldSquare))add('allows-capture',`Watch out: ${capture.san} legally captures your ${names[capture.captured]} on ${capture.to}.`,{capture:uci(capture),target:capture.to,piece:capture.captured});
  }
  const w=work(options.maxTacticNodes??50000),finite=[];let status='complete';
  try{
    const proof=certifyCapture(before,after,move,w);
    if(proof){finite.push(event('profitable-capture',`Your capture gains material through every immediate reply; minimum nominal gain ${proof.minimumGain}.`,{capture:uci(move),proof}));
      if(['b','n'].includes(move.piece)&&move.captured==='r')finite.push(event('winning-exchange',`Winning the exchange: your ${names[move.piece]} takes a rook, retaining a material gain through every immediate reply.`,{capture:uci(move),proof}));}
    const skew=skewer(before,after,move,w);if(skew)finite.push(event('absolute-skewer',`Absolute skewer: check on ${skew.king} exposes ${names[skew.target.type]} ${skew.target.square}; every reply allows its capture with immediate material gain.`,skew));
  }catch(error){if(!(error instanceof Exhausted))throw error;status='exhausted';finite.length=0;}
  return{events:[...result,...finite],diagnostics:{status,nodes:w.used}};
}
const priority=e=>['back-rank-mate','smothered-mate'].includes(e.id)?120:e.id==='absolute-skewer'?95:e.id==='winning-exchange'?85:e.id==='profitable-capture'?75:['interposition','capture-checker','king-check-evasion','only-legal-move','discovered-attack'].includes(e.id)?65:e.id==='allows-capture'?45:['insufficient-material','fifty-move-threshold'].includes(e.id)?110:10;
const inheritedPriority=e=>['checkmate','stalemate','allows-fork'].includes(e.id)?115:e.id==='fork'?100:['double-check','discovered-check','absolute-pin','avoids-fork'].includes(e.id)?90:30;
export function explainMove(input){
  const base=structural(input),before=legalPosition(input.fen),after=legalPosition(input.fen),move=after.move(input.move);
  const extra=moveEvents(before,after,move,input),events=[...base.events,...extra.events];
  const selected=events.map((e,i)=>({e,i,p:i<base.events.length?inheritedPriority(e):priority(e)})).sort((a,b)=>b.p-a.p||a.i-b.i)[0]?.e;
  const comment=selected?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
  return{...base,schema:'coach-concepts-v3',events,comment,diagnostics:{...base.diagnostics,moveTactics:extra.diagnostics}};
}

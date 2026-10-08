import {Chess} from '../../chess.js';
import {legalPosition,uci,VALUES} from './E020-concepts.mjs';
import {explainMove as parent} from './E023-tactics.mjs';
import {pawnFeatures,unobstructed} from './E021-features.mjs';
const pieces=c=>c.board().flat().filter(Boolean),other=c=>c==='w'?'b':'w',side=c=>c==='w'?'White':'Black';
const balance=(c,color)=>pieces(c).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const feature=(id,text,evidence)=>({id,text,evidence,qualityClaim:false});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;

export function validateHistory(input){
 if(input.history===undefined)return null;const h=input.history;
 if(!h||typeof h.fen!=='string'||!Array.isArray(h.moves)||h.moves.length>1000)throw Error('Invalid history: expected FEN and at most 1000 UCI moves');
 const c=legalPosition(h.fen),records=[];
 for(const code of h.moves){
  if(c.isGameOver())throw Error('Invalid history: cannot continue a terminal position');
  if(typeof code!=='string'||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(code))throw Error('Invalid history UCI move');
  const before=c.fen(),m=c.moves({verbose:true}).find(m=>uci(m)===code);if(!m)throw Error('Invalid history: illegal move '+code);
  c.move(code);records.push({before,move:m,after:c.fen()});
 }
 if(c.fen()!==legalPosition(input.fen).fen())throw Error('Invalid history: final FEN does not match input');
 return{start:h.fen,moves:[...h.moves],records};
}
export function endingClasses(c){
 const result=[],all=pieces(c),army=color=>all.filter(p=>p.color===color&&p.type!=='k'),sig=color=>army(color).map(p=>p.type).sort().join('');
 const add=(id,label,color,details={})=>result.push({id,label,color,white:sig('w'),black:sig('b'),...details});
 const combinations=[['p','','king-pawn-king','King and pawn versus king'],['pr','r','rook-pawn-rook','Rook and pawn versus rook'],['bp','b','bishop-pawn-bishop','Bishop and pawn versus bishop'],['np','n','knight-pawn-knight','Knight and pawn versus knight'],['q','r','queen-rook','Queen versus rook'],['q','b','queen-minor','Queen versus bishop'],['q','n','queen-minor','Queen versus knight'],['q','p','queen-pawn','Queen versus pawn'],['q','pr','queen-rook-pawn','Queen versus rook and pawn'],['br','r','rook-bishop-rook','Rook and bishop versus rook'],['nr','r','rook-knight-rook','Rook and knight versus rook']];
 for(const color of ['w','b']){
  const own=sig(color),enemy=sig(other(color));for(const [a,b,id,label] of combinations)if(own===a&&enemy===b)add(id,label,color);
  const oppositeBishops=army(color).filter(p=>p.type==='b').map(p=>(p.square.charCodeAt(0)+ +p.square[1])%2);
  if(own==='bb'&&enemy==='n'&&new Set(oppositeBishops).size===2)add('two-bishops-knight','Two bishops versus knight',color);
  if(own==='q'&&enemy==='p'){const p=army(other(color))[0],relative=other(color)==='w'?+p.square[1]:9-+p.square[1];if(relative>=6)add('queen-advanced-pawn','Queen versus advanced pawn',color,{pawn:p.square,relative});}
  if(['r','n'].includes(own)&&/^p+$/.test(enemy)){
   const pf=pawnFeatures(c,other(color)),pawns=army(other(color));
   if(own==='r'&&pf.passed.length===pawns.length)add('rook-passed-pawns','Rook versus passed pawns',color,{pawns:pf.passed});
   const links=pf.connected,seen=new Set(links[0]||[]);let changed=true;while(changed){changed=false;for(const pair of links)if(pair.some(s=>seen.has(s)))for(const s of pair)if(!seen.has(s)){seen.add(s);changed=true;}}
   if(pawns.length>=2&&seen.size===pawns.length)add(own==='r'?'rook-connected-pawns':'knight-connected-pawns',own==='r'?'Rook versus connected pawns':'Knight versus connected pawns',color,{pawns:pawns.map(p=>p.square),links});
  }
 }
 const nonPawn=all.filter(p=>!['p','k'].includes(p.type));
 if(!nonPawn.length&&all.some(p=>p.type==='p'))add('pawn-ending','Pawn ending',null);
 for(const [type,name] of [['r','Rook'],['b','Bishop'],['n','Knight'],['q','Queen']])if(nonPawn.length&&nonPawn.every(p=>p.type===type)&&['w','b'].every(color=>nonPawn.some(p=>p.color===color)))add(type+'-ending',name+' ending',null);
 return result;
}
function behindPassers(c,color){
 const result=[];for(const q of pieces(c).filter(p=>p.color===color&&p.type==='q'))for(const pawnColor of ['w','b'])for(const pawn of pawnFeatures(c,pawnColor).passed){const dir=pawnColor==='w'?1:-1;if(q.square[0]===pawn[0]&&(+q.square[1]-+pawn[1])*dir<0&&unobstructed(c,q.square,pawn))result.push({queen:q.square,pawn,pawnColor});}return result;
}
function outpost(c,square,color){
 const relative=color==='w'?+square[1]:9-+square[1];if(!'cdef'.includes(square[0])||relative<4||relative>6)return null;
 const supporters=pieces(c).filter(p=>p.type==='p'&&p.color===color&&c.attackers(square,color).includes(p.square));
 if(!supporters.length)return null;
 const challengers=pieces(c).filter(p=>p.type==='p'&&p.color!==color&&Math.abs(p.square.charCodeAt(0)-square.charCodeAt(0))===1&&(+p.square[1]-+square[1])*(color==='w'?1:-1)>0);
 return challengers.length?null:{square,supporters:supporters.map(p=>p.square),relative,challengers:[]};
}
export function transitionEvents(before,after,move,history){
 const result=[],add=(id,text,evidence)=>result.push(feature(id,text,evidence)),old=endingClasses(before),fresh=endingClasses(after);
 if(after.isCheckmate()){
  const own=pieces(after).filter(p=>p.color===move.color&&p.type!=='k'),enemy=pieces(after).filter(p=>p.color!==move.color&&p.type!=='k'),signature=own.map(p=>p.type).sort().join('');
  const labels={r:['king-rook-mate','King-and-rook mate'],q:['king-queen-mate','King-and-queen mate'],bb:['king-bishops-mate','King and two bishops mate'],bn:['bishop-knight-mate','Bishop-and-knight mate']};
  if(!enemy.length&&labels[signature]){const [id,label]=labels[signature];add(id,`${label}: these pieces and your king checkmate the lone king.`,{own:own.map(p=>({square:p.square,type:p.type})),enemy:[],after:after.fen()});}
  if(!enemy.length&&signature==='qr'){const queen=own.find(p=>p.type==='q'),rook=own.find(p=>p.type==='r'),king=pieces(after).find(p=>p.type==='k'&&p.color!==move.color);if(after.attackers(king.square,move.color).includes(queen.square)&&after.attackers(queen.square,move.color).includes(rook.square))add('queen-rook-mate','Queen-and-rook mate: your rook supports the checking queen.',{queen:queen.square,rook:rook.square,king:king.square,after:after.fen()});}
 }
 for(const e of fresh){if(old.some(o=>o.id===e.id&&o.color===e.color)&&move.piece!=='p')continue;
  const label=e.label,types={p:'pawn',r:'rook',b:'bishop',n:'knight',q:'queen'};
  const sentence=e.color?`${label}: these are the exact remaining non-king armies.`:`${label}: only kings${e.id==='pawn-ending'?' and pawns':', '+types[e.id[0]]+'s and optional pawns'} remain.`;
  add('ending-'+e.id,sentence,e);
 }
 const changed=fresh.find(e=>!old.some(o=>o.id===e.id&&o.color===e.color));
 if(move.captured&&changed)add('endgame-transition',`Endgame transition: ${changed.label.toLowerCase()} now describes the remaining material.`,{before:before.fen(),after:after.fen(),ending:changed});
 if(move.captured&&pieces(before).some(p=>!['p','k'].includes(p.type))&&fresh.some(e=>e.id==='pawn-ending'))add('pawn-ending-transition','Pawn-ending transition: the last non-pawn piece is captured.',{before:before.fen(),after:after.fen()});
 const last=history?.records.at(-1)?.move;
 if(last?.captured&&move.captured&&!last.promotion&&!move.promotion&&last.color!==move.color&&victim(move)===last.to&&move.captured===last.piece){
  const gain=VALUES[move.captured]-VALUES[last.captured],prior=legalPosition(history.records.at(-1).before),e={last:uci(last),recapture:uci(move),lost:last.captured,gained:move.captured,lostValue:VALUES[last.captured],gainedValue:VALUES[move.captured],nominalDelta:gain,beforePair:prior.fen(),afterPair:after.fen(),balanceBefore:balance(prior,move.color),balanceAfter:balance(after,move.color),history:{fen:history.start,moves:history.moves}};
  add('exchange',`Exchange: you recapture on ${victim(move)}, trading ${VALUES[last.captured]} for ${VALUES[move.captured]} nominal points.`,e);
  add(gain===0?'equal-trade':'unequal-trade',`${gain===0?'Equal':'Unequal'} trade by nominal values: ${VALUES[last.captured]} for ${VALUES[move.captured]}. Position quality needs separate analysis.`,e);
  if(last.captured==='q'&&move.captured==='q')add('queen-trade','Queen trade: both queens have been captured in this exchange.',e);
  if(last.captured==='r'&&move.captured==='r'){add('rook-trade','Rook trade: both rooks have been captured in this exchange.',e);if(fresh.some(e=>e.id==='pawn-ending'))add('rook-trade-pawn-ending','Rook trade into a pawn ending: only kings and pawns remain.',e);}
  if(['b','n'].includes(last.captured)&&['b','n'].includes(move.captured))add('minor-trade','Minor-piece trade: both captured pieces are bishops or knights.',e);
  if(last.captured==='r'&&['b','n'].includes(move.captured)||move.captured==='r'&&['b','n'].includes(last.captured))add('exchange-difference','The exchange: this trade swaps a rook and a minor piece.',e);
 }
 const center=['d4','e4','d5','e5'];
 if(move.piece==='q'&&center.includes(move.to)&&!center.includes(move.from))add('queen-centralization',`Queen centralization: your queen arrives on ${move.to}, one of the four central squares.`,{from:move.from,to:move.to});
 if((move.promotion||move.piece)==='q'&&after.isCheck()&&after.attackers(pieces(after).find(p=>p.type==='k'&&p.color!==move.color).square,move.color).includes(move.to))add('queen-check',`Queen check: your queen on ${move.to} attacks the king.`,{square:move.to,promotion:move.promotion||null});
 if(move.piece==='p'&&pawnFeatures(before,move.color).passed.includes(move.from)&&after.isCheck()&&after.attackers(pieces(after).find(p=>p.type==='k'&&p.color!==move.color).square,move.color).includes(move.to))add('passed-pawn-check',move.promotion?`Your passed pawn promotes with check on ${move.to}.`:`Passed-pawn check: your pawn advances to ${move.to} with check.`,{from:move.from,to:move.to,promotion:move.promotion||null});
 for(const e of behindPassers(after,move.color)){if(behindPassers(before,move.color).some(o=>(o.queen===e.queen||o.queen===move.from&&e.queen===move.to)&&(o.pawn===e.pawn||o.pawn===move.from&&e.pawn===move.to)&&o.pawnColor===e.pawnColor))continue;add('queen-behind-passer',`Your queen on ${e.queen} stands behind ${side(e.pawnColor)}’s passed pawn on ${e.pawn}.`,e);}
 if(move.piece==='r'){
  const rank=move.color==='w'?+move.to[1]:9-+move.to[1],prior=move.color==='w'?+move.from[1]:9-+move.from[1];
  if([3,4].includes(rank)&&rank!==prior)add('rook-lift-preparation',`Rook lift geometry: your rook reaches the ${rank===3?'third':'fourth'} rank on ${move.to}.`,{from:move.from,to:move.to,rank});
  if([3,4].includes(rank)&&rank===prior&&move.from[0]!==move.to[0])add('rook-lift',`Rook lift: your rook moves sideways from ${move.from} to ${move.to} on the ${rank===3?'third':'fourth'} rank.`,{from:move.from,to:move.to,rank});
 }
 if(move.piece==='n'){const e=outpost(after,move.to,move.color);if(e&&!outpost(before,move.from,move.color))add('protected-knight-outpost',`Knight outpost on ${move.to}: pawn-supported, with no enemy pawn ahead on either neighboring file.`,e);}
 return result;
}
const priority=e=>e.id==='allows-mate'?150:['king-rook-mate','king-queen-mate','king-bishops-mate','bishop-knight-mate','queen-rook-mate'].includes(e.id)?145:['checkmate','stalemate','smothered-mate','back-rank-mate','insufficient-material','fifty-move-threshold'].includes(e.id)?140:e.id==='allows-fork'?135:e.id==='hanging-piece'?130:['broad-fork','discovered-double-attack','triple-attack','fork','absolute-skewer'].includes(e.id)?120:['absolute-pin','discovered-check','double-check','avoids-fork'].includes(e.id)?110:['queen-trade','rook-trade-pawn-ending','minor-trade','rook-trade','exchange-difference'].includes(e.id)?105:e.id.startsWith('ending-')||e.id==='pawn-ending-transition'?100:['equal-trade','unequal-trade','exchange','winning-exchange','profitable-capture'].includes(e.id)?95:e.id==='protected-knight-outpost'?80:['queen-behind-passer','queen-centralization','queen-check','passed-pawn-check','rook-lift','rook-lift-preparation'].includes(e.id)?70:40;
export function explainMove(input){
 const history=validateHistory(input),base=parent(input),before=legalPosition(input.fen),after=legalPosition(input.fen),move=after.move(input.move),extra=transitionEvents(before,after,move,history),events=[...base.events,...extra];
 const selected=events.map((e,i)=>({e,i})).sort((a,b)=>priority(b.e)-priority(a.e)||a.i-b.i)[0]?.e.text||null;
 if(selected&&selected.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v5',events,comment:selected,diagnostics:{...base.diagnostics,history:history?{verified:true,plies:history.moves.length}:null}};
}

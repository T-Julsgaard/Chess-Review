import {Chess} from '../../chess.js';
import {legalPosition,uci} from './E020-concepts.mjs';
import {explainMove as parent} from './E024-transitions.mjs';
import {pawnFeatures} from './E021-features.mjs';
import {selectComment,contextualText} from './E025-selection.mjs';
const all=c=>c.board().flat().filter(Boolean),other=c=>c==='w'?'b':'w',central=['d4','e4','d5','e5'];
const names={p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const squareColor=s=>(s.charCodeAt(0)-97+ +s[1])%2?'dark':'light';
const feature=(id,text,evidence)=>({id,text,evidence,qualityClaim:false});
const victim=m=>m.isEnPassant()?m.to[0]+m.from[1]:m.to;
const same=list=>[...list].sort().join('|');
const short=list=>list.length>3?`${list.slice(0,2).join(', ')} and ${list.length-2} others`:list.join(', ');
export function captureBoard(c,color){const f=c.fen().split(' ');if(f[1]!==color){f[1]=color;f[3]='-';}return new Chess(f.join(' '));}
export function hangingPawns(c,color){
 const p=all(c).filter(p=>p.type==='p'&&p.color===color),pair=p.filter(p=>'cd'.includes(p.square[0]));
 if(pair.length!==2||pair[0].square[0]===pair[1].square[0]||pair[0].square[1]!==pair[1].square[1]||p.some(p=>'be'.includes(p.square[0])))return[];
 const rank=color==='w'?+pair[0].square[1]:9- +pair[0].square[1];return[4,5].includes(rank)?pair.map(p=>p.square).sort():[];
}
export function cover(c,color){
 const king=all(c).find(p=>p.type==='k'&&p.color===color).square,home=color==='w'?1:8,dir=color==='w'?1:-1;
 if(+king[1]!==home||!'ceg'.includes(king[0]))return{king:null,pawns:[]};
 return{king,pawns:all(c).filter(p=>p.type==='p'&&p.color===color&&Math.abs(p.square.charCodeAt(0)-king.charCodeAt(0))<=1&&[1,2].includes((+p.square[1]-home)*dir)).map(p=>p.square).sort()};
}
export function symmetricPawns(c){const p=all(c).filter(p=>p.type==='p'),w=p.filter(p=>p.color==='w').map(p=>p.square),b=p.filter(p=>p.color==='b').map(p=>p.square[0]+(9- +p.square[1]));return w.length>=2&&b.length>=2&&same(w)===same(b);}
export function lockedChains(c,color){
 const own=pawnFeatures(c,color),enemy=pawnFeatures(c,other(color)),result=[];
 for(const group of own.components){if(group.members.length<2)continue;const pairs=group.members.map(s=>own.rams.find(r=>r.own===s));if(pairs.some(p=>!p))continue;
  const opposing=enemy.components.find(g=>same(g.members)===same(pairs.map(p=>p.enemy))&&g.members.every(s=>enemy.rams.some(r=>r.own===s&&group.members.includes(r.enemy))));
  if(opposing)result.push({own:group,enemy:opposing,pairs,closedCenter:group.members.filter(s=>central.includes(s)).length>=2});
 }
 return result;
}
export function fixedCenter(c){
 const p=all(c).filter(p=>p.type==='p'&&central.includes(p.square));if(p.length<2||new Set(p.map(p=>p.color)).size!==2)return null;
 for(const pawn of p){const dir=pawn.color==='w'?1:-1,front=pawn.square[0]+(+pawn.square[1]+dir);if(!c.get(front))return null;
  for(const dx of [-1,1]){const x=pawn.square.charCodeAt(0)-97+dx;if(x<0||x>7)continue;const square=String.fromCharCode(97+x)+(+pawn.square[1]+dir),target=c.get(square);if(target&&target.color!==pawn.color)return null;}
  if(c.moves({verbose:true}).some(m=>m.from===pawn.square&&m.isEnPassant()))return null;
 }
 return{pawns:p.map(p=>p.square).sort()};
}
function chainBlockers(c,color){
 const dir=color==='w'?1:-1,components=pawnFeatures(c,color).components,result=[];
 for(const b of all(c).filter(p=>p.type==='b'&&p.color===color))for(const dx of [-1,1]){const x=b.square.charCodeAt(0)-97+dx,y=+b.square[1]+dir;if(x<0||x>7||y<1||y>8)continue;const square=String.fromCharCode(97+x)+y,p=c.get(square),chain=components.find(g=>g.members.includes(square));if(p?.type==='p'&&p.color===color&&chain)result.push({bishop:b.square,blocker:square,chain});}
 return result;
}
export function formationEvents(before,after,move){
 const events=[],add=(id,text,evidence)=>events.push(feature(id,text,evidence)),color=move.color,enemy=other(color),legal=captureBoard(after,color).moves({verbose:true}).filter(m=>m.captured&&m.captured!=='k');
 const pair=hangingPawns(after,color);if(pair.length&&same(pair)!==same(hangingPawns(before,color)))add('hanging-pawns',`Hanging pawns on ${pair.join(' and ')}: a side-by-side c/d pair without friendly pawns on the b/e files.`,{squares:pair,externalFiles:'be',relativeRank:color==='w'?+pair[0][1]:9- +pair[0][1]});
 if(move.piece==='p'&&!move.captured&&!move.promotion){
  for(const target of all(after).filter(p=>p.color===enemy&&p.type==='p'&&after.attackers(p.square,color).includes(move.to)&&!before.attackers(p.square,color).includes(move.from))){
   const capture=legal.find(m=>m.from===move.to&&victim(m)===target.square);if(!capture)continue;const e={pawn:move.to,target:target.square,capture:uci(capture),hypotheticalTurn:color};
   add('pawn-lever',`Pawn lever: ${move.to} attacks ${target.square}; ${capture.san} is legal if available next turn.`,e);
   if(central.includes(target.square))add('central-break',`Central break: your pawn on ${move.to} newly attacks the central pawn on ${target.square}.`,e);
   const chain=pawnFeatures(after,enemy).components.find(g=>g.bases.includes(target.square)&&g.members.some(s=>central.includes(s)));
   if(chain)add('undermining-center',`You attack the base ${target.square} of a pawn chain supporting the center.`,{...e,chain});
  }
 }
 if(move.captured){const removed=victim(move);
  for(const target of all(after).filter(p=>p.color===enemy&&p.type!=='k')){
   const oldDefenders=before.attackers(target.square,enemy),capture=legal.find(m=>victim(m)===target.square);if(!oldDefenders.includes(removed)||!capture)continue;
   add('removal-defender',`Defender-removal geometry: ${removed} supported ${names[target.type]} ${target.square}’s square. Other defenders may remain.`,{removed,target,oldDefenders,remainingDefenders:after.attackers(target.square,enemy),capture:uci(capture),hypotheticalTurn:color});
  }
  const oldCover=cover(before,enemy);if(move.captured==='p'&&oldCover.pawns.includes(removed))add('pawn-cover-capture',`Pawn-cover capture: ${removed} was in front of ${enemy==='w'?'White':'Black'}’s king on ${oldCover.king}.`,{removed,king:oldCover.king,oldCover:oldCover.pawns,newCover:cover(after,enemy).pawns});
 }
 const oldLocked=lockedChains(before,color);
 for(const group of lockedChains(after,color)){if(oldLocked.some(g=>same(g.own.members)===same(group.own.members)&&same(g.enemy.members)===same(group.enemy.members)))continue;
  const pair=group.pairs[0];add('locked-pawn-chains',`Locked pawn chains meet at ${pair.own}/${pair.enemy}; every pawn’s straight advance is blocked.`,group);
  if(group.closedCenter){const pair=group.pairs.find(p=>central.includes(p.own));add('closed-center',`Closed center: locked pawn chains meet on ${pair.own} and ${pair.enemy}.`,group);}
 }
 const fixed=fixedCenter(after);if(fixed&&!fixedCenter(before))add('fixed-center','Fixed-center geometry: central pawns currently have no straight advance or pawn capture.',fixed);
 const centralPawns=c=>all(c).filter(p=>p.type==='p'&&'de'.includes(p.square[0]));if(!centralPawns(after).length&&centralPawns(before).length)add('open-center','Open center: neither the d-file nor the e-file contains a pawn.',{files:'de',remaining:[]});
 const ownCover=cover(after,color),oldCover=cover(before,color);if(ownCover.king&&ownCover.pawns.length&&(ownCover.king!==oldCover.king||same(ownCover.pawns)!==same(oldCover.pawns)))add('pawn-cover',`Pawn cover: ${short(ownCover.pawns)} stand in front of your king on ${ownCover.king}.`,{...ownCover,previous:oldCover});
 const symmetric=symmetricPawns(after),previous=symmetricPawns(before);if(symmetric!==previous){const squares=all(after).filter(p=>p.type==='p').map(p=>({square:p.square,color:p.color}));add(symmetric?'symmetric-pawns':'asymmetric-pawns',symmetric?'Symmetric pawn structure: both sides’ pawns match by same-file rank reflection.':'Asymmetric pawn structure: the pawn armies no longer match by same-file rank reflection.',{pawns:squares,previous,symmetric});}
 for(const b of all(after).filter(p=>p.type==='b'&&p.color===color)){
  const colorName=squareColor(b.square),count=c=>all(c).filter(p=>p.type==='p'&&p.color===color&&squareColor(p.square)===colorName).map(p=>p.square).sort(),prior=count(before),current=count(after);
  if(prior.length!==current.length)add('bishop-pawn-color',`Your bishop on ${b.square} shares ${colorName} squares with ${current.length} of your pawns.`,{bishop:b.square,colorComplex:colorName,pawns:current,previous:prior});
 }
 const blockers=chainBlockers(before,color);for(const e of chainBlockers(after,color)){if(blockers.some(o=>(o.bishop===e.bishop||o.bishop===move.from&&e.bishop===move.to)&&o.blocker===e.blocker))continue;add('bishop-behind-chain',`Bishop behind pawn chain: ${e.blocker} directly blocks ${e.bishop}’s forward diagonal.`,e);}
 return events;
}
export function explainMove(input){
 const base=parent(input),before=legalPosition(input.fen),after=legalPosition(input.fen),move=after.move(input.move),extra=formationEvents(before,after,move),events=[...base.events,...extra].map(contextualText);
 const comment=selectComment(events);
 if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');
 return{...base,schema:'coach-concepts-v6',events,comment};
}

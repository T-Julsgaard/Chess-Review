import {Chess} from '../../../../lib/chess.js';
import {uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as parentPriority} from '../../E031-intermediate-moves/code/intermediate.mjs';
export const positionKey=c=>c.fen().split(' ').slice(0,4).join(' ');
export function trail(input){const c=new Chess(input.history.fen),positions=[{ply:0,key:positionKey(c),fen:c.fen()}],moves=[];for(const u of [...input.history.moves,input.move]){const m=c.move(u);moves.push(m);positions.push({ply:moves.length,key:positionKey(c),fen:c.fen()});}return{c,positions,moves};}
export function material(c){const pieces=c.board().flat().filter(Boolean).filter(p=>p.type!=='k').map(p=>({square:p.square,type:p.type,color:p.color}));let reason=null;if(!pieces.length)reason='bare-kings';else if(pieces.length===1&&['b','n'].includes(pieces[0].type))reason='lone-minor';else if(pieces.every(p=>p.type==='b')&&new Set(pieces.map(p=>(p.square.charCodeAt(0)+ +p.square[1])%2)).size===1)reason='same-color-bishops';return{reason,pieces};}
export function priority(e){return e.id==='draw-position'?181:e.id==='repetition-claim'?178:e.id==='fifty-move-claim'?177:e.id==='irreversible-move'?(e.evidence.lostRights.length?104:59):parentPriority(e);}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
export function explainMove(input){
 const base=parent(input),history=validateHistory(input),before=new Chess(input.fen),after=new Chess(input.fen),played=after.move(input.move),extra=[],afterFen=after.fen(),mat=material(after);
 if(!after.isCheckmate()){
  if(after.isStalemate()||mat.reason)extra.push({id:'draw-position',text:after.isStalemate()?'Drawn position: stalemate leaves no legal move and no check.':mat.reason==='bare-kings'?'Drawn position: only the two kings remain.':mat.reason==='lone-minor'?'Drawn position: a lone bishop or knight cannot mate a bare king.':'Drawn position: only kings and bishops on the same square color remain.',evidence:{afterFen,reason:after.isStalemate()?'stalemate':mat.reason,pieces:mat.pieces},qualityClaim:false});
  else if(history){const t=trail(input),key=positionKey(t.c),occurrences=t.positions.filter(p=>p.key===key).map(p=>p.ply),common={history:{start:history.start,moves:history.moves},played:uci(played),afterFen,positions:t.positions};
   if(occurrences.length>=3)extra.push({id:'repetition-claim',text:`Threefold repetition: ${after.turn()==='w'?'White':'Black'} can claim a draw; this position has occurred ${occurrences.length} times.`,evidence:{...common,key,occurrences,claimant:after.turn()},qualityClaim:false});
   let quietPlies=0;for(const m of [...t.moves].reverse()){if(m.piece==='p'||m.captured)break;quietPlies++;}const fullQuiet=quietPlies===t.moves.length,initialHalfmoves=+history.start.split(' ')[4];
   if(quietPlies>=100&&+afterFen.split(' ')[4]>=100&&(!fullQuiet||initialHalfmoves===0))extra.push({id:'fifty-move-claim',text:`Fifty-move rule: ${after.turn()==='w'?'White':'Black'} can claim a draw after 100 verified plies without a pawn move or capture.`,evidence:{...common,quietPlies,initialHalfmoves,claimant:after.turn(),halfmoveCount:+afterFen.split(' ')[4]},qualityClaim:false});
  }
 }
 const oldRights=before.fen().split(' ')[2],newRights=afterFen.split(' ')[2],lostRights=[...oldRights].filter(r=>r!=='-'&&!newRights.includes(r)),reasons=[];
 if(played.piece==='p')reasons.push('pawn-move');if(played.captured)reasons.push('capture');if(lostRights.length)reasons.push('castling-rights');
 if(reasons.length)extra.push({id:'irreversible-move',text:played.piece==='p'?'Irreversible pawn move: it resets the fifty-move count.':played.captured?'Irreversible capture: it resets the fifty-move count.':'Irreversible move: it permanently removes castling rights.',evidence:{played:uci(played),piece:played.piece,captured:played.captured||null,beforeFen:before.fen(),afterFen,reasons,oldRights,newRights,lostRights,halfmoveCount:+afterFen.split(' ')[4]},qualityClaim:false});
 if(!extra.length)return base;const events=[...base.events,...extra],comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v13',events,comment};
}

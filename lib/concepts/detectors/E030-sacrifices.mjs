import {Chess} from '../../chess.js';
import {uci,VALUES} from './E020-concepts.mjs';
import {segment,unobstructed} from './E021-features.mjs';
import {explainMove as parent,priority as parentPriority} from './E029-mates.mjs';
const names={q:'Queen',r:'Rook',b:'Bishop',n:'Knight',p:'Pawn'};
const board=input=>{const c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves)c.move(m);return c;};
const capturedSquare=m=>m.flags.includes('e')?m.to[0]+m.from[1]:m.to;
export function clearance(before,after,played){
 const pieces=after.board().flat().filter(Boolean),king=pieces.find(p=>p.type==='k'&&p.color===after.turn()).square,rays=[];
 for(const type of ['q','r','b'])for(const {square:slider} of pieces.filter(p=>p.type===type&&p.color===played.color)){
  if(slider===played.to||before.get(slider)?.type!==type)continue;const line=segment(slider,king);if(!line||!line.includes(played.from))continue;
  const diagonal=slider[0]!==king[0]&&slider[1]!==king[1];if(type==='r'&&diagonal||type==='b'&&!diagonal)continue;
  if(unobstructed(after,slider,king)&&line.filter(s=>before.get(s)).length===1)rays.push({slider,type,king,line,vacated:played.from});
 }return rays;
}
export function priority(e){return e.id==='clearance-sacrifice'?159.9:e.id==='exchange-sacrifice'?159.8:e.id==='mating-sacrifice'?159.6:parentPriority(e);}
export function selectComment(events){return [...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;}
export function explainMove(input){
 const base=parent(input);if(!input.mateDepth||base.mateAnalysis.status==='exhausted')return base;
 const forced=base.events.find(e=>e.id==='forced-mate');if(!forced)return base;
 const before=board(input),after=board(input),played=after.move(input.move);if(played.piece==='k'||played.promotion)return base;
 const loss=VALUES[played.piece]-VALUES[played.captured||'k'];if(loss<=0)return base;
 const acceptances=after.moves({verbose:true}).filter(m=>m.captured&&capturedSquare(m)===played.to).map(m=>({move:uci(m),capturer:m.piece,square:capturedSquare(m)}));if(!acceptances.length)return base;
 const proof=forced.evidence.proof;for(const a of acceptances){const branch=proof.tree.branches.find(b=>b.move===a.move);if(!branch?.child.win)throw Error('Acceptance missing positive mate branch');}
 const evidence={offered:{type:played.piece,color:played.color,square:played.to},played:uci(played),captured:played.captured||null,nominalLoss:loss,acceptances,mateIn:forced.evidence.mateIn,proof,shorterFailures:forced.evidence.shorterFailures};
 const number=evidence.mateIn===2?'two':'three',suffix=`accepting it still leads to forced mate within ${number} moves.`,extra=[{id:'mating-sacrifice',text:`${names[played.piece]} sacrifice offered on ${played.to}: ${suffix}`,evidence,qualityClaim:false}];
 if(played.piece==='r'&&['n','b'].includes(played.captured))extra.push({id:'exchange-sacrifice',text:`Exchange sacrifice offered on ${played.to}: ${suffix}`,evidence,qualityClaim:false});
 const rays=clearance(before,after,played);if(rays.length)extra.push({id:'clearance-sacrifice',text:`Clearance sacrifice opens ${rays[0].slider}-${rays[0].king}: ${suffix}`,evidence:{...evidence,rays},qualityClaim:false});
 const events=[...base.events,...extra],comment=selectComment(events);if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v11',events,comment};
}

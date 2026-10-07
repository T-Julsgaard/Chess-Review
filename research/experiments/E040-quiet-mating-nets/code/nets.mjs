import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent,priority as parentPriority} from '../../E039-king-promotion-support/code/support.mjs';
export const priority=e=>e.id==='quiet-mating-net'?159:parentPriority(e);
export function explainMove(input){
 const base=parent(input),c=new Chess(input.history?.fen||input.fen);if(input.history)for(const m of input.history.moves)c.move(m);const m=c.move(input.move),extra=[];
 const mate=base.events.find(e=>e.id==='forced-mate'&&e.evidence.mateIn===2);
 if(mate&&!m.captured&&!m.promotion&&!c.isCheck()&&!c.isGameOver()){
  const proof=mate.evidence.proof;if(proof.plies!==2||proof.tree.kind!=='all'||!proof.tree.win||!proof.tree.branches.length)throw Error('Invalid inherited mating net');
  extra.push({id:'quiet-mating-net',text:'Quiet mating net: every legal reply allows mate on your next move.',qualityClaim:false,evidence:{played:m.from+m.to,afterFen:c.fen(),proof,replyCount:proof.tree.branches.length}});
 }
 const events=[...base.events,...extra],comment=[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null;if(comment&&comment.split(/\s+/).length>24)throw Error('Comment exceeds 24 words');return{...base,schema:'coach-concepts-v21',events,comment};
}

import assert from 'node:assert/strict';import {Chess} from '../../../../lib/chess.js';import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';import {replay,replayRefutation} from '../../E070-knight-outposts/code/replay.mjs';
// Admission uses E070's independent proof replay, never its detector.
export function verifyOutpost(i,o){
  assert.deepEqual(Object.keys(o).sort(),['events','nodes','refutation','status']);
  const c=new Chess(i.history.fen);for(const m of i.history.moves)c.move(m);const played=c.move(i.move),rank=played.color==='w'?+played.to[1]:9-+played.to[1];let nodes=2+i.history.moves.length,status='ineligible',captures=0;
  if(played.piece==='n'&&rank>=4&&rank<=6&&!c.isGameOver()){
    nodes++;let counter;try{const changed=new Chess(c.fen());changed.remove(played.to);changed.put({type:'n',color:played.color==='w'?'b':'w'},played.to);const fields=changed.fen().split(' ');fields[1]=played.color;fields[3]='-';counter=legalPosition(fields.join(' '));if(counter.isGameOver())counter=null;}catch{counter=null;}
    if(counter)captures=counter.moves({verbose:true}).filter(m=>m.piece==='p'&&m.to===played.to&&m.captured==='n').length;
    nodes+=captures;status=captures?'graph-required':'no-legal-support';
    if(captures){
      if(o.status==='pawn-challenge-refuted'){
        const result=replayRefutation(i,{outpostAnalysis:{status:o.status,refutation:o.refutation}});assert.ok(result.witnesses>0);status='pawn-challenge-refuted';nodes+=o.refutation.graphs.reduce((n,g)=>n+g.nodes.length+g.edges.length,0);
      }else{
        assert.equal(o.status,'proven');assert.deepEqual(o.events.map(e=>e.id),['knight-outpost-proof',...(rank===6?['advanced-knight-outpost']:[])]);
        let verified;for(const event of o.events)verified=replay(i,event);assert.equal(verified.supportCaptures,captures);nodes+=verified.pawnGraphNodes+verified.pawnGraphEdges+verified.replies;status='proven';
      }
    }
  }
  assert.equal(o.status,status);assert.equal(o.nodes,nodes);if(status!=='proven')assert.deepEqual(o.events,[]);if(status!=='pawn-challenge-refuted')assert.equal(o.refutation,null);return nodes;
}

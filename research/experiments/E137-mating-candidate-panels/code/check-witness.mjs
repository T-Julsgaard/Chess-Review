import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const code=m=>m.from+m.to+(m.promotion||'');
export function checkAssessment(a,c,winner,bound){
  assert.equal(a.rootFen,c.fen());assert.equal(a.winner,winner);assert.equal(a.bound,bound);assert.ok(a.queries.length>=1&&a.queries.length<=bound+1);let claims=0;
  function scan(n){if(n.kind==='draw'){claims+=Number(c.isDrawByFiftyMoves()||c.isThreefoldRepetition());return;}if(['mate','limit'].includes(n.kind))return;for(const b of n.child?[{move:n.move,child:n.child}]:n.branches){c.move(b.move);try{scan(b.child);}finally{c.undo();}}}
  for(const [i,q]of a.queries.entries()){assert.equal(q.winner,winner);assert.equal(q.rootFen,a.rootFen);assert.equal(q.plies,i);replayQuery(c,q);if(i<a.queries.length-1)assert.equal(q.tree.win,false);assert.equal(claims,0);scan(q.tree);}
  assert.equal(a.claimLeaves,claims);if(claims){assert.equal(a.status,'claim-rule-prerequisite');assert.equal(a.distance,null);return;}
  if(a.distance!==null){assert.equal(a.distance,a.queries.length-1);assert.equal(a.status,'proven');assert.equal(a.queries.at(-1).tree.win,true);return;}
  assert.equal(a.queries.at(-1).tree.win,false);if(c.isGameOver()){assert.equal(a.status,'terminal-without-mate');assert.equal(a.queries.length,1);}else{assert.equal(a.status,'unresolved-within-bound');assert.equal(a.queries.length,bound+1);}
}
export function checkWitness(w,result,input){
  assert.equal(w.experiment,'E137');assert.deepEqual(w.history,input.history??null);const c=legalPosition(w.history?.fen||input.fen);for(const move of w.history?.moves||[]){assert.equal(c.isGameOver(),false);c.move(move);}assert.equal(c.fen(),legalPosition(input.fen).fen());assert.equal(w.before,c.fen());assert.equal(w.actor,c.turn());assert.equal(c.isGameOver(),false);
  const m=c.move(input.move);assert.equal(w.played,code(m));assert.equal(w.san,m.san);assert.equal(w.after,c.fen());assert.equal(result.after,w.after);c.undo();const legal=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),H=input.candidateMatePlies??2,events=result.events.filter(e=>e.evidence?.experiment==='E137');assert.deepEqual(w.moves,legal.map(code));
  const candidateClaim=w.claimContext?.kind==='candidate';assert.deepEqual(w.candidates.map(r=>r.move),w.moves.slice(0,w.candidates.length));assert.ok(w.candidates.length>0);if(!candidateClaim)assert.equal(w.candidates.length,legal.length);
  for(const [i,row]of w.candidates.entries()){const option=legal[i];assert.equal(row.san,option.san);c.move(row.move);assert.equal(row.after,c.fen());checkAssessment(row.assessment,c,w.actor,H);c.undo();assert.equal(row.assessment.claimLeaves>0,candidateClaim&&i===w.candidates.length-1);}
  if(candidateClaim){assert.deepEqual(w.claimContext,{kind:'candidate',index:w.candidates.length-1});assert.equal(w.fastest,null);assert.deepEqual(w.best,[]);assert.deepEqual(w.eliminated,[]);assert.deepEqual(w.variation,[]);assert.equal(result.candidatePanelAnalysis.status,'claim-rule-prerequisite');assert.deepEqual(events,[]);return;}
  const wins=w.candidates.filter(r=>r.assessment.distance!==null);if(!wins.length){assert.equal(w.fastest,null);assert.deepEqual(w.best,[]);assert.deepEqual(w.eliminated,[]);assert.deepEqual(w.variation,[]);assert.equal(w.claimContext,null);assert.equal(result.candidatePanelAnalysis.status,'no-certified-mating-candidate');assert.deepEqual(events,[]);return;}
  const fastest=Math.min(...wins.map(r=>r.assessment.distance));assert.equal(w.fastest,fastest);assert.deepEqual(w.best,wins.filter(r=>r.assessment.distance===fastest).map(r=>r.move));assert.deepEqual(w.eliminated,w.moves.filter(move=>!w.best.includes(move)));
  const actual=w.candidates.find(r=>r.move===w.played),D=actual.assessment.distance;c.move(w.played);
  if(D===null){assert.deepEqual(w.variation,[]);assert.equal(w.claimContext,null);}
  else {
    assert.ok(w.variation.length>0);assert.deepEqual(w.variation[0].assessment,actual.assessment);
    for(const [i,s]of w.variation.entries()){
      assert.equal(s.fen,c.fen());assert.equal(s.turn,c.turn());assert.equal(s.distance,D-i);checkAssessment(s.assessment,c,w.actor,i===0?H:w.variation[i-1].distance-1);assert.equal(s.assessment.distance,s.distance);assert.equal(s.assessment.claimLeaves,0);
      if(s.distance===0){assert.equal(i,w.variation.length-1);assert.equal(c.isCheckmate(),true);assert.notEqual(c.turn(),w.actor);assert.deepEqual(s.defenses,[]);assert.deepEqual(s.bestReplies,[]);assert.equal(s.move,null);assert.equal(s.san,null);assert.equal(s.after,null);continue;}
      let chosen;
      if(c.turn()===w.actor){assert.deepEqual(s.defenses,[]);assert.deepEqual(s.bestReplies,[]);chosen=s.assessment.queries.at(-1).tree.move;}
      else {
        const replies=c.moves({verbose:true}).sort((a,b)=>code(a).localeCompare(code(b))),partial=w.claimContext?.kind==='variation'&&w.claimContext.step===i;
        assert.deepEqual(s.defenses.map(r=>r.move),replies.slice(0,s.defenses.length).map(code));if(!partial)assert.equal(s.defenses.length,replies.length);
        for(const [j,r]of s.defenses.entries()){assert.equal(r.san,replies[j].san);c.move(r.move);assert.equal(r.after,c.fen());checkAssessment(r.assessment,c,w.actor,s.distance-1);c.undo();if(partial&&j===s.defenses.length-1){assert.ok(r.assessment.claimLeaves>0);assert.deepEqual(w.claimContext,{kind:'variation',step:i,defense:j});assert.equal(i,w.variation.length-1);assert.equal(s.move,null);assert.equal(s.san,null);assert.equal(s.after,null);assert.deepEqual(s.bestReplies,[]);assert.equal(result.candidatePanelAnalysis.status,'claim-rule-prerequisite');assert.deepEqual(events,[]);return;}assert.equal(r.assessment.claimLeaves,0);assert.notEqual(r.assessment.distance,null);}
        const longest=Math.max(...s.defenses.map(r=>r.assessment.distance));assert.equal(longest,s.distance-1);assert.deepEqual(s.bestReplies,s.defenses.filter(r=>r.assessment.distance===longest).map(r=>r.move));chosen=s.bestReplies[0];
      }
      assert.equal(s.move,chosen);const stepMove=c.move(s.move);assert.equal(s.san,stepMove.san);assert.equal(s.after,c.fen());
    }
    assert.equal(w.variation.length,D+1);assert.equal(w.claimContext,null);
  }
  assert.equal(result.candidatePanelAnalysis.status,'proven');const ids=['mating-candidate-comparison',...(w.eliminated.length?['shortest-mate-filter']:[]),...(D!==null&&D>0?['longest-mating-defense']:[]),...(D!==null?['mating-principal-variation']:[])];assert.deepEqual(events.map(e=>e.id),ids);
  const best=w.candidates.find(r=>r.move===w.best[0]),total=w.moves.length,root=w.variation[0],line=w.variation.filter(s=>s.move).map(s=>s.san).join(' '),texts={'mating-candidate-comparison':`Fastest certified mate: ${best.san}; ${fastest} plies remain after it. All ${total} legal candidates were checked.`,'shortest-mate-filter':`Shortest-mate filter: ${w.best.length} of ${total} legal candidates meet the ${fastest}-ply continuation bound; the others have complete refutations.`,'mating-principal-variation':line?`Mating principal variation: ${line}. Shortest mating moves and longest defenses end in checkmate after ${root.distance} plies.`:'Mating principal variation: the actual move already delivered checkmate; zero plies remain.'};if(root?.distance>0)texts['longest-mating-defense']=`Longest mating defense: ${root.defenses.find(r=>r.move===root.move).san} leaves ${root.distance-1} plies; every legal reply has a verified mate-distance bound.`;
  for(const e of events){assert.equal(e.qualityClaim,false);assert.equal(e.text,texts[e.id]);assert.deepEqual(e.evidence,{experiment:'E137',before:w.before,after:w.after,detail:{source:'candidatePanelAnalysis.witness'}});}
}

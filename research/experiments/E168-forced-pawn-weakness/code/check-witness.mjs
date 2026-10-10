import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {verifyPanel} from './verify-panel.mjs';
const eq=(a,b)=>assert.ok(isDeepStrictEqual(a,b),'Altered weakness witness');
export function checkWitness(input,result){
  const a=result.forcedWeaknessAnalysis,w=a.witness,H=input.weaknessMatePlies===undefined?2:input.weaknessMatePlies,p=w.panel,checked=verifyPanel(input,H,p);
  let work=1,claim=checked.claim;
  const branches=p.variants.map(v=>v.replies.map(r=>{work++;const winningCaptures=[];for(const c of r.captures){work++;if(c.query.tree.win)winningCaptures.push(c.played.move);}return{reply:r.played.move,pawnDefense:r.played.piece==='p',targetPresent:r.targetPresent,live:!Object.values(r.state.flags).some(Boolean),isolated:r.targetPresent&&r.adjacent.length===0,winningCaptures};}));
  const escapes=branches[1].filter(r=>r.live&&r.targetPresent&&!r.isolated&&r.winningCaptures.length===0).map(r=>r.reply),success=!claim&&branches[0].length>0&&branches[0].every(r=>r.live&&r.pawnDefense&&r.isolated&&r.winningCaptures.length>0)&&escapes.length>0;
  const forced=success?{target:input.weaknessPawn,replies:branches[0].map(r=>r.reply),quiet:input.weaknessQuiet,escapes}:null;
  eq(w,{experiment:'E168',before:p.root.fen,after:p.variants[0].state.fen,panel:p,work,branches,claim,forced});
  assert.equal(a.nodes,3+input.history.moves.length+checked.nodes+work);assert.equal(a.plies,H);assert.equal(a.limit,input.maxForcedWeaknessNodes===undefined?50000:input.maxForcedWeaknessNodes);assert.equal(a.status,success?'proven':claim?'claim-rule-prerequisite':'compared');assert.equal(result.before,w.before);assert.equal(result.after,w.after);
  eq(result.events.filter(e=>e.evidence?.experiment==='E168'),success?[{id:'forced-new-isolated-pawn-exploitation',text:'Forcing a weakness: every defense isolates this pawn and permits a capture leading to forced mate; the quiet alternative allows escape.',qualityClaim:false,evidence:{experiment:'E168',before:w.before,after:w.after,detail:{source:'forcedWeaknessAnalysis.witness'}}}]:[]);
  return true;
}

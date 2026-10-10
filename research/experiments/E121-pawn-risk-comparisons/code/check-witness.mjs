import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {checkWitness as checkChoices} from '../../E104-defensive-mate-choice-policies/code/check-witness.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
export function checkWitness(w,result,input) {
  const a = result.pawnRiskAnalysis,d = result.defenseChoiceAnalysis,x = d.witness,H = d.plies;
  assert.equal(a.limit,input.maxPawnRiskNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E121'); checkChoices(x,result,{...input,defenseChoiceTags:true});
  assert.equal(w.before,x.before); assert.equal(w.after,x.after); assert.equal(w.actor,x.actor); assert.deepEqual(w.history,x.history);
  assert.equal(w.actualIndex,x.actualIndex); assert.equal(w.alternativeIndex,x.safe[0]); assert.ok(x.safe.length); assert.ok(x.rows[x.actualIndex].proof.tree.win);
  const c = legalPosition(x.after),m = x.played;
  assert.ok(c.board().flat().filter(Boolean).length+(m.captured ? 1 : 0) <= 10);
  const rank = x.actor === 'w' ? +m.to[1] : 9-+m.to[1],grabbing = m.piece !== 'k' && m.captured === 'p';
  const advanced = m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0] && rank >= 4 && x.before.split(' ')[2] === '-' && x.after.split(' ')[2] === '-';
  assert.equal(w.rank,rank); assert.equal(w.grabbing,grabbing); assert.equal(w.advanced,advanced); assert.ok(grabbing || advanced);
  const audit = (p,proof) => { assert.equal(proof.winner,x.enemy); assert.equal(proof.plies,H); return replayQuery(p,proof).win; };
  const fresh = audit(c,w.fresh); let restoredFails = false;
  if (advanced && fresh) {
    c.remove(m.to); c.put({type:'p',color:x.actor},m.from); const fields = c.fen().split(' '); fields[3] = '-';
    assert.ok(w.restored); assert.equal(w.restored.fen,fields.join(' ')); let p;
    try { p = legalPosition(w.restored.fen); } catch { /* Independent legal-frame refusal. */ }
    assert.equal(w.restored.legal,!!p); if (p) restoredFails = !audit(p,w.restored.proof); else assert.equal(w.restored.proof,null);
  } else assert.equal(w.restored,null);
  const expected = [],other = x.rows[x.safe[0]].move.san;
  const add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E121',before:x.before,after:x.after,detail:{source:'pawnRiskAnalysis.witness'}}});
  if (fresh && grabbing) add('pawn-capture-allows-proved-mate',`Pawn capture: ${m.san} allows forced enemy mate within ${H} plies; ${other} instead has a complete avoidance policy at that same bound.`);
  if (fresh && restoredFails) add('causal-pawn-overextension-mate',`Pawn overextension: ${m.san} allows enemy mate within ${H} plies; restoring only that pawn stops it, and ${other} avoids that bounded mate.`);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E121'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

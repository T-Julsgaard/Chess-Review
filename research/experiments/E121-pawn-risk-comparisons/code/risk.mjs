import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E120-mating-move-order/code/order.mjs';
export const priority = e => e.evidence?.experiment === 'E121' ? 190 : inherited(e);
export function explainMove(input) {
  const enabled = input.pawnRiskTags === undefined ? false : input.pawnRiskTags;
  if (typeof enabled !== 'boolean') throw Error('pawnRiskTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxPawnRiskNodes === undefined ? 50000 : input.maxPawnRiskNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPawnRiskNodes must be integer0..50000');
  if (input.defenseChoiceTags !== undefined && input.defenseChoiceTags !== true) throw Error('pawnRiskTags requires defenseChoiceTags true or omitted');
  const base = parent({...input,defenseChoiceTags:true}); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('pawn-risk-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E121-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    pawnRiskAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const d = base.defenseChoiceAnalysis,w = d.witness;
    if (!w || !w.rows[w.actualIndex].proof.tree.win || !w.safe.length) { status = 'no-relative-mate-loss'; return done(); }
    const c = legalPosition(w.after),m = w.played,H = d.plies;
    if (c.board().flat().filter(Boolean).length+(m.captured ? 1 : 0) > 10) { status = 'not-applicable'; return done(); }
    const grabbing = m.piece !== 'k' && m.captured === 'p',rank = w.actor === 'w' ? +m.to[1] : 9-+m.to[1];
    const advanced = m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0] && rank >= 4 && w.before.split(' ')[2] === '-' && w.after.split(' ')[2] === '-';
    if (!grabbing && !advanced) { status = 'not-pawn-risk'; return done(); }
    witness = {experiment:'E121',before:w.before,after:w.after,actor:w.actor,history:w.history,
      actualIndex:w.actualIndex,alternativeIndex:w.safe[0],grabbing,advanced,rank,fresh:query(c,w.enemy,H,budget),restored:null};
    if (!witness.fresh.tree.win) return done();
    if (advanced) {
      tick(); c.remove(m.to); c.put({type:'p',color:w.actor},m.from); const fields = c.fen().split(' '); fields[3] = '-'; let p;
      try { p = legalPosition(fields.join(' ')); } catch { /* Illegal restoration proves no causal exposure. */ }
      witness.restored = {fen:fields.join(' '),legal:!!p,proof:p ? query(p,w.enemy,H,budget) : null};
    }
    const extra = [],other = w.rows[w.safe[0]].move.san,add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E121',before:w.before,after:w.after,detail:{source:'pawnRiskAnalysis.witness'}}}); };
    if (grabbing) add('pawn-capture-allows-proved-mate',`Pawn capture: ${m.san} allows forced enemy mate within ${H} plies; ${other} instead has a complete avoidance policy at that same bound.`);
    if (witness.restored?.legal && !witness.restored.proof.tree.win) add('causal-pawn-overextension-mate',`Pawn overextension: ${m.san} allows enemy mate within ${H} plies; restoring only that pawn stops it, and ${other} avoids that bounded mate.`);
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'pawn-risk-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

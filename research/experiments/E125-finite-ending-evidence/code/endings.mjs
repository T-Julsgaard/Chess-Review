import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {conversionQuery} from '../../E106-ending-conversion-policies/code/policy.mjs';
import {explainMove as parent,priority as inherited} from '../../E124-both-wing-capture-policy/code/wings.mjs';
const units = c => c.board().flat().filter(Boolean);
export const priority = e => e.evidence?.experiment === 'E125' ? 180 : inherited(e);
export function explainMove(input) {
  const enabled = input.endingEvidenceTags === undefined ? false : input.endingEvidenceTags;
  if (typeof enabled !== 'boolean') throw Error('endingEvidenceTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxEndingEvidenceNodes === undefined ? 50000 : input.maxEndingEvidenceNodes;
  const plies = input.endingPlies === undefined ? 4 : input.endingPlies;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxEndingEvidenceNodes must be integer0..50000');
  if (!Number.isSafeInteger(plies) || plies < 0 || plies > 6) throw Error('endingPlies must be integer0..6');
  if (input.bothWingTags !== undefined && input.bothWingTags !== true) throw Error('endingEvidenceTags requires bothWingTags');
  const base = parent({...input,bothWingTags:true}); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('ending-evidence-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E125-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    endingEvidenceAnalysis:{limit,plies,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const move of h?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = units(c),pre = legalPosition(before),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent ending differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.captured || m.promotion) { status = 'not-quiet'; return done(); }
    witness = {experiment:'E125',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),fork:null,conversion:null};
    const sparse = !old.some(p => p.type === 'q') && ['w','b'].every(color => old.filter(p => p.color === color && !['k','p'].includes(p.type)).length <= 2 && old.filter(p => p.color === color && p.type === 'p').length <= 2);
    const policy = base.bothWingAnalysis.witness?.actual;
    if (m.piece === 'n' && sparse && policy) {
      tick(); const targets = units(c).filter(p => p.color !== actor && !['k','p'].includes(p.type) && /^[a-cf-h]/.test(p.square) && c.attackers(p.square,actor).includes(m.to) && !pre.attackers(p.square,actor).includes(m.from)).map(p => p.square).sort();
      if (targets.length >= 2) {
        const selections = policy.branches.map(row => row.captures.findIndex(t => t.move.slice(0,2) === m.to && targets.includes(t.victim) && t.proof && t.net > 0));
        witness.fork = {targets,selections,success:policy.branches.length === policy.moves.length && selections.every(i => i >= 0)};
      }
    }
    const ownPawns = old.filter(p => p.color === actor && p.type === 'p');
    if (['k','p'].includes(m.piece) && ownPawns.length === 1 && old.every(p => ['k','p'].includes(p.type)) && old.filter(p => p.color !== actor && p.type === 'p').length <= 1) {
      const pawn = ownPawns[0].square,tracked = m.from === pawn ? m.to : pawn,queries = [],cache = new Map();
      const query = bound => { if (!cache.has(bound)) { const proof = conversionQuery(c,actor,tracked,bound,{tick},before); cache.set(bound,proof); queries.push(proof); } return cache.get(bound).win; };
      let minimum = null;
      if (query(plies)) { let lo = 0,hi = plies; while (lo < hi) { const mid = Math.floor((lo+hi)/2); if (query(mid)) hi = mid; else lo = mid+1; } minimum = lo; query(lo); if (lo) query(lo-1); }
      witness.conversion = {pawn,tracked,queries,minimum};
    }
    const additions = [];
    if (witness.fork?.success) additions.push(['ending-knight-fork',`Ending fork: ${m.san} newly attacks two pieces; every defense permits this knight a certified net gain by capturing an original target.`]);
    if (witness.conversion && witness.conversion.minimum !== null) additions.push(['bounded-conversion-tempo-count',`Tempo count: after ${m.san}, the smallest successful bound is ${witness.conversion.minimum} further plies for mate or a surviving queen against every defense.`]);
    if (additions.length) { tick(); events = [...base.events,...additions.map(([id,text]) => { if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); return {id,text,qualityClaim:false,evidence:{experiment:'E125',before,after,detail:{source:'endingEvidenceAnalysis.witness'}}}; })]; status = 'proven'; }
  } catch (e) { if (e.message !== 'ending-evidence-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E125-finite-ending-evidence/code/endings.mjs';
import {lossQuery} from './loss-policy.mjs';
const units = c => c.board().flat().filter(Boolean);
const adjacent = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(Number(a[1])-Number(b[1]))) === 1;
function paired(c) {
  const all = units(c),kings = Object.fromEntries(['w','b'].map(color => [color,all.find(p => p.type === 'k' && p.color === color).square]));
  const pairs = all.filter(p => p.type === 'p' && p.color === 'w').map(p => ({w:p.square,b:p.square[0]+(Number(p.square[1])+1),kings})).filter(pair => c.get(pair.b)?.type === 'p' && c.get(pair.b).color === 'b' && Object.values(kings).every(k => adjacent(k,pair.w) && adjacent(k,pair.b)));
  return pairs.length === 1 ? pairs[0] : null;
}
export const priority = e => e.evidence?.experiment === 'E126' ? 181 : inherited(e);
export function explainMove(input) {
  const enabled = input.reserveTempoTags === undefined ? false : input.reserveTempoTags;
  if (typeof enabled !== 'boolean') throw Error('reserveTempoTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxReserveTempoNodes === undefined ? 50000 : input.maxReserveTempoNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxReserveTempoNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('reserve-tempo-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E126-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    reserveTempoAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const move of h?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = units(c);
    if (old.length > 6 || old.some(p => !['k','p'].includes(p.type)) || before.split(' ')[2] !== '-') { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent reserve tempo differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.captured || m.promotion) { status = 'not-quiet'; return done(); }
    const pair = paired(c); if (!pair) { status = 'no-pair'; return done(); }
    const kind = m.piece === 'k' && old.length === 4 ? 'trebuchet' : m.piece === 'p' && m.from !== pair[actor] ? 'reserve' : null;
    if (!kind) { status = 'not-applicable'; return done(); }
    witness = {experiment:'E126',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),kind,pair,
      actual:lossQuery(c,pair[c.turn()],'all',budget),opposite:null,kingAlternatives:null};
    if (!witness.actual.success) return done();
    let success = false;
    if (kind === 'trebuchet') {
      tick(); const fields = after.split(' '); fields[1] = actor; fields[3] = '-'; let other;
      try { other = legalPosition(fields.join(' ')); } catch { /* No reciprocal claim from an illegal frame. */ }
      witness.opposite = {fen:fields.join(' '),legal:!!other,terminal:other ? other.isGameOver() : null,policy:other && !other.isGameOver() ? lossQuery(other,pair[actor],'all',budget) : null};
      success = !!witness.opposite.policy?.success;
    } else {
      c.undo(); const originalPair = paired(c);
      if (JSON.stringify(originalPair) !== JSON.stringify(pair)) throw Error('Reserve pawn changed central pair');
      witness.kingAlternatives = lossQuery(c,pair[actor],'king',budget); success = witness.kingAlternatives.success; c.move(input.move);
    }
    if (success) {
      tick(); const id = kind === 'trebuchet' ? 'reciprocal-trebuchet-pawn-loss' : 'certified-reserve-pawn-tempo';
      const text = kind === 'trebuchet' ? `Trebuchet pattern: after ${m.san}, every legal move loses the blocked pawn to a certified king capture, for either side to move.` : `Reserve tempo: ${m.san} preserves the king-and-pawn guards; every defense loses its blocked pawn, whereas every prior king alternative loses yours.`;
      if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
      events = [...base.events,{id,text,qualityClaim:false,evidence:{experiment:'E126',before,after,detail:{source:'reserveTempoAnalysis.witness'}}}]; status = 'proven';
    }
  } catch (e) { if (e.message !== 'reserve-tempo-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

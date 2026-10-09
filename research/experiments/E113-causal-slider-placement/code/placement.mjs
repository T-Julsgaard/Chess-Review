import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E112-pawn-tempi-tension/code/tempi.mjs';
const center = new Set(['d4','e4','d5','e5']);
export const priority = e => e.evidence?.experiment === 'E113' ? 173 : inherited(e);
export function explainMove(input) {
  const enabled = input.sliderPlacementTags === undefined ? false : input.sliderPlacementTags;
  if (typeof enabled !== 'boolean') throw Error('sliderPlacementTags must be boolean');
  if (!enabled) return parent(input);
  const H = input.sliderPlacementPlies === undefined ? 2 : input.sliderPlacementPlies;
  const limit = input.maxSliderPlacementNodes === undefined ? 50000 : input.maxSliderPlacementNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 4) throw Error('sliderPlacementPlies must be integer0..4');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxSliderPlacementNodes must be integer0..50000');
  const base = parent(input);
  let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const budget = {tick() { if (++nodes > limit) throw Error('slider-placement-budget'); }};
  const done = () => ({...base,schema:'coach-concepts-E113-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    sliderPlacementAnalysis:{plies:H,limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return done();
  }
  try {
    budget.tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { budget.tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn();
    if (before.split(' ')[2] !== '-' || c.board().flat().filter(Boolean).length > 10) {
      status = 'not-applicable'; return done();
    }
    const m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent slider placement differs');
    const rank = actor === 'w' ? +m.to[1] : 9-+m.to[1];
    const rook = m.piece === 'r' && m.from[1] === m.to[1] && m.from[0] !== m.to[0] && [3,4].includes(rank);
    const queen = m.piece === 'q' && !center.has(m.from) && center.has(m.to);
    if (m.captured || m.promotion || !rook && !queen) { status = 'not-slider-entry'; return done(); }
    const run = c => query(c,actor,H,budget);
    witness = {experiment:'E113',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san},rank,rook,queen,
      inventory:c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square)),
      actual:run(c),freshActual:null,restored:null};
    if (!witness.actual.tree.win) return done();
    witness.freshActual = run(legalPosition(after));
    if (!witness.freshActual.tree.win) return done();
    const changed = legalPosition(after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
    const fields = changed.fen().split(' '); fields[3] = '-';
    let restored;
    try { restored = legalPosition(fields.join(' ')); }
    catch { witness.restored = {legal:false,fen:fields.join(' '),proof:null}; return done(); }
    witness.restored = {legal:true,fen:restored.fen(),proof:run(restored)};
    if (witness.restored.proof.tree.win) return done();
    budget.tick();
    const id = rook ? 'causal-rook-lift-mate' : 'causal-queen-centralization-mate';
    const text = rook
      ? `Rook lift: ${m.san} transfers your rook across rank ${m.to[1]} and permits this ${H}-ply mate; restoring only its old square stops it.`
      : `Queen centralization: ${m.san} enters ${m.to} and permits this ${H}-ply mate; restoring only your queen to ${m.from} stops that complete policy.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
    events = [...base.events,{id,text,qualityClaim:false,evidence:{experiment:'E113',before,after,detail:{source:'sliderPlacementAnalysis.witness'}}}];
    status = 'proven';
  } catch (e) {
    if (e.message !== 'slider-placement-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

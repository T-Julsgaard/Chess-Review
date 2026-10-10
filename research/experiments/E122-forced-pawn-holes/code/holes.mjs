import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E121-pawn-risk-comparisons/code/risk.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
export const priority = e => e.evidence?.experiment === 'E122' ? 177 : inherited(e);
export function explainMove(input) {
  const enabled = input.forcedPawnTags === undefined ? false : input.forcedPawnTags;
  if (typeof enabled !== 'boolean') throw Error('forcedPawnTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxForcedPawnNodes === undefined ? 50000 : input.maxForcedPawnNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxForcedPawnNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('forced-pawn-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E122-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    forcedPawnAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent forced pawn differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.captured || m.promotion || ['p','k'].includes(m.piece) || before.split(' ')[2] !== '-' || after.split(' ')[2] !== '-') { status = 'not-quiet-piece'; return done(); }
    tick(); const replies = ordered(c),army = units(c),changed = legalPosition(after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
    const fields = changed.fen().split(' '); fields[3] = '-'; let restored;
    try { restored = legalPosition(fields.join(' ')); } catch { /* Illegal restoration cannot establish causation. */ }
    tick(); const restoredMoves = restored ? ordered(restored).map(x => ({move:uci(x),piece:x.piece})) : [];
    const forced = replies.length > 0 && replies.every(x => x.piece === 'p') && !!restored && restoredMoves.some(x => x.piece !== 'p');
    witness = {experiment:'E122',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san},inventory:army,
      replies:replies.map(x => ({move:uci(x),piece:x.piece})),restored:{fen:fields.join(' '),legal:!!restored,moves:restoredMoves},forced,
      targets:[],knights:[],trials:[],selected:null};
    if (!forced) return done();
    const targets = []; for (const file of 'cdefgh') for (let rank = 3; rank <= 6; rank++) if (!c.get(file+rank)) targets.push(file+rank);
    const knights = army.filter(p => p.color === actor && p.type === 'n'); witness.targets = targets; witness.knights = knights;
    search: for (const target of targets) for (const knight of knights) {
      const trial = {target,knight:knight.square,branches:[],success:true}; witness.trials.push(trial);
      for (const reply of replies) {
        tick(); const abandoned = c.attackers(target,c.turn()).includes(reply.from); c.move(reply);
        try {
          const pawns = units(c).filter(p => p.type === 'p' && p.color !== actor),permanent = pawns.every(p => p.color === 'b' ? +p.square[1] <= +target[1] : +p.square[1] >= +target[1]);
          const terminal = c.isGameOver(),empty = !c.get(target),entry = !terminal && empty && abandoned && permanent ? ordered(c).find(x => x.from === knight.square && x.to === target && !x.captured) : null;
          const row = {reply:uci(reply),fen:c.fen(),abandoned,pawns,permanent,terminal,empty,entry:entry ? uci(entry) : null,post:null,responses:[],safe:false}; trial.branches.push(row);
          if (entry) {
            tick(); c.move(entry);
            try { row.post = c.fen(); row.responses = ordered(c).map(x => ({move:uci(x),victim:victim(x)})); row.safe = !c.isGameOver() && row.responses.every(x => x.victim !== target); }
            finally { c.undo(); }
          }
          if (!row.safe) { trial.success = false; break; }
        } finally { c.undo(); }
      }
      if (trial.success) { witness.selected = witness.trials.length-1; break search; }
    }
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E122',before,after,detail:{source:'forcedPawnAnalysis.witness'}}}); };
    add('causal-forced-pawn-response',`Induced pawn move: after ${m.san}, every legal reply moves a pawn; restoring only your moved piece permits a nonpawn reply.`);
    if (witness.selected !== null) add('forced-irreversible-pawn-hole',`Permanent pawn hole: every reply abandons ${witness.trials[witness.selected].target}, beyond all remaining enemy pawns' future attacks; your knight can enter without immediate capture.`);
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) {
    if (e.message !== 'forced-pawn-budget') throw e;
    witness = null; events = base.events; status = 'exhausted';
  }
  return done();
}

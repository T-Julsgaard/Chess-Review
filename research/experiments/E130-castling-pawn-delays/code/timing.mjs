import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E129-knight-tempo-parity/code/knight.mjs';
const isCastle = m => m.isKingsideCastle() || m.isQueensideCastle();
const record = m => ({move:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,castle:isCastle(m)});
const quietPawn = m => m.piece === 'p' && !m.captured && !m.promotion;
function panel(c,tick) {
  tick(); const fen = c.fen(),terminal = c.isGameOver(),rows = [];
  for (const m of c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)))) {
    tick(); c.move(uci(m)); rows.push({move:uci(m),after:c.fen(),mate:c.isCheckmate(),draw:c.isDraw()}); c.undo();
  }
  return {fen,terminal,rows,mates:terminal ? [] : rows.filter(r => r.mate).map(r => r.move)};
}
export const priority = e => e.evidence?.experiment === 'E130' ? 191 : inherited(e);
export function explainMove(input) {
  const enabled = input.castlingTimingTags === undefined ? false : input.castlingTimingTags;
  if (typeof enabled !== 'boolean') throw Error('castlingTimingTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxCastlingTimingNodes === undefined ? 50000 : input.maxCastlingTimingNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxCastlingTimingNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('castling-timing-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E130-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    castlingTimingAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const move of h?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),rootMoves = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b))),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent castling timing differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (!isCastle(m) && !quietPawn(m)) { status = 'not-castle-or-quiet-pawn'; return done(); }
    const early = !!h && h.start === DEFAULT_POSITION && h.moves.length <= 20;
    if (isCastle(m) && !early) { status = 'opening-history-unavailable'; return done(); }
    const fields = before.split(' '); fields[1] = actor === 'w' ? 'b' : 'w'; fields[3] = '-'; let priorBoard;
    try { priorBoard = legalPosition(fields.join(' ')); } catch { status = 'illegal-prior-frame'; return done(); }
    const prior = panel(priorBoard,tick);
    if (prior.terminal || !prior.mates.length) { status = 'no-prior-mate'; return done(); }
    const actual = panel(c,tick),alternatives = [];
    c.undo();
    for (const alt of rootMoves.filter(x => isCastle(x) || quietPawn(x))) {
      tick(); c.move(uci(alt)); alternatives.push({played:record(alt),panel:panel(c,tick)}); c.undo();
    }
    const safeCastles = alternatives.map((r,i) => ({r,i})).filter(({r}) => r.played.castle && !r.panel.terminal && !r.panel.mates.length).map(({i}) => i);
    const pawnDelays = alternatives.map((r,i) => ({r,i})).filter(({r}) => !r.played.castle && !r.panel.terminal && prior.mates.some(x => r.panel.mates.includes(x))).map(({i}) => i);
    const common = prior.mates.filter(x => actual.mates.includes(x)); let restored = null,ids = [];
    if (isCastle(m)) {
      if (!actual.terminal && !actual.mates.length && pawnDelays.length) ids = ['early-castle-removes-immediate-mate'];
    } else if (common.length && safeCastles.length) {
      const r = legalPosition(after); r.remove(m.to); r.put({type:'p',color:actor},m.from); const rf = r.fen().split(' '); rf[3] = '-'; let restoredBoard;
      try { restoredBoard = legalPosition(rf.join(' ')); } catch { /* No causal claim from illegal restoration. */ }
      if (restoredBoard) restored = panel(restoredBoard,tick);
      if (restored && !restored.terminal && common.some(x => restored.mates.includes(x))) ids = [...(early ? ['opening-pawn-delay-retains-mate'] : []),'pawn-delay-retains-avoidable-mate'];
    }
    if (!ids.length) return done();
    witness = {experiment:'E130',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:record(m),early,openingPriorPlyLimit:20,
      rootMoves:rootMoves.map(record),prior,actual,alternatives,safeCastles,pawnDelays,common,restored,ids};
    const castle = safeCastles.length ? alternatives[safeCastles[0]].played.san : m.san;
    const texts = {
      'early-castle-removes-immediate-mate':`Early castling: ${m.san} removes every immediate mate; a legal pawn delay leaves a pre-existing mate available.`,
      'opening-pawn-delay-retains-mate':`Opening pawn delay: ${m.san} leaves a pre-existing immediate mate; ${castle} instead removes every next-move mate.`,
      'pawn-delay-retains-avoidable-mate':`Pawn delay: ${m.san} leaves a pre-existing immediate mate; ${castle} instead removes every next-move mate.`,
    };
    const extra = ids.map(id => { tick(); const text = texts[id]; if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); return {id,text,qualityClaim:false,evidence:{experiment:'E130',before,after,detail:{source:'castlingTimingAnalysis.witness'}}}; });
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) { if (e.message !== 'castling-timing-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

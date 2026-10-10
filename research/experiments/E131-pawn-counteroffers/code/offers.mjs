import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E130-castling-pawn-delays/code/timing.mjs';
const rec = m => ({move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((s,p) => s+VALUES[p.type]*(p.color === color ? 1 : -1),0);
const quietPawn = m => m.piece === 'p' && !m.captured && !m.promotion;
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
function panel(c,offer,beforeOffer,tick) {
  tick(); const root = c.fen(),capturer = c.turn(),baseline = balance(legalPosition(beforeOffer),capturer),moves = ordered(c),rows = [];
  for (const m of moves.filter(m => m.piece === 'p' && m.captured === 'p' && victim(m) === offer.to)) {
    tick(); c.move(uci(m)); const after = c.fen(),terminal = c.isGameOver(),gain = balance(c,capturer)-baseline,replies = [];
    for (const r of ordered(c)) {
      tick(); const capturedSquare = victim(r); c.move(uci(r));
      replies.push({reply:rec(r),victim:capturedSquare,after:c.fen(),gain:balance(c,capturer)-baseline,mate:c.isCheckmate(),draw:c.isDraw(),takesAcceptor:capturedSquare === m.to}); c.undo();
    }
    rows.push({capture:rec(m),victim:victim(m),after,terminal,gain,replies,eligible:!terminal && replies.every(r => !r.takesAcceptor)}); c.undo();
  }
  return {root,offer,beforeOffer,capturer,baseline,moves:moves.map(rec),rows,eligible:rows.flatMap((r,i) => r.eligible ? [i] : [])};
}
export const priority = e => e.evidence?.experiment === 'E131' ? e.id === 'retained-pawn-counteroffer' ? 194 : 175 : inherited(e);
export function explainMove(input) {
  const enabled = input.pawnOfferTags === undefined ? false : input.pawnOfferTags;
  if (typeof enabled !== 'boolean') throw Error('pawnOfferTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxPawnOfferNodes === undefined ? 50000 : input.maxPawnOfferNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPawnOfferNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('pawn-offer-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E131-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    pawnOfferAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input);
    if (!h || h.start !== DEFAULT_POSITION || h.moves.length+1 > 20) { status = 'opening-history-unavailable'; return done(); }
    const c = legalPosition(h.start); for (const code of h.moves) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent pawn offers differ');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const current = quietPawn(m) ? panel(c,rec(m),before,tick) : null,last = h.records.at(-1); c.undo();
    const incoming = last && quietPawn(last.move) ? panel(c,rec(last.move),last.before,tick) : null;
    const accepted = incoming ? incoming.eligible.filter(i => incoming.rows[i].capture.move === uci(m)) : [],untaken = !!incoming?.eligible.length && !accepted.length;
    let preserved = null,pair = null;
    if (untaken && current?.eligible.length) {
      const fields = after.split(' '); fields[1] = actor; fields[3] = '-'; let fresh;
      try { fresh = legalPosition(fields.join(' ')); } catch { /* Illegal hypothetical turn cannot prove retention. */ }
      if (fresh && !fresh.isGameOver()) {
        preserved = panel(fresh,incoming.offer,incoming.beforeOffer,tick);
        for (const i of incoming.eligible) {
          const j = preserved.eligible.find(j => preserved.rows[j].capture.move === incoming.rows[i].capture.move);
          if (j !== undefined) { pair = {incoming:i,preserved:j,current:current.eligible[0]}; break; }
        }
      }
    }
    const ids = [...(current?.eligible.length ? ['opening-pawn-concession'] : []),...(accepted.length ? ['accepted-pawn-concession'] : []),...(untaken ? ['untaken-pawn-concession'] : []),...(pair ? ['retained-pawn-counteroffer'] : [])];
    if (!ids.length) return done();
    witness = {experiment:'E131',before,after,actor,history:{fen:h.start,moves:h.moves},played:rec(m),openingActualPlyLimit:20,current,incoming,accepted,untaken,preserved,pair,ids};
    const offered = current?.rows[current.eligible[0]],inc = incoming?.rows[incoming.eligible[0]];
    const texts = {
      'opening-pawn-concession':`Opening pawn offer: ${m.san} permits ${offered?.capture.move}; after that capture, no legal immediate reply captures the accepting pawn.`,
      'accepted-pawn-concession':`Pawn offer accepted: ${m.san} takes the recorded ${incoming?.offer.to} concession; no legal immediate reply captures your accepting pawn.`,
      'untaken-pawn-concession':`Pawn offer untaken: ${m.san} leaves the recorded ${inc?.capture.move} acceptance unplayed.`,
      'retained-pawn-counteroffer':`Pawn counteroffer: ${m.san} leaves ${incoming?.rows[pair?.incoming]?.capture.move} available and offers ${m.to} to ${offered?.capture.move}; both acceptances avoid immediate recapture.`,
    };
    const extra = ids.map(id => { tick(); const text = texts[id]; if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); return {id,text,qualityClaim:false,evidence:{experiment:'E131',before,after,detail:{source:'pawnOfferAnalysis.witness'}}}; });
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) { if (e.message !== 'pawn-offer-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

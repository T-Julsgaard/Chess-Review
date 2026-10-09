import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E113-causal-slider-placement/code/placement.mjs';
const inventory = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const rights = fen => fen.split(' ')[2].replace('-','');
const relative = (square,color) => color === 'w' ? +square[1] : 9-+square[1];
const reflected = p => ({square:p.square[0]+(9-+p.square[1]),type:p.type,color:p.color === 'w' ? 'b' : 'w'});
const key = p => p.square+p.type+p.color;
const unmatched = list => { const keys = new Set(list.map(key)); return list.filter(p => !keys.has(key(reflected(p)))); };
export const priority = e => e.evidence?.experiment === 'E114' ? 5 : inherited(e);
export function explainMove(input) {
  const enabled = input.positionInvariantTags === undefined ? false : input.positionInvariantTags;
  if (typeof enabled !== 'boolean') throw Error('positionInvariantTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxPositionInvariantNodes === undefined ? 50000 : input.maxPositionInvariantNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPositionInvariantNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('position-invariant-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E114-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    positionInvariantAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = inventory(c),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent invariant differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    tick(); const current = inventory(c),oldUnmatched = unmatched(old),newUnmatched = unmatched(current);
    const lostRights = [...rights(before)].filter(r => !rights(after).includes(r));
    const capturedSquare = m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
    const pawn = m.piece === 'p' ? {from:m.from,to:m.to,beforeRank:relative(m.from,actor),afterRank:relative(m.to,actor),promotion:m.promotion || null} : null;
    if (pawn && pawn.afterRank <= pawn.beforeRank) throw Error('Pawn rank must advance');
    const standard = !!h && h.start === new Chess().fen();
    const castles = c.history({verbose:true}).filter(move => move.color === actor && (move.isKingsideCastle() || move.isQueensideCastle())).map(uci);
    const ownKing = current.find(p => p.type === 'k' && p.color === actor).square;
    const ownPawns = current.filter(p => p.type === 'p' && p.color === actor).map(p => ({square:p.square,rank:relative(p.square,actor)}));
    const holes = [];
    if (pawn && !m.promotion) for (const dx of [-1,1]) {
      tick(); const file = m.from.charCodeAt(0)+dx,rank = +m.from[1]+(actor === 'w' ? 1 : -1);
      if (file < 99 || file > 102 || rank < 1 || rank > 8) continue;
      const square = String.fromCharCode(file)+rank,targetRank = relative(square,actor);
      if (targetRank < 3 || targetRank > 6 || old.some(p => p.square === square) || current.some(p => p.square === square)) continue;
      if (ownPawns.every(p => p.rank >= targetRank)) holes.push({square,targetRank,requiredPawnRank:targetRank-1,pawns:ownPawns});
    }
    const replies = [];
    for (const reply of c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)))) {
      tick(); c.move(reply);
      try {
        const count = inventory(c).length,r = rights(c.fen());
        if (count > current.length || [...r].some(x => !rights(after).includes(x))) throw Error('Reply violates monotonic invariant');
        replies.push({move:uci(reply),fen:c.fen(),units:count,rights:r});
      } finally { c.undo(); }
    }
    witness = {experiment:'E114',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),san:m.san,piece:m.piece,from:m.from,to:m.to,captured:m.captured || null,promotion:m.promotion || null},
      beforeInventory:old,afterInventory:current,beforeUnmatched:oldUnmatched,afterUnmatched:newUnmatched,
      pawn,capturedSquare,lostUnits:old.length-current.length,lostRights,standard,castles,ownKing,holes,replies};
    const extra = [],add = (id,text) => {
      tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
      extra.push({id,text,qualityClaim:false,evidence:{experiment:'E114',before,after,detail:{source:'positionInvariantAnalysis.witness'}}});
    };
    if (!oldUnmatched.length && newUnmatched.length) add('created-full-board-asymmetry',`Asymmetrical placement: ${m.san} breaks the exact color-and-rank mirror of the armies; this structural difference does not establish an advantage.`);
    if (standard && !castles.length) add('history-confirmed-uncastled-king',`Uncastled king: your king on ${ownKing} has not castled in the complete recorded history from the standard starting position.`);
    if (pawn) {
      add('irreversible-pawn-move',m.promotion
        ? `Pawn irreversibility: ${m.san} promotes the pawn from ${m.from}; that same pawn cannot return to ${m.from} as a pawn.`
        : `Pawn irreversibility: ${m.san} advances this pawn from ${m.from} to ${m.to}; legal pawn movement cannot return that same pawn to ${m.from}.`);
    }
    if (witness.lostUnits) add('irreversible-captured-unit-loss',`Irreversible capture: ${m.san} removes one unit from ${capturedSquare}; legal moves cannot restore the earlier total unit count, including through promotion.`);
    if (lostRights.length) add('irreversible-castling-rights-loss',`Irreversible rights loss: ${m.san} removes castling rights ${lostRights.join('')}; returning pieces to their old squares cannot restore those rights.`);
    for (const hole of holes) add('permanent-pawn-control-hole',`Pawn-control hole: ${hole.square} loses pawn control after ${m.san}; every remaining pawn is too far advanced to ever attack it. Piece defense remains possible.`);
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'position-invariant-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

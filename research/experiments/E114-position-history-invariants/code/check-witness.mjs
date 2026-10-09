import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {readFen} from '../../FRIEND-shared/lib.mjs';
// Independently parses snapshots and replays histories/replies; no detector import.
const list = fen => Object.entries(readFen(fen).board).map(([square,p]) => ({square,type:p.toLowerCase(),color:p === p.toLowerCase() ? 'b' : 'w'})).sort((a,b) => a.square.localeCompare(b.square));
export function checkWitness(w,result,input) {
  const a = result.positionInvariantAnalysis;
  assert.equal(a.limit,input.maxPositionInvariantNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E114'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const code of w.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.ok(!c.isGameOver());
  const actor = c.turn(),m = c.move(input.move),after = c.fen();
  assert.equal(w.actor,actor); assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver());
  assert.deepEqual(w.played,{move:uci(m),san:m.san,piece:m.piece,from:m.from,to:m.to,captured:m.captured || null,promotion:m.promotion || null});
  const old = list(w.before),current = list(after),ranks = (s,color) => color === 'w' ? +s[1] : 9-+s[1];
  assert.deepEqual(w.beforeInventory,old); assert.deepEqual(w.afterInventory,current);
  const asymmetric = army => army.filter(p => !army.some(other => other.square === p.square[0]+(9-+p.square[1]) && other.type === p.type && other.color !== p.color));
  const beforeUnmatched = asymmetric(old),afterUnmatched = asymmetric(current);
  assert.deepEqual(w.beforeUnmatched,beforeUnmatched); assert.deepEqual(w.afterUnmatched,afterUnmatched);
  const pawn = m.piece === 'p' ? {from:m.from,to:m.to,beforeRank:ranks(m.from,actor),afterRank:ranks(m.to,actor),promotion:m.promotion || null} : null;
  assert.deepEqual(w.pawn,pawn); if (pawn) assert.ok(pawn.afterRank > pawn.beforeRank);
  const captureSquare = m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
  assert.equal(w.capturedSquare,captureSquare); assert.equal(w.lostUnits,old.length-current.length);
  assert.equal(w.lostUnits,m.captured ? 1 : 0);
  if (captureSquare) assert.equal(old.find(p => p.square === captureSquare)?.color,actor === 'w' ? 'b' : 'w');
  const rights = fen => fen.split(' ')[2].replace('-','');
  const lostRights = [...rights(w.before)].filter(r => !rights(after).includes(r));
  assert.deepEqual(w.lostRights,lostRights); assert.ok([...rights(after)].every(r => rights(w.before).includes(r)));
  const standard = !!w.history && w.history.fen === new Chess().fen();
  const castles = c.history({verbose:true}).filter(move => move.color === actor && /[kq]/.test(move.flags)).map(uci);
  assert.equal(w.standard,standard); assert.deepEqual(w.castles,castles);
  const king = current.find(p => p.type === 'k' && p.color === actor).square; assert.equal(w.ownKing,king);
  const pawns = current.filter(p => p.type === 'p' && p.color === actor).map(p => ({square:p.square,rank:ranks(p.square,actor)}));
  const holes = [];
  if (pawn && !m.promotion) for (const file of 'cdef') {
    const square = file+(+m.from[1]+(actor === 'w' ? 1 : -1)),targetRank = ranks(square,actor);
    if (Math.abs(file.charCodeAt(0)-m.from.charCodeAt(0)) !== 1 || targetRank < 3 || targetRank > 6) continue;
    if (old.some(p => p.square === square) || current.some(p => p.square === square)) continue;
    if (pawns.every(p => p.rank >= targetRank)) holes.push({square,targetRank,requiredPawnRank:targetRank-1,pawns});
  }
  assert.deepEqual(w.holes,holes);
  const legal = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
  assert.equal(w.replies.length,legal.length);
  for (const [i,row] of w.replies.entries()) {
    assert.equal(row.move,uci(legal[i])); c.move(legal[i]);
    try {
      assert.equal(row.fen,c.fen()); assert.equal(row.units,list(c.fen()).length); assert.equal(row.rights,rights(c.fen()));
      assert.ok(row.units <= current.length); assert.ok([...row.rights].every(r => rights(after).includes(r)));
    } finally { c.undo(); }
  }
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,
    evidence:{experiment:'E114',before:w.before,after,detail:{source:'positionInvariantAnalysis.witness'}}});
  if (!beforeUnmatched.length && afterUnmatched.length) add('created-full-board-asymmetry',`Asymmetrical placement: ${m.san} breaks the exact color-and-rank mirror of the armies; this structural difference does not establish an advantage.`);
  if (standard && !castles.length) add('history-confirmed-uncastled-king',`Uncastled king: your king on ${king} has not castled in the complete recorded history from the standard starting position.`);
  if (pawn) add('irreversible-pawn-move',m.promotion
    ? `Pawn irreversibility: ${m.san} promotes the pawn from ${m.from}; that same pawn cannot return to ${m.from} as a pawn.`
    : `Pawn irreversibility: ${m.san} advances this pawn from ${m.from} to ${m.to}; legal pawn movement cannot return that same pawn to ${m.from}.`);
  if (w.lostUnits) add('irreversible-captured-unit-loss',`Irreversible capture: ${m.san} removes one unit from ${captureSquare}; legal moves cannot restore the earlier total unit count, including through promotion.`);
  if (lostRights.length) add('irreversible-castling-rights-loss',`Irreversible rights loss: ${m.san} removes castling rights ${lostRights.join('')}; returning pieces to their old squares cannot restore those rights.`);
  for (const hole of holes) add('permanent-pawn-control-hole',`Pawn-control hole: ${hole.square} loses pawn control after ${m.san}; every remaining pawn is too far advanced to ever attack it. Piece defense remains possible.`);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E114'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  for (const event of expected) assert.ok(event.text.split(/\s+/).length <= 24);
}

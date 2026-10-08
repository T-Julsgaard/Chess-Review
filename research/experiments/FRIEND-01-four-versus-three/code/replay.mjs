// Independent replay for FRIEND-01. Deliberately does not import fourthree.mjs:
// board facts are re-derived from saved FEN text with the neutral FEN reader.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {readFen} from '../../FRIEND-shared/lib.mjs';

export function facts(fen) {
  const {board} = readFen(fen);
  const letters = Object.values(board).sort().join('');
  const wp = Object.keys(board).filter(s => board[s] === 'P').sort();
  const bp = Object.keys(board).filter(s => board[s] === 'p').sort();
  const pureRook = /^[KkRrPp]+$/.test(letters) && letters.split('R').length === 2 && letters.split('r').length === 2;
  const fileSet = new Set([...wp, ...bp].map(s => s.charCodeAt(0) - 97));
  const lo = fileSet.size ? Math.min(...fileSet) : null, hi = fileSet.size ? Math.max(...fileSet) : null;
  const wing = lo === null ? null : hi <= 3 ? 'a-d' : lo >= 4 ? 'e-h' : null;
  const split = (wp.length === 4 && bp.length === 3) || (wp.length === 3 && bp.length === 4);
  return {pureRook, wing, wp, bp, match: pureRook && wing !== null && split};
}

function scratch(fixture) {
  const start = fixture.history?.fen || fixture.fen;
  const c = new Chess(start);
  for (const m of fixture.history?.moves || []) c.move(m);
  const plies = fixture.history?.moves.length || 0;
  if (c.isGameOver()) return {status: 'not-live', nodes: 1 + plies};
  const beforeFen = c.fen(), before = facts(beforeFen), actor = c.turn();
  const move = c.move({from: fixture.move.slice(0, 2), to: fixture.move.slice(2, 4), promotion: fixture.move[4]});
  if (c.isGameOver()) return {status: 'not-live', nodes: 3 + plies, beforeFen, afterFen: c.fen()};
  const afterFen = c.fen(), after = facts(afterFen);
  if (!after.match || before.match) return {status: 'no-new-fact', nodes: 5 + plies, before, after, beforeFen, afterFen};
  const major = (actor === 'w' ? after.wp : after.bp).length === 4;
  const text = major
    ? `Four versus three: you have four pawns against three on the ${after.wing} files, with one rook each.`
    : `Four versus three: your opponent has four pawns against your three on the ${after.wing} files, with one rook each.`;
  return {status: 'proven', nodes: 6 + plies, before, after, text, move, actor, beforeFen, afterFen};
}

export function replay(fixture, result) {
  const a = result.fourThreeAnalysis;
  const mine = result.events.filter(e => e.id === 'four-versus-three');
  if (!a) {
    assert.equal(fixture.flag, false, 'enabled run must save an analysis');
    assert.equal(mine.length, 0);
    return {state: 'disabled'};
  }
  if (result.foundationAnalysis && result.foundationAnalysis.status !== 'accepted') {
    assert.equal(a.status, 'not-applicable'); assert.equal(a.nodes, 0); assert.equal(mine.length, 0);
    return {state: 'not-applicable'};
  }
  const s = scratch(fixture);
  // The saved result must belong to this fixture: same played position, history and move.
  assert.equal(result.after, s.afterFen);
  const limit = fixture.limit ?? 50000;
  assert.equal(a.limit, limit);
  if (limit < s.nodes) {
    assert.equal(a.status, 'exhausted'); assert.equal(a.nodes, limit + 1);
    assert.equal(a.witness, null); assert.equal(mine.length, 0);
    return {state: 'exhausted'};
  }
  assert.equal(a.status, s.status); assert.equal(a.nodes, s.nodes);
  if (s.status !== 'proven') {
    assert.equal(mine.length, 0); assert.equal(a.witness, null);
    assert.equal(result.comment, result.events.length ? [...result.events]
      .sort((x, y) => inherited(y) - inherited(x))[0].text : result.comment);
    return {state: s.status};
  }
  assert.equal(mine.length, 1);
  const [event] = mine, w = a.witness;
  assert.equal(event.text, s.text); assert.equal(event.qualityClaim, false);
  assert.ok(event.text.split(/\s+/).length <= 24);
  assert.equal(JSON.stringify(event.evidence), JSON.stringify(w));
  assert.equal(w.before.fen, s.beforeFen); assert.equal(w.after.fen, s.afterFen);
  assert.equal(w.played.uci, fixture.move);
  assert.equal(JSON.stringify(w.history), JSON.stringify(fixture.history ? {fen: fixture.history.fen, moves: fixture.history.moves} : null));
  // Saved evidence must reproduce under fresh derivation from its own FENs.
  const saved = {before: facts(w.before.fen), after: facts(w.after.fen)};
  assert.equal(saved.before.match, false); assert.equal(saved.after.match, true);
  assert.equal(w.after.wing, saved.after.wing);
  assert.deepEqual(w.after.pawns.w, saved.after.wp); assert.deepEqual(w.after.pawns.b, saved.after.bp);
  assert.equal(w.after.counts.w, saved.after.wp.length); assert.equal(w.after.counts.b, saved.after.bp.length);
  assert.equal(w.after.rooks.length, 2);
  const c = new Chess(w.before.fen);
  const move = c.move({from: w.played.from, to: w.played.to, promotion: w.played.promotion || undefined});
  assert.equal(c.fen(), w.after.fen); assert.equal(move.san, w.played.san);
  assert.equal(w.actor, s.actor); assert.equal(c.isGameOver(), false);
  // Selected comment is the highest-priority event under inherited priorities, new event 4.2.
  const rank = e => e.id === 'four-versus-three' ? 4.2 : inherited(e);
  assert.equal(result.comment, [...result.events].sort((x, y) => rank(y) - rank(x))[0].text);
  return {state: 'proven'};
}

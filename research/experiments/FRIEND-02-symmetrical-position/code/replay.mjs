// Independent replay for FRIEND-02. Does not import symmetry.mjs. Symmetry is
// re-derived per file from FEN text: the White rank set must equal the Black
// ranks reflected by 9-r, a different method from the detector's square pairing.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {readFen} from '../../FRIEND-shared/lib.mjs';

export function facts(fen) {
  const {board} = readFen(fen);
  const byFile = {};
  for (const [square, piece] of Object.entries(board)) {
    if (piece !== 'P' && piece !== 'p') continue;
    const entry = byFile[square[0]] ||= {w: [], b: []};
    entry[piece === 'P' ? 'w' : 'b'].push(Number(square[1]));
  }
  let mirror = true, w = 0, b = 0;
  for (const {w: whites, b: blacks} of Object.values(byFile)) {
    w += whites.length; b += blacks.length;
    const reflected = blacks.map(r => 9 - r).sort((x, y) => x - y);
    if (JSON.stringify(reflected) !== JSON.stringify([...whites].sort((x, y) => x - y))) mirror = false;
  }
  mirror = mirror && w >= 3 && w === b;
  // Non-pawn pieces: per (type, file, colour-relative rank) the two colours must agree.
  const sig = {};
  for (const [square, piece] of Object.entries(board)) {
    if (piece === 'P' || piece === 'p') continue;
    const colour = piece === piece.toUpperCase() ? 'w' : 'b';
    const rank = colour === 'w' ? Number(square[1]) : 9 - Number(square[1]);
    const k = piece.toLowerCase() + square[0] + rank;
    (sig[k] ||= {w: 0, b: 0})[colour]++;
  }
  const piecesAlsoMirror = Object.values(sig).every(v => v.w === v.b);
  const files = Object.keys(byFile).filter(f => byFile[f].w.length).sort();
  return {mirror, files, piecesAlsoMirror, w, b, byFile};
}

function scratch(fixture) {
  const c = new Chess(fixture.history?.fen || fixture.fen);
  for (const m of fixture.history?.moves || []) c.move(m);
  const plies = fixture.history?.moves.length || 0;
  if (c.isGameOver()) return {status: 'not-live', nodes: 1 + plies};
  const beforeFen = c.fen(), before = facts(beforeFen), actor = c.turn();
  c.move({from: fixture.move.slice(0, 2), to: fixture.move.slice(2, 4), promotion: fixture.move[4]});
  const afterFen = c.fen();
  if (c.isGameOver()) return {status: 'not-live', nodes: 3 + plies, beforeFen, afterFen};
  const after = facts(afterFen);
  if (!after.mirror || before.mirror) return {status: 'no-new-fact', nodes: 5 + plies, before, after, beforeFen, afterFen};
  const text = `Symmetrical pawns: both sides mirror each other's pawns on the ${after.files.join(', ')} files.`;
  return {status: 'proven', nodes: 6 + plies, before, after, text, actor, beforeFen, afterFen};
}

export function replay(fixture, result) {
  const a = result.symmetryAnalysis;
  const mine = result.events.filter(e => e.id === 'symmetrical-pawns');
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
  assert.equal(result.after, s.afterFen);
  const limit = fixture.limit ?? 50000;
  assert.equal(a.limit, limit);
  if (limit < s.nodes) {
    assert.equal(a.status, 'exhausted'); assert.equal(a.nodes, limit + 1);
    assert.equal(a.witness, null); assert.equal(mine.length, 0);
    return {state: 'exhausted'};
  }
  assert.equal(a.status, s.status); assert.equal(a.nodes, s.nodes);
  if (s.status !== 'proven') { assert.equal(mine.length, 0); assert.equal(a.witness, null); return {state: s.status}; }
  assert.equal(mine.length, 1);
  const [event] = mine, w = a.witness;
  assert.equal(event.text, s.text); assert.equal(event.qualityClaim, false);
  assert.ok(event.text.split(/\s+/).length <= 24);
  assert.equal(JSON.stringify(event.evidence), JSON.stringify(w));
  assert.equal(w.before.fen, s.beforeFen); assert.equal(w.after.fen, s.afterFen);
  assert.equal(w.played.uci, fixture.move); assert.equal(w.actor, s.actor);
  assert.equal(JSON.stringify(w.history), JSON.stringify(fixture.history ? {fen: fixture.history.fen, moves: fixture.history.moves} : null));
  // Saved pairs, flags and lists must match fresh derivation from the saved FENs.
  const saved = facts(w.after.fen);
  assert.equal(saved.mirror, true); assert.equal(facts(w.before.fen).mirror, false);
  assert.equal(w.after.mirror, true); assert.equal(w.before.mirror, false);
  assert.equal(w.after.piecesAlsoMirror, saved.piecesAlsoMirror);
  assert.equal(w.after.pairs.length, saved.w);
  for (const pair of w.after.pairs) {
    assert.equal(pair.white[0], pair.black[0]); assert.equal(Number(pair.white[1]) + Number(pair.black[1]), 9);
    assert.ok(saved.byFile[pair.white[0]].w.includes(Number(pair.white[1])));
  }
  assert.deepEqual(w.after.files, saved.files);
  assert.equal(w.after.pawns.w.length, saved.w); assert.equal(w.after.pawns.b.length, saved.b);
  const c = new Chess(w.before.fen);
  const move = c.move({from: w.played.from, to: w.played.to, promotion: w.played.promotion || undefined});
  assert.equal(c.fen(), w.after.fen); assert.equal(move.san, w.played.san);
  const rank = e => e.id === 'symmetrical-pawns' ? 4.1 : inherited(e);
  assert.equal(result.comment, [...result.events].sort((x, y) => rank(y) - rank(x))[0].text);
  return {state: 'proven'};
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent, priority as prior} from '../../E081-direct-attacks/code/attacks.mjs';
import {replay as replayPriorSide} from '../../E057-rook-checking-distance/code/replay.mjs';
const code = m => m.from + m.to + (m.promotion || '');
const played = m => ({uci: code(m), san: m.san, from: m.from, to: m.to, piece: m.piece,
  color: m.color, captured: m.captured || null, promotion: m.promotion || null, flags: m.flags});
function army(c) {
  const pieces = [];
  for (let file = 0; file < 8; file++) for (let rank = 1; rank <= 8; rank++) {
    const square = String.fromCharCode(97 + file) + rank, piece = c.get(square);
    if (piece) pieces.push({square, type: piece.type, color: piece.color});
  }
  return pieces;
}
function classify(list) {
  const pawns = {w: [], b: []}, rooks = [], kings = []; let pure = true;
  for (const p of list) {
    if (p.type === 'p') pawns[p.color].push(p.square);
    else if (p.type === 'r') rooks.push(p);
    else if (p.type === 'k') kings.push(p);
    else pure = false;
  }
  const counts = {w: pawns.w.length, b: pawns.b.length};
  const rookEnding = pure && rooks.length === 2 && rooks[0].color !== rooks[1].color;
  const files = Array.from('abcdefgh').filter(f => [...pawns.w, ...pawns.b].some(s => s[0] === f));
  const wing = !files.length ? 'none' : files.at(-1) <= 'd' ? 'a-d' : files[0] >= 'e' ? 'e-h' : 'split';
  return {pawns, rooks, kings, counts, files, wing, rookEnding,
    fourThree: rookEnding && ((counts.w === 4 && counts.b === 3) || (counts.w === 3 && counts.b === 4)),
    threeTwo: rookEnding && ((counts.w === 3 && counts.b === 2) || (counts.w === 2 && counts.b === 3))};
}
export function replayResult(f, result) {
  const base = parent(f);
  if (f.rookEndingTags === undefined || f.rookEndingTags === false) {
    assert.deepEqual(result, base); return {state: 'disabled', certificates: 0, replies: 0};
  }
  assert.equal(f.rookEndingTags, true);
  const limit = f.maxRookEndingNodes === undefined ? 50000 : f.maxRookEndingNodes;
  assert.ok(Number.isSafeInteger(limit) && limit >= 0 && limit <= 50000);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const charge = () => { if (++nodes > limit) throw Error('independent-quota'); };
  try {
    if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') status = 'not-applicable';
    else {
      charge(); const c = new Chess(f.history?.fen || f.fen);
      for (const move of f.history?.moves || []) { charge(); assert.ok(!c.isGameOver()); c.move(move); }
      assert.equal(c.fen(), new Chess(f.fen).fen());
      if (c.isGameOver()) status = 'not-live';
      else {
        const actor = c.turn(), beforeFen = c.fen(); charge(); const legalMoves = c.moves({verbose: true}).map(code).sort();
        charge(); const move = c.move(f.move), afterFen = c.fen(); assert.equal(afterFen, base.after);
        if (c.isGameOver()) status = 'not-live';
        else {
          c.undo(); charge(); const beforePieces = army(c); c.move(f.move); charge(); const afterPieces = army(c);
          charge(); const before = classify(beforePieces); charge(); const after = classify(afterPieces);
          if (after.rookEnding) {
            charge(); const king = after.kings.find(p => p.color !== actor), checkers = c.attackers(king.square, actor).sort();
            let side = null; const categories = [];
            if (move.piece === 'r' && c.isCheck() && move.to[1] === king.square[1]) {
              const cells = []; let x = move.to.charCodeAt(0);
              while (Math.abs(x - king.square.charCodeAt(0)) > 1) {
                x += x < king.square.charCodeAt(0) ? 1 : -1; charge();
                const square = String.fromCharCode(x) + king.square[1]; cells.push({square, piece: c.get(square) || null});
              }
              if (cells.every(r => r.piece === null) && checkers.includes(move.to)) {
                charge(); const replies = [];
                for (const reply of c.moves({verbose: true})) {
                  charge(); c.move(code(reply)); replies.push({...played(reply), fen: c.fen(), check: c.isCheck(),
                    checkmate: c.isCheckmate(), draw: c.isDraw(), terminal: c.isGameOver()}); c.undo();
                }
                const reuseIndex = base.events.findIndex(e => e.id === 'side-rook-check');
                if (reuseIndex >= 0) {
                  charge(); const old = base.events[reuseIndex]; replayPriorSide(f, old);
                  assert.equal(old.evidence.checker.square, move.to); assert.equal(old.evidence.king.square, king.square);
                  assert.deepEqual(old.evidence.ray, cells.map(r => r.square));
                }
                side = {checker: {square: move.to, type: 'r', color: actor}, king, checkers, cells, replies, reuseIndex};
                categories.push('side-check');
              }
            }
            if (after.fourThree && !before.fourThree) categories.push('four-three');
            if (after.threeTwo && !before.threeTwo) categories.push('three-two');
            if (categories.length) {
              witness = {actor, history: f.history ? {fen: f.history.fen, moves: [...f.history.moves]} : null,
                legalMoves, played: played(move), before: {fen: beforeFen, pieces: beforePieces, ...before},
                after: {fen: afterFen, pieces: afterPieces, ...after}, side, categories};
              const extra = [];
              if (side && side.reuseIndex < 0) {
                charge(); extra.push({id: 'side-check-proof', text: `Side check: ${move.san} checks king ${king.square} along rank ${king.square[1]}.`, qualityClaim: false, evidence: witness});
              }
              for (const category of categories.filter(k => k !== 'side-check')) {
                charge(); const four = category === 'four-three', large = four ? 4 : 3;
                const label = four ? 'Four versus three' : 'Three versus two', a = four ? 'four' : 'three', b = four ? 'three' : 'two';
                const text = after.counts[actor] === large ? `${label}: you have ${a} pawns against ${b}, with one rook each.`
                  : `${label}: your opponent has ${a} pawns against your ${b}, with one rook each.`;
                extra.push({id: four ? 'rook-four-three' : 'rook-three-two', text, qualityClaim: false, evidence: witness});
              }
              status = 'proven'; if (extra.length) events = [...base.events, ...extra];
            }
          }
        }
      }
    }
  } catch (error) { if (error.message !== 'independent-quota') throw error; status = 'exhausted'; witness = null; events = base.events; }
  const rank = e => ({'side-check-proof': 76.4, 'rook-four-three': 30.2, 'rook-three-two': 30.2}[e.id] ?? prior(e));
  assert.deepEqual(result, {...base, schema: 'coach-concepts-v63', events,
    comment: events === base.events ? base.comment : [...events].sort((a, b) => rank(b) - rank(a))[0]?.text || null,
    rookEndingAnalysis: {limit, nodes, status, witness}});
  return {state: status, certificates: witness ? witness.categories.length : 0, replies: witness?.side?.replies.length || 0};
}

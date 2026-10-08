import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
import {explainMove as parent, priority as inheritedPriority} from '../../E079-central-king-support/code/center.mjs';

const code = m => m.from + m.to + (m.promotion || '');
function inventory(c) {
  const found = [];
  for (const file of 'abcdefgh') for (let rank = 1; rank <= 8; rank++) {
    const square = file + rank, p = c.get(square);
    if (p) found.push({square, type: p.type, color: p.color});
  }
  return found;
}
function shieldSquares(c, king, actor) {
  const result = [], direction = actor === 'w' ? 1 : -1;
  for (const offset of [-1, 0, 1]) for (const step of [1, 2]) {
    const x = king.charCodeAt(0) + offset, y = Number(king[1]) + direction * step;
    if (x < 97 || x > 104 || y < 1 || y > 8) continue;
    const square = String.fromCharCode(x) + y, p = c.get(square);
    if (p?.type === 'p' && p.color === actor) result.push(square);
  }
  return result.sort();
}
function interior(from, to) {
  let x = from.charCodeAt(0), y = Number(from[1]);
  const targetX = to.charCodeAt(0), targetY = Number(to[1]);
  const dx = targetX - x, dy = targetY - y;
  if (!(dx || dy) || (dx && dy && Math.abs(dx) !== Math.abs(dy))) return null;
  const cells = [];
  x += Math.sign(dx); y += Math.sign(dy);
  while (x !== targetX || y !== targetY) {
    cells.push(String.fromCharCode(x) + y);
    x += Math.sign(dx); y += Math.sign(dy);
  }
  return cells;
}

// Independently enumerate the finite one-ply truth table. No new detector or
// source solver import. Frozen replayQuery separately checks supplied trees.
function onePly(c, enemy) {
  assert.equal(c.turn(), enemy); assert.ok(!c.isGameOver());
  const rank = m => m.san.endsWith('#') ? 0 : m.san.includes('+') ? 1 : m.captured ? 2 : 3;
  const moves = c.moves({verbose: true}).sort((a, b) => rank(a) - rank(b) || code(a).localeCompare(code(b)));
  const branches = [];
  let winner = null;
  for (const move of moves) {
    c.move(code(move));
    const mate = c.isCheckmate(), draw = !mate && c.isDraw();
    const child = {win: mate, kind: mate ? 'mate' : draw ? 'draw' : 'limit', fen: c.fen()};
    c.undo();
    if (mate) { winner = {move: code(move), child}; break; }
    branches.push({move: code(move), child});
  }
  const tree = winner ? {win: true, kind: 'choice', ...winner} : {win: false, kind: 'all-fail', branches};
  return {proof: {rootFen: c.fen(), winner: enemy, plies: 1, tree},
    work: 2 + 2 * (branches.length + (winner ? 1 : 0))};
}

export function replayResult(f, result) {
  const base = parent(f);
  if (f.pawnShieldTags === false || f.pawnShieldTags === undefined) {
    assert.deepEqual(result, base); return {state: 'disabled', certificates: 0, replies: 0, leaves: 0};
  }
  const limit = f.maxPawnShieldNodes === undefined ? 50000 : f.maxPawnShieldNodes;
  let nodes = 0, status = 'no-new-fact', beforeProof = null, afterProof = null, witness = null;
  let events = base.events, replies = 0, leaves = 0;
  const charge = (units = 1) => {
    nodes += units;
    if (nodes > limit) { nodes = limit + 1; throw Error('independent-quota'); }
  };
  const verify = (c, observed, supplied) => {
    assert.deepEqual(supplied, observed.proof);
    const checked = replayQuery(c, supplied);
    assert.equal(checked.win, observed.proof.tree.win);
    replies += checked.replies; leaves += checked.leaves;
  };
  try {
    if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') status = 'not-applicable';
    else {
      charge();
      const c = new Chess(f.history?.fen || f.fen);
      for (const move of f.history?.moves || []) { charge(); assert.ok(!c.isGameOver()); c.move(move); }
      assert.equal(c.fen(), new Chess(f.fen).fen());
      if (c.isGameOver()) status = 'not-live';
      else {
        const actor = c.turn(), enemy = actor === 'w' ? 'b' : 'w', rootCheck = c.isCheck();
        charge(); const legalMoves = c.moves({verbose: true}).map(code).sort();
        charge(); const beforeFen = c.fen(), move = c.move(f.move), afterFen = c.fen();
        assert.equal(afterFen, base.after);
        if (c.isGameOver()) status = 'not-live';
        else {
          const afterCheck = c.isCheck();
          charge(); const afterPieces = inventory(c);
          const afterKing = afterPieces.find(p => p.type === 'k' && p.color === actor).square;
          c.undo(); charge(); const beforePieces = inventory(c);
          const beforeKing = beforePieces.find(p => p.type === 'k' && p.color === actor).square;
          charge(); const beforeCover = shieldSquares(c, beforeKing, actor);
          c.move(f.move); charge(); const afterCover = shieldSquares(c, afterKing, actor); c.undo();
          const allowed = move.piece === 'p' && !move.captured && !move.promotion && !rootCheck && !afterCheck
            && beforeKing === afterKing && ['c', 'e', 'g'].includes(beforeKing[0])
            && Number(beforeKing[1]) === (actor === 'w' ? 1 : 8)
            && beforeCover.includes(move.from) && afterCover.includes(move.to);
          if (allowed) {
            charge(); const fields = beforeFen.split(' ');
            if (fields[1] !== enemy) { fields[1] = enemy; fields[3] = '-'; }
            const hypothetical = new Chess(fields.join(' '));
            if (!hypothetical.isGameOver()) {
              const prior = onePly(hypothetical, enemy); charge(prior.work);
              beforeProof = prior.proof;
              if (beforeProof.tree.win) {
                const mating = hypothetical.moves({verbose: true}).find(m => code(m) === beforeProof.tree.move);
                charge(); const cells = interior(mating.from, mating.to);
                if (['q', 'r', 'b'].includes(mating.piece) && mating.captured === 'p'
                  && mating.to === move.from && cells?.includes(move.to)
                  && cells.every(s => !hypothetical.get(s))) {
                  c.move(f.move);
                  const blocker = c.get(move.to), attacker = c.get(mating.from);
                  if (!c.moves({verbose: true}).some(m => code(m) === code(mating))
                    && blocker?.type === 'p' && blocker.color === actor
                    && attacker?.type === mating.piece && attacker.color === enemy) {
                    const later = onePly(c, enemy); charge(later.work); afterProof = later.proof;
                    if (!afterProof.tree.win) {
                      charge(); status = 'proven';
                      witness = {actor, enemy,
                        history: f.history ? {fen: f.history.fen, moves: [...f.history.moves]} : null,
                        legalMoves, played: {uci: code(move), san: move.san, from: move.from, to: move.to,
                          piece: move.piece, color: move.color, captured: null, promotion: null, flags: move.flags},
                        before: {fen: beforeFen, pieces: beforePieces, king: beforeKing, cover: beforeCover},
                        after: {fen: afterFen, pieces: afterPieces, king: afterKing, cover: afterCover},
                        hypotheticalOpponentFen: hypothetical.fen(),
                        blockedCapture: {uci: code(mating), san: mating.san, from: mating.from, to: mating.to,
                          piece: mating.piece, color: mating.color, captured: mating.captured, cells,
                          beforeBlockers: [], afterBlockers: [{square: move.to, type: 'p', color: actor}]}};
                      events = [...base.events, {id: 'pawn-shield-defense',
                        text: `Pawn shield: ${move.to} blocks ...${mating.san}, with no immediate mate remaining.`,
                        qualityClaim: false, evidence: {witness, beforeProof, afterProof}}];
                    }
                  }
                  c.undo();
                }
              }
              verify(hypothetical, prior, result.pawnShieldAnalysis.beforeProof);
              if (afterProof) {
                c.move(f.move);
                verify(c, {proof: afterProof}, result.pawnShieldAnalysis.afterProof); c.undo();
              }
            }
          }
        }
      }
    }
  } catch (error) {
    if (error.message !== 'independent-quota') throw error;
    status = 'exhausted'; beforeProof = null; afterProof = null; witness = null;
    events = base.events; replies = 0; leaves = 0;
  }
  assert.deepEqual(result.pawnShieldAnalysis, {limit, nodes, status, beforeProof, afterProof, witness});
  const selected = [...events].sort((a, b) =>
    (b.id === 'pawn-shield-defense' ? 155 : inheritedPriority(b))
      - (a.id === 'pawn-shield-defense' ? 155 : inheritedPriority(a)))[0]?.text || null;
  assert.deepEqual(result, {...base, schema: 'coach-concepts-v61', events, comment: selected,
    pawnShieldAnalysis: {limit, nodes, status, beforeProof, afterProof, witness}});
  assert.ok(!selected || selected.split(/\s+/).length <= 24);
  return {state: status, certificates: witness ? 1 : 0, replies, leaves};
}

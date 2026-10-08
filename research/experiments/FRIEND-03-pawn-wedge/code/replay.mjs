// Independent replay for FRIEND-03. Does not import wedge.mjs. It re-derives from
// FEN text: support, pawn reachability by breadth-first search over pawn moves and
// captures (not the detector's closed form), attack maps by its own ray code, and
// enemy king destinations by its own king-step enumeration. chess.js is used only as
// the rules authority for played-move legality and game-over checks.
import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';
import {readFen, boardFen} from '../../FRIEND-shared/lib.mjs';

const F = 'abcdefgh';
const onBoard = (f, r) => f >= 0 && f < 8 && r >= 1 && r <= 8;
const sq = (f, r) => F[f] + r;
const isWhite = piece => piece === piece.toUpperCase();

// Squares attacked by `colour` (including squares holding any piece, i.e. defended
// ones). `ignore` removes one square from blocking (the king being chased).
export function attackMap(board, colour, ignore = null) {
  const out = new Set();
  const blocks = s => s !== ignore && board[s];
  for (const [square, piece] of Object.entries(board)) {
    if ((colour === 'w') !== isWhite(piece)) continue;
    const f = F.indexOf(square[0]), r = Number(square[1]), t = piece.toLowerCase();
    const add = (df, dr) => { if (onBoard(f + df, r + dr)) out.add(sq(f + df, r + dr)); };
    if (t === 'p') { const d = colour === 'w' ? 1 : -1; add(-1, d); add(1, d); }
    else if (t === 'n') for (const [a, b] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) add(a, b);
    else if (t === 'k') {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (a || b) add(a, b);
    } else {
      const dirs = [];
      if (t !== 'r') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      if (t !== 'b') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [a, b] of dirs) {
        for (let k = 1; onBoard(f + a * k, r + b * k); k++) {
          const target = sq(f + a * k, r + b * k);
          out.add(target);
          if (blocks(target)) break;
        }
      }
    }
  }
  return out;
}

// Enemy king destinations without chess.js move generation: adjacent, not own-occupied,
// not attacked by the actor (sliders see through the king's current square).
export function kingSteps(board, mover) {
  const kingSquare = Object.keys(board).find(s => board[s] === (mover === 'w' ? 'K' : 'k'));
  const f = F.indexOf(kingSquare[0]), r = Number(kingSquare[1]);
  const attacked = attackMap(board, mover === 'w' ? 'b' : 'w', kingSquare);
  const out = [];
  for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
    if ((!a && !b) || !onBoard(f + a, r + b)) continue;
    const target = sq(f + a, r + b), occupant = board[target];
    if (occupant && isWhite(occupant) === (mover === 'w')) continue;
    if (!attacked.has(target)) out.push(target);
  }
  return out.sort();
}

// Breadth-first search over relative states: forward one square, or capture diagonally.
function bfsSteps(file, relRank, goal) {
  const seen = new Map([[file + ',' + relRank, 0]]);
  const queue = [[file, relRank]];
  while (queue.length) {
    const [f, r] = queue.shift(), d = seen.get(f + ',' + r);
    if (goal.some(([gf, gr]) => gf === f && gr === r)) return d;
    for (const df of [-1, 0, 1]) {
      const nf = f + df, nr = r - 1;
      if (nf < 0 || nf > 7 || nr < 1 || seen.has(nf + ',' + nr)) continue;
      seen.set(nf + ',' + nr, d + 1); queue.push([nf, nr]);
    }
  }
  return null;
}

function derive(fixtureFenAfter, from, to, actor) {
  const {board} = readFen(fixtureFenAfter);
  const relative = square => actor === 'w' ? Number(square[1]) : 9 - Number(square[1]);
  const wedgeRank = relative(to), wedgeFile = F.indexOf(to[0]);
  const own = actor === 'w' ? 'P' : 'p', enemyPawn = actor === 'w' ? 'p' : 'P';
  const supporters = Object.keys(board).filter(s => board[s] === own && Math.abs(F.indexOf(s[0]) - wedgeFile) === 1
    && relative(s) === wedgeRank - 1).sort();
  const goal = [wedgeFile - 1, wedgeFile + 1].filter(f => f >= 0 && f < 8).map(f => [f, wedgeRank + 1]);
  const reach = Object.keys(board).filter(s => board[s] === enemyPawn).sort().map(s => ({
    square: s, steps: bfsSteps(F.indexOf(s[0]), relative(s), goal)}));
  return {board, wedgeRank, supporters, reach, goal};
}

function scratch(fixture) {
  const c = new Chess(fixture.history?.fen || fixture.fen);
  for (const m of fixture.history?.moves || []) c.move(m);
  const n = fixture.history?.moves.length || 0;
  if (c.isGameOver()) return {status: 'not-live', nodes: 1 + n};
  const beforeFen = c.fen(), actor = c.turn(), enemy = actor === 'w' ? 'b' : 'w';
  const move = c.move({from: fixture.move.slice(0, 2), to: fixture.move.slice(2, 4), promotion: fixture.move[4]});
  const afterFen = c.fen();
  const common = {beforeFen, afterFen, actor, enemy, move};
  if (c.isGameOver()) return {status: 'not-live', nodes: 3 + n, ...common};
  const d = derive(afterFen, move.from, move.to, actor);
  const m = d.reach.length;
  if (move.piece !== 'p' || move.promotion || ![5, 6].includes(d.wedgeRank) || !d.supporters.length) {
    return {status: 'no-new-fact', nodes: 4 + n, stage: 'shape', ...common, d};
  }
  if (d.reach.some(r => r.steps !== null)) return {status: 'no-new-fact', nodes: 4 + n + m, stage: 'assailable', ...common, d};
  // Counterfactual board built from text, then checked for legality and liveness.
  const board = {...readFen(afterFen).board}; delete board[move.to];
  const cfFen = boardFen(board, enemy).split(' ').slice(0, 4).join(' ') + ' ' + afterFen.split(' ').slice(4).join(' ');
  const actorKing = Object.keys(board).find(s => board[s] === (actor === 'w' ? 'K' : 'k'));
  let cfLive = !attackMap(board, enemy).has(actorKing);
  if (cfLive) { try { cfLive = !new Chess(cfFen).isGameOver(); } catch { cfLive = false; } }
  if (!cfLive) return {status: 'no-new-fact', nodes: 5 + n + m, stage: 'counterfactual', ...common, d};
  const actual = kingSteps(readFen(afterFen).board, enemy), without = kingSteps(board, enemy);
  const denied = without.filter(s => !actual.includes(s));
  const attacks = d.goal.map(([f, r]) => sq(f, actor === 'w' ? r : 9 - r));
  if (!denied.length || !denied.every(s => attacks.includes(s))) {
    return {status: 'no-new-fact', nodes: 7 + n + m, stage: 'king', ...common, d, actual, without, denied, cfFen};
  }
  const text = `Pawn wedge: ${move.to} is supported and cannot be challenged by pawns, denying the enemy king ${denied.join(' and ')}.`;
  return {status: 'proven', nodes: 8 + n + m, stage: 'proven', ...common, d, actual, without, denied, cfFen, attacks, text};
}

export function replay(fixture, result) {
  const a = result.wedgeAnalysis;
  const mine = result.events.filter(e => e.id === 'pawn-wedge');
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
  assert.equal(w.played.uci, fixture.move); assert.equal(w.actor, s.actor); assert.equal(w.enemy, s.enemy);
  assert.equal(JSON.stringify(w.history), JSON.stringify(fixture.history ? {fen: fixture.history.fen, moves: fixture.history.moves} : null));
  assert.equal(w.wedge.square, s.move.to); assert.equal(w.wedge.relativeRank, s.d.wedgeRank);
  assert.deepEqual(w.wedge.supporters, s.d.supporters); assert.deepEqual(w.wedge.attacks, s.attacks);
  assert.deepEqual(w.reach, s.d.reach);
  assert.ok(w.reach.every(r => r.steps === null), 'saved reach table must show no pawn can attack');
  assert.deepEqual(w.king.actual, s.actual); assert.deepEqual(w.king.counterfactual, s.without);
  assert.deepEqual(w.king.denied, s.denied); assert.equal(w.king.counterfactualFen.split(' ').slice(0, 2).join(' '), s.cfFen.split(' ').slice(0, 2).join(' '));
  // Cross-check the independent king enumeration against the rules engine for the actual set.
  const c = new Chess(w.after.fen);
  assert.deepEqual([...new Set(c.moves({verbose: true}).filter(m => m.piece === 'k').map(m => m.to))].sort(), w.king.actual);
  const rank = e => e.id === 'pawn-wedge' ? 4.3 : inherited(e);
  assert.equal(result.comment, [...result.events].sort((x, y) => rank(y) - rank(x))[0].text);
  return {state: 'proven'};
}

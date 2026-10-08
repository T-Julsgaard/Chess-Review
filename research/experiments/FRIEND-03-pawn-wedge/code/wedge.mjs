import {Chess} from '../../../../lib/chess.js';
import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent, priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';

const pieces = c => c.board().flat().filter(Boolean)
  .map(({square, type, color}) => ({square, type, color}))
  .sort((a, b) => a.square.localeCompare(b.square));
const file = square => square.charCodeAt(0) - 97;
const rel = (square, actor) => actor === 'w' ? Number(square[1]) : 9 - Number(square[1]);
const absRank = (relative, actor) => actor === 'w' ? relative : 9 - relative;
const name = (f, relative, actor) => 'abcdefgh'[f] + absRank(relative, actor);

// Squares a pawn of `actor` on `square` attacks, as absolute squares.
export function attackedBy(square, actor) {
  return [file(square) - 1, file(square) + 1].filter(f => f >= 0 && f < 8)
    .map(f => name(f, rel(square, actor) + 1, actor));
}

// Minimal pawn moves for an enemy pawn to reach any square attacking the wedge,
// allowing any captures (piece blocking ignored). Closed form: a file shift costs
// one capture, so it is reachable iff the rank distance covers the file distance.
export function reachSteps(enemyPawn, wedge, actor) {
  const targetRank = rel(wedge, actor) + 1, from = rel(enemyPawn, actor);
  const distance = from - targetRank;
  if (distance < 0) return null;
  const options = [file(wedge) - 1, file(wedge) + 1].filter(f => f >= 0 && f < 8)
    .filter(f => distance >= Math.abs(file(enemyPawn) - f));
  return options.length ? distance : null;
}

// Counterfactual: the actual played position with the wedge pawn deleted.
function withoutPawn(fen, square) {
  const c = new Chess(fen);
  c.remove(square);
  const fields = c.fen().split(' ');
  fields[3] = '-';
  try {
    const out = legalPosition(fields.join(' '));
    return out.isGameOver() ? null : out;
  } catch { return null; }
}
const kingDestinations = c => [...new Set(c.moves({verbose: true}).filter(m => m.piece === 'k').map(m => m.to))].sort();

export const priority = event => event.id === 'pawn-wedge' ? 4.3 : inherited(event);

export function explainMove(input) {
  const enabled = input.wedgeTags === undefined ? false : input.wedgeTags;
  if (typeof enabled !== 'boolean') throw Error('wedgeTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxWedgeNodes === undefined ? 50000 : input.maxWedgeNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) {
    throw Error('maxWedgeNodes must be integer 0..50000');
  }
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v64', events,
    comment: events === base.events ? base.comment
      : [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    wedgeAnalysis: {limit, nodes, status, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return finish();
  }
  const tick = () => { if (++nodes > limit) throw Error('wedge-budget'); };
  try {
    tick();
    const h = validateHistory(input), history = h ? {fen: h.start, moves: h.moves} : null;
    const c = legalPosition(history?.fen || input.fen);
    for (const move of history?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    const actor = c.turn(), enemy = actor === 'w' ? 'b' : 'w';
    tick(); const legalMoves = c.moves({verbose: true}).map(uci).sort();
    tick(); const beforeFen = c.fen();
    const move = c.move(input.move), afterFen = c.fen();
    if (afterFen !== base.after) throw Error('Parent played position differs');
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    tick(); const afterPieces = pieces(c);
    const wedgeRank = rel(move.to, actor);
    const supporters = afterPieces.filter(p => p.type === 'p' && p.color === actor
      && Math.abs(file(p.square) - file(move.to)) === 1 && rel(p.square, actor) === wedgeRank - 1).map(p => p.square);
    if (move.piece !== 'p' || move.promotion || ![5, 6].includes(wedgeRank) || !supporters.length) return finish();
    const reach = [];
    for (const p of afterPieces.filter(p => p.type === 'p' && p.color === enemy)) {
      tick(); reach.push({square: p.square, steps: reachSteps(p.square, move.to, actor)});
    }
    if (reach.some(r => r.steps !== null)) return finish();
    tick(); const counterfactual = withoutPawn(afterFen, move.to);
    if (!counterfactual) return finish();
    tick(); const actual = kingDestinations(c);
    tick(); const without = kingDestinations(counterfactual);
    const denied = without.filter(square => !actual.includes(square));
    const wedgeAttacks = attackedBy(move.to, actor);
    if (!denied.length || !denied.every(square => wedgeAttacks.includes(square))) return finish();
    tick();
    const text = `Pawn wedge: ${move.to} is supported and cannot be challenged by pawns, denying the enemy king ${denied.join(' and ')}.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
    witness = {actor, enemy, history, legalMoves,
      played: {uci: uci(move), san: move.san, from: move.from, to: move.to, piece: move.piece,
        color: move.color, captured: move.captured || null, promotion: null},
      before: {fen: beforeFen}, after: {fen: afterFen, pieces: afterPieces},
      wedge: {square: move.to, relativeRank: wedgeRank, supporters: supporters.sort(), attacks: wedgeAttacks},
      reach, king: {actual, counterfactualFen: counterfactual.fen(), counterfactual: without, denied}};
    status = 'proven';
    events = [...base.events, {id: 'pawn-wedge', text, qualityClaim: false, evidence: witness}];
  } catch (error) {
    if (error.message !== 'wedge-budget') throw error;
    status = 'exhausted'; witness = null; events = base.events;
  }
  return finish();
}

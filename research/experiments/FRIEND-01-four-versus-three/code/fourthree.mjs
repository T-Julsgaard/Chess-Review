import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent, priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';

const wings = {'a-d': 'abcd', 'e-h': 'efgh'};
const pieces = c => c.board().flat().filter(Boolean)
  .map(({square, type, color}) => ({square, type, color}))
  .sort((a, b) => a.square.localeCompare(b.square));

// Exact structural facts of one position (no evaluation).
export function summarize(list) {
  const count = (color, type) => list.filter(p => p.color === color && p.type === type).length;
  const pawns = {w: list.filter(p => p.type === 'p' && p.color === 'w').map(p => p.square),
    b: list.filter(p => p.type === 'p' && p.color === 'b').map(p => p.square)};
  const rookEnding = list.every(p => ['k', 'r', 'p'].includes(p.type)) && count('w', 'r') === 1 && count('b', 'r') === 1;
  const files = [...new Set([...pawns.w, ...pawns.b].map(s => s[0]))].sort();
  const wing = Object.keys(wings).find(name => files.length && files.every(f => wings[name].includes(f))) || null;
  const four = rookEnding && wing && [pawns.w.length, pawns.b.length].sort().join('') === '34';
  return {rookEnding, pawns, wing, counts: {w: pawns.w.length, b: pawns.b.length}, match: Boolean(four),
    rooks: list.filter(p => p.type === 'r').map(p => p.color + p.square)};
}

export const priority = event => event.id === 'four-versus-three' ? 4.2 : inherited(event);

export function explainMove(input) {
  const enabled = input.fourThreeTags === undefined ? false : input.fourThreeTags;
  if (typeof enabled !== 'boolean') throw Error('fourThreeTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxFourThreeNodes === undefined ? 50000 : input.maxFourThreeNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) {
    throw Error('maxFourThreeNodes must be integer 0..50000');
  }
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v62', events,
    comment: events === base.events ? base.comment
      : [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    fourThreeAnalysis: {limit, nodes, status, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return finish();
  }
  const tick = () => { if (++nodes > limit) throw Error('four-three-budget'); };
  try {
    tick();
    const h = validateHistory(input), history = h ? {fen: h.start, moves: h.moves} : null;
    const c = legalPosition(history?.fen || input.fen);
    for (const move of history?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    const actor = c.turn();
    tick(); const legalMoves = c.moves({verbose: true}).map(uci).sort();
    tick(); const beforeFen = c.fen(), beforePieces = pieces(c);
    const move = c.move(input.move), afterFen = c.fen();
    if (afterFen !== base.after) throw Error('Parent played position differs');
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    tick(); const afterPieces = pieces(c);
    tick(); const before = summarize(beforePieces), after = summarize(afterPieces);
    if (!after.match || before.match) return finish();
    tick();
    const major = after.counts[actor] === 4, wingName = after.wing;
    const files = wingName === 'a-d' ? 'a-d' : 'e-h';
    const text = major
      ? `Four versus three: you have four pawns against three on the ${files} files, with one rook each.`
      : `Four versus three: your opponent has four pawns against your three on the ${files} files, with one rook each.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
    witness = {actor, history, legalMoves,
      played: {uci: uci(move), san: move.san, from: move.from, to: move.to, piece: move.piece,
        color: move.color, captured: move.captured || null, promotion: move.promotion || null},
      before: {fen: beforeFen, pieces: beforePieces, ...before},
      after: {fen: afterFen, pieces: afterPieces, ...after}};
    status = 'proven';
    events = [...base.events, {id: 'four-versus-three', text, qualityClaim: false, evidence: witness}];
  } catch (error) {
    if (error.message !== 'four-three-budget') throw error;
    status = 'exhausted'; witness = null; events = base.events;
  }
  return finish();
}

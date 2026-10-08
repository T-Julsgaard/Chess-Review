import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent, priority as inherited} from '../../E080-pawn-shield-defense/code/shield.mjs';

const pieces = c => c.board().flat().filter(Boolean)
  .map(({square, type, color}) => ({square, type, color}))
  .sort((a, b) => a.square.localeCompare(b.square));
const flip = square => square[0] + (9 - Number(square[1]));
const key = p => p.color + p.type + p.square;

// Exact colour-mirror facts. A White pawn on (f, r) pairs with a Black pawn on (f, 9-r).
export function summarize(list) {
  const pawns = {w: list.filter(p => p.type === 'p' && p.color === 'w').map(p => p.square),
    b: list.filter(p => p.type === 'p' && p.color === 'b').map(p => p.square)};
  const blackSet = new Set(pawns.b);
  const pairs = pawns.w.map(white => ({white, black: flip(white)})).filter(pair => blackSet.has(pair.black));
  const mirror = pawns.w.length >= 3 && pairs.length === pawns.w.length && pawns.w.length === pawns.b.length;
  const others = new Set(list.filter(p => p.type !== 'p').map(key));
  const piecesAlsoMirror = list.filter(p => p.type !== 'p')
    .every(p => others.has((p.color === 'w' ? 'b' : 'w') + p.type + flip(p.square)));
  return {pawns, pairs, mirror, files: [...new Set(pawns.w.map(s => s[0]))].sort(), piecesAlsoMirror};
}

export const priority = event => event.id === 'symmetrical-pawns' ? 4.1 : inherited(event);

export function explainMove(input) {
  const enabled = input.symmetryTags === undefined ? false : input.symmetryTags;
  if (typeof enabled !== 'boolean') throw Error('symmetryTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxSymmetryNodes === undefined ? 50000 : input.maxSymmetryNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) {
    throw Error('maxSymmetryNodes must be integer 0..50000');
  }
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v63', events,
    comment: events === base.events ? base.comment
      : [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    symmetryAnalysis: {limit, nodes, status, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return finish();
  }
  const tick = () => { if (++nodes > limit) throw Error('symmetry-budget'); };
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
    if (!after.mirror || before.mirror) return finish();
    tick();
    const text = `Symmetrical pawns: both sides mirror each other's pawns on the ${after.files.join(', ')} files.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
    witness = {actor, history, legalMoves,
      played: {uci: uci(move), san: move.san, from: move.from, to: move.to, piece: move.piece,
        color: move.color, captured: move.captured || null, promotion: move.promotion || null},
      before: {fen: beforeFen, pieces: beforePieces, ...before},
      after: {fen: afterFen, pieces: afterPieces, ...after}};
    status = 'proven';
    events = [...base.events, {id: 'symmetrical-pawns', text, qualityClaim: false, evidence: witness}];
  } catch (error) {
    if (error.message !== 'symmetry-budget') throw error;
    status = 'exhausted'; witness = null; events = base.events;
  }
  return finish();
}

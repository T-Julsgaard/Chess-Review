import {legalPosition, uci} from './E020-concepts.mjs';
import {validateHistory} from './E024-transitions.mjs';
import {turnBoard} from './E027-defense.mjs';
import {query} from './E029-mates.mjs';
import {explainMove as parent, priority as inheritedPriority} from './E079-center.mjs';

const army = c => c.board().flat().filter(Boolean)
  .map(({square, type, color}) => ({square, type, color}))
  .sort((a, b) => a.square.localeCompare(b.square));
const file = square => square.charCodeAt(0) - 97;
const cover = (pieces, king, actor) => pieces.filter(p => p.type === 'p' && p.color === actor
  && Math.abs(file(p.square) - file(king)) <= 1
  && [1, 2].includes((Number(p.square[1]) - Number(king[1])) * (actor === 'w' ? 1 : -1)))
  .map(p => p.square).sort();
function ray(from, to) {
  const dx = file(to) - file(from), dy = Number(to[1]) - Number(from[1]);
  if ((!dx && !dy) || (dx && dy && Math.abs(dx) !== Math.abs(dy))) return null;
  return Array.from({length: Math.max(Math.abs(dx), Math.abs(dy)) - 1}, (_, index) =>
    String.fromCharCode(97 + file(from) + Math.sign(dx) * (index + 1))
      + (Number(from[1]) + Math.sign(dy) * (index + 1)));
}
export const priority = event => event.id === 'pawn-shield-defense' ? 155 : inheritedPriority(event);

export function explainMove(input) {
  const enabled = input.pawnShieldTags === undefined ? false : input.pawnShieldTags;
  if (typeof enabled !== 'boolean') throw Error('pawnShieldTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxPawnShieldNodes === undefined ? 50000 : input.maxPawnShieldNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) {
    throw Error('maxPawnShieldNodes must be integer 0..50000');
  }
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, beforeProof = null, afterProof = null;
  let events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v61', events,
    comment: [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    pawnShieldAnalysis: {limit, nodes, status, beforeProof, afterProof, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return finish();
  }
  const budget = {tick() { if (++nodes > limit) throw Error('pawn-shield-budget'); }};
  try {
    budget.tick();
    const h = validateHistory(input), history = h ? {fen: h.start, moves: h.moves} : null;
    const c = legalPosition(history?.fen || input.fen);
    for (const move of history?.moves || []) { budget.tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    const actor = c.turn(), enemy = actor === 'w' ? 'b' : 'w', rootCheck = c.isCheck();
    budget.tick(); const legalMoves = c.moves({verbose: true}).map(uci).sort();
    budget.tick(); const beforeFen = c.fen(), move = c.move(input.move), afterFen = c.fen();
    if (afterFen !== base.after) throw Error('Parent played position differs');
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    const afterCheck = c.isCheck();
    budget.tick(); const afterPieces = army(c);
    c.undo(); budget.tick(); const beforePieces = army(c);
    const beforeKing = beforePieces.find(p => p.color === actor && p.type === 'k').square;
    const afterKing = afterPieces.find(p => p.color === actor && p.type === 'k').square;
    budget.tick(); const beforeCover = cover(beforePieces, beforeKing, actor);
    budget.tick(); const afterCover = cover(afterPieces, afterKing, actor);
    if (move.piece !== 'p' || move.captured || move.promotion || rootCheck || afterCheck
      || beforeKing !== afterKing || !['c', 'e', 'g'].includes(beforeKing[0])
      || Number(beforeKing[1]) !== (actor === 'w' ? 1 : 8)
      || !beforeCover.includes(move.from) || !afterCover.includes(move.to)) return finish();
    budget.tick(); const hypothetical = turnBoard(c, enemy);
    if (hypothetical.isGameOver()) return finish();
    beforeProof = query(hypothetical, enemy, 1, budget);
    if (!beforeProof.tree.win) return finish();
    const mating = hypothetical.moves({verbose: true}).find(m => uci(m) === beforeProof.tree.move);
    budget.tick(); const cells = ray(mating.from, mating.to);
    if (!['q', 'r', 'b'].includes(mating.piece) || mating.captured !== 'p'
      || mating.to !== move.from || !cells?.includes(move.to)
      || cells.some(square => hypothetical.get(square))) return finish();
    c.move(input.move);
    if (c.moves({verbose: true}).some(m => uci(m) === uci(mating))) return finish();
    const blocker = c.get(move.to), attacker = c.get(mating.from);
    if (blocker?.type !== 'p' || blocker.color !== actor
      || attacker?.type !== mating.piece || attacker.color !== enemy) return finish();
    afterProof = query(c, enemy, 1, budget);
    if (afterProof.tree.win) return finish();
    budget.tick();
    witness = {actor, enemy, history, legalMoves,
      played: {uci: uci(move), san: move.san, from: move.from, to: move.to,
        piece: move.piece, color: move.color, captured: null, promotion: null, flags: move.flags},
      before: {fen: beforeFen, pieces: beforePieces, king: beforeKing, cover: beforeCover},
      after: {fen: afterFen, pieces: afterPieces, king: afterKing, cover: afterCover},
      hypotheticalOpponentFen: hypothetical.fen(),
      blockedCapture: {uci: uci(mating), san: mating.san, from: mating.from, to: mating.to,
        piece: mating.piece, color: mating.color, captured: mating.captured,
        cells, beforeBlockers: [], afterBlockers: [{square: move.to, type: 'p', color: actor}]}};
    status = 'proven';
    const text = `Pawn shield: ${move.to} blocks ${enemy === 'b' ? '...' : ''}${mating.san}, with no immediate mate remaining.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
    events = [...base.events, {id: 'pawn-shield-defense', text, qualityClaim: false,
      evidence: {witness, beforeProof, afterProof}}];
  } catch (error) {
    if (error.message !== 'pawn-shield-budget') throw error;
    status = 'exhausted'; witness = null; beforeProof = null; afterProof = null; events = base.events;
  }
  return finish();
}

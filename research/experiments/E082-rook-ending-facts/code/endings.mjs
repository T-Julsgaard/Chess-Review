import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent, priority as inherited} from '../../E081-direct-attacks/code/attacks.mjs';
import {replay as replayOldSide} from '../../E057-rook-checking-distance/code/replay.mjs';
const inventory = c => c.board().flat().filter(Boolean).map(({square, type, color}) => ({square, type, color}))
  .sort((a, b) => a.square.localeCompare(b.square));
function summary(pieces) {
  const pawns = {w: pieces.filter(p => p.type === 'p' && p.color === 'w').map(p => p.square),
    b: pieces.filter(p => p.type === 'p' && p.color === 'b').map(p => p.square)};
  const rooks = pieces.filter(p => p.type === 'r'), kings = pieces.filter(p => p.type === 'k');
  const counts = {w: pawns.w.length, b: pawns.b.length};
  const rookEnding = pieces.every(p => 'krp'.includes(p.type)) && ['w', 'b'].every(color => rooks.filter(p => p.color === color).length === 1);
  const files = [...new Set([...pawns.w, ...pawns.b].map(s => s[0]))].sort();
  const wing = files.length && files.every(f => 'abcd'.includes(f)) ? 'a-d'
    : files.length && files.every(f => 'efgh'.includes(f)) ? 'e-h' : files.length ? 'split' : 'none';
  const pair = [counts.w, counts.b].sort((a, b) => a - b).join('/');
  return {pawns, rooks, kings, counts, files, wing, rookEnding,
    fourThree: rookEnding && pair === '3/4', threeTwo: rookEnding && pair === '2/3'};
}
const record = m => ({uci: uci(m), san: m.san, from: m.from, to: m.to, piece: m.piece, color: m.color,
  captured: m.captured || null, promotion: m.promotion || null, flags: m.flags});
export const priority = e => ({'side-check-proof': 76.4, 'rook-four-three': 30.2, 'rook-three-two': 30.2}[e.id] ?? inherited(e));
export function explainMove(input) {
  const enabled = input.rookEndingTags === undefined ? false : input.rookEndingTags;
  if (typeof enabled !== 'boolean') throw Error('rookEndingTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxRookEndingNodes === undefined ? 50000 : input.maxRookEndingNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxRookEndingNodes must be integer 0..50000');
  const base = parent(input); let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v63', events,
    comment: events === base.events ? base.comment : [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    rookEndingAnalysis: {limit, nodes, status, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return finish(); }
  const tick = () => { if (++nodes > limit) throw Error('rook-ending-budget'); };
  try {
    tick(); const h = validateHistory(input), history = h ? {fen: h.start, moves: h.moves} : null;
    const c = legalPosition(history?.fen || input.fen);
    for (const value of history?.moves || []) { tick(); c.move(value); }
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    const actor = c.turn(), beforeFen = c.fen(); tick(); const legalMoves = c.moves({verbose: true}).map(uci).sort();
    tick(); const move = c.move(input.move), afterFen = c.fen();
    if (afterFen !== base.after) throw Error('Parent played position differs');
    if (c.isGameOver()) { status = 'not-live'; return finish(); }
    c.undo(); tick(); const beforePieces = inventory(c); c.move(input.move);
    tick(); const afterPieces = inventory(c);
    tick(); const before = summary(beforePieces); tick(); const after = summary(afterPieces);
    if (!after.rookEnding) return finish();
    tick(); const king = after.kings.find(p => p.color !== actor), checkers = c.attackers(king.square, actor).sort();
    let side = null; const categories = [], extra = [];
    if (move.piece === 'r' && c.isCheck() && move.to[1] === king.square[1]) {
      const cells = [], step = Math.sign(king.square.charCodeAt(0) - move.to.charCodeAt(0));
      for (let x = move.to.charCodeAt(0) + step; x !== king.square.charCodeAt(0); x += step) {
        tick(); const square = String.fromCharCode(x) + move.to[1]; cells.push({square, piece: c.get(square) || null});
      }
      if (cells.every(cell => !cell.piece) && checkers.includes(move.to)) {
        tick(); const legal = c.moves({verbose: true}), replies = [];
        for (const reply of legal) {
          tick(); c.move(uci(reply)); replies.push({...record(reply), fen: c.fen(), check: c.isCheck(),
            checkmate: c.isCheckmate(), draw: c.isDraw(), terminal: c.isGameOver()}); c.undo();
        }
        const reuseIndex = base.events.findIndex(e => e.id === 'side-rook-check');
        if (reuseIndex >= 0) {
          tick(); const old = base.events[reuseIndex]; replayOldSide(input, old);
          if (old.evidence.checker.square !== move.to || old.evidence.king.square !== king.square
            || JSON.stringify(old.evidence.ray) !== JSON.stringify(cells.map(r => r.square))) throw Error('Inherited side proof differs');
        }
        side = {checker: {square: move.to, type: 'r', color: actor}, king, checkers, cells, replies, reuseIndex};
        categories.push('side-check');
      }
    }
    if (after.fourThree && !before.fourThree) categories.push('four-three');
    if (after.threeTwo && !before.threeTwo) categories.push('three-two');
    if (!categories.length) return finish();
    witness = {actor, history, legalMoves, played: record(move), before: {fen: beforeFen, pieces: beforePieces, ...before},
      after: {fen: afterFen, pieces: afterPieces, ...after}, side, categories};
    const add = (id, text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
      extra.push({id, text, qualityClaim: false, evidence: witness}); };
    if (side && side.reuseIndex < 0) add('side-check-proof', `Side check: ${move.san} checks king ${king.square} along rank ${king.square[1]}.`);
    for (const [category, id, large, small, label] of [['four-three', 'rook-four-three', 4, 3, 'Four versus three'],
      ['three-two', 'rook-three-two', 3, 2, 'Three versus two']]) {
      if (!categories.includes(category)) continue;
      const text = after.counts[actor] === large ? `${label}: you have ${large === 4 ? 'four' : 'three'} pawns against ${small === 3 ? 'three' : 'two'}, with one rook each.`
        : `${label}: your opponent has ${large === 4 ? 'four' : 'three'} pawns against your ${small === 3 ? 'three' : 'two'}, with one rook each.`;
      add(id, text);
    }
    status = 'proven'; if (extra.length) events = [...base.events, ...extra];
  } catch (error) {
    if (error.message !== 'rook-ending-budget') throw error;
    status = 'exhausted'; witness = null; events = base.events;
  }
  return finish();
}

import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {turnBoard} from '../../E027-defensive-resources/code/defense.mjs';
import {explainMove as parent, priority as previousPriority} from '../../E080-pawn-shield-defense/code/shield.mjs';
const names = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const inventory = c => c.board().flat().filter(Boolean)
  .map(({square, type, color}) => ({square, type, color})).sort((a, b) => a.square.localeCompare(b.square));
function cells(c, from, to) {
  if (!['b', 'r', 'q'].includes(c.get(from).type)) return [];
  const dx = to.charCodeAt(0) - from.charCodeAt(0), dy = Number(to[1]) - Number(from[1]);
  return Array.from({length: Math.max(Math.abs(dx), Math.abs(dy)) - 1}, (_, i) =>
    String.fromCharCode(from.charCodeAt(0) + Math.sign(dx) * (i + 1)) + (Number(from[1]) + Math.sign(dy) * (i + 1)));
}
export const priority = e => ({'direct-attack': 38, 'attack-on-pawn': 37, 'attack-on-piece': 37}[e.id] ?? previousPriority(e));
export function explainMove(input) {
  const enabled = input.directAttackTags === undefined ? false : input.directAttackTags;
  if (typeof enabled !== 'boolean') throw Error('directAttackTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxDirectAttackNodes === undefined ? 50000 : input.maxDirectAttackNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxDirectAttackNodes must be integer 0..50000');
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const finish = () => ({...base, schema: 'coach-concepts-v62', events,
    comment: [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    directAttackAnalysis: {limit, nodes, status, witness}});
  if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return finish(); }
  const tick = () => { if (++nodes > limit) throw Error('direct-attack-budget'); };
  try {
    tick(); const h = validateHistory(input), history = h ? {fen: h.start, moves: h.moves} : null;
    const before = legalPosition(history?.fen || input.fen);
    for (const value of history?.moves || []) { tick(); before.move(value); }
    if (before.isGameOver()) { status = 'not-live'; return finish(); }
    const actor = before.turn(), rootCheck = before.isCheck(), beforeFen = before.fen();
    tick(); const legalMoves = before.moves({verbose: true}).map(uci).sort();
    tick(); const move = before.move(input.move), afterFen = before.fen();
    if (afterFen !== base.after) throw Error('Parent played position differs');
    if (before.isGameOver()) { status = 'not-live'; return finish(); }
    if (rootCheck || before.isCheck()) return finish();
    const after = before; tick(); const afterPieces = inventory(after);
    after.undo(); tick(); const beforePieces = inventory(before); before.move(input.move);
    const root = legalPosition(beforeFen), contacts = [];
    for (const target of afterPieces.filter(p => p.color !== actor && p.type !== 'k')) {
      tick();
      if (!after.attackers(target.square, actor).includes(move.to)
        || root.attackers(target.square, actor).includes(move.from)) continue;
      contacts.push({target, cells: cells(after, move.to, target.square)});
    }
    if (!contacts.length) return finish();
    tick(); const hypothetical = turnBoard(after, actor);
    tick(); const legal = hypothetical.moves({verbose: true}), hypotheticalLegalMoves = legal.map(uci).sort();
    const targets = [];
    for (const contact of contacts) {
      tick(); const captures = legal.filter(m => m.from === move.to && m.to === contact.target.square
        && m.captured === contact.target.type && !m.isEnPassant()).map(uci).sort();
      if (captures.length) targets.push({...contact, captures});
    }
    if (!targets.length) return finish();
    witness = {actor, history, legalMoves, before: {fen: beforeFen, pieces: beforePieces},
      after: {fen: afterFen, pieces: afterPieces},
      played: {uci: uci(move), from: move.from, to: move.to, piece: move.piece,
        color: move.color, captured: move.captured || null, promotion: move.promotion || null,
        flags: move.flags, san: move.san}, attacker: after.get(move.to).type,
      hypotheticalActorFen: hypothetical.fen(), hypotheticalLegalMoves, contacts, targets};
    const extra = [], add = (id, subset) => {
      tick(); const t = subset[0].target, category = t.type === 'p' ? 'pawn' : 'piece';
      const prefix = id === 'direct-attack' ? 'Direct attack on a ' : 'Attack on a ';
      const text = `${prefix}${category}: your ${names[witness.attacker]} on ${move.to} attacks ${names[t.type]} ${t.square}.`;
      if (text.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
      extra.push({id, text, qualityClaim: false, evidence: {witness, targets: subset.map(r => r.target.square)}});
    };
    add('direct-attack', targets);
    const pawns = targets.filter(r => r.target.type === 'p'), pieces = targets.filter(r => r.target.type !== 'p');
    if (pawns.length) add('attack-on-pawn', pawns);
    if (pieces.length) add('attack-on-piece', pieces);
    events = [...base.events, ...extra]; status = 'proven';
  } catch (error) {
    if (error.message !== 'direct-attack-budget') throw error;
    status = 'exhausted'; witness = null; events = base.events;
  }
  return finish();
}

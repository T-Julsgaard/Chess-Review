import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {explainMove as parent, priority as inheritedPriority} from '../../E080-pawn-shield-defense/code/shield.mjs';
const uci = m => m.from + m.to + (m.promotion || '');
const names = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
function inventory(c) {
  const pieces = [];
  for (const file of 'abcdefgh') for (let rank = 1; rank <= 8; rank++) {
    const square = file + rank, p = c.get(square); if (p) pieces.push({square, type: p.type, color: p.color});
  }
  return pieces;
}
function contact(c, from, to) {
  const p = c.get(from), dx = to.charCodeAt(0) - from.charCodeAt(0), dy = Number(to[1]) - Number(from[1]);
  if (!p || (!dx && !dy)) return null;
  if (p.type === 'p') return Math.abs(dx) === 1 && dy === (p.color === 'w' ? 1 : -1) ? [] : null;
  if (p.type === 'n') return Math.abs(dx) * Math.abs(dy) === 2 ? [] : null;
  if (p.type === 'k') return Math.max(Math.abs(dx), Math.abs(dy)) === 1 ? [] : null;
  const diagonal = Math.abs(dx) === Math.abs(dy), straight = dx === 0 || dy === 0;
  if (!(p.type === 'b' ? diagonal : p.type === 'r' ? straight : diagonal || straight)) return null;
  const cells = []; let x = from.charCodeAt(0) + Math.sign(dx), y = Number(from[1]) + Math.sign(dy);
  while (x !== to.charCodeAt(0) || y !== Number(to[1])) {
    const s = String.fromCharCode(x) + y; if (c.get(s)) return null; cells.push(s); x += Math.sign(dx); y += Math.sign(dy);
  }
  return cells;
}
export function replayResult(f, result) {
  const base = parent(f);
  if (f.directAttackTags === undefined || f.directAttackTags === false) { assert.deepEqual(result, base); return {state: 'disabled', certificates: 0}; }
  const limit = f.maxDirectAttackNodes === undefined ? 50000 : f.maxDirectAttackNodes;
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const charge = () => { if (++nodes > limit) throw Error('replay-quota'); };
  try {
    if (base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') status = 'not-applicable';
    else {
      charge(); const root = new Chess(f.history?.fen || f.fen);
      for (const value of f.history?.moves || []) { charge(); assert.ok(!root.isGameOver()); root.move(value); }
      assert.equal(root.fen(), new Chess(f.fen).fen());
      if (root.isGameOver()) status = 'not-live';
      else {
        const actor = root.turn(), beforeFen = root.fen(), rootCheck = root.isCheck();
        charge(); const legalMoves = root.moves({verbose: true}).map(uci).sort();
        charge(); const move = root.move(f.move), afterFen = root.fen(); assert.equal(afterFen, base.after);
        if (root.isGameOver()) status = 'not-live';
        else if (!rootCheck && !root.isCheck()) {
          charge(); const afterPieces = inventory(root); root.undo(); charge(); const beforePieces = inventory(root);
          const before = new Chess(beforeFen); root.move(f.move);
          const contacts = [];
          for (const target of afterPieces.filter(p => p.color !== actor && p.type !== 'k')) {
            charge(); const cells = contact(root, move.to, target.square);
            if (cells !== null && contact(before, move.from, target.square) === null) contacts.push({target, cells});
          }
          if (contacts.length) {
            charge(); const fields = afterFen.split(' '); if (fields[1] !== actor) { fields[1] = actor; fields[3] = '-'; }
            const hypothetical = new Chess(fields.join(' '));
            charge(); const legal = hypothetical.moves({verbose: true}), hypotheticalLegalMoves = legal.map(uci).sort();
            const targets = [];
            for (const row of contacts) {
              charge(); const captures = legal.filter(m => m.from === move.to && m.to === row.target.square
                && m.captured === row.target.type && !m.flags.includes('e')).map(uci).sort();
              if (captures.length) targets.push({...row, captures});
            }
            if (targets.length) {
              witness = {actor, history: f.history ? {fen: f.history.fen, moves: [...f.history.moves]} : null,
                legalMoves, before: {fen: beforeFen, pieces: beforePieces}, after: {fen: afterFen, pieces: afterPieces},
                played: {uci: uci(move), from: move.from, to: move.to, piece: move.piece, color: move.color,
                  captured: move.captured || null, promotion: move.promotion || null, flags: move.flags, san: move.san},
                attacker: root.get(move.to).type, hypotheticalActorFen: hypothetical.fen(), hypotheticalLegalMoves, contacts, targets};
              const extra = [];
              for (const [id, subset] of [['direct-attack', targets], ['attack-on-pawn', targets.filter(r => r.target.type === 'p')],
                ['attack-on-piece', targets.filter(r => r.target.type !== 'p')]]) {
                if (!subset.length) continue; charge(); const t = subset[0].target;
                const prefix = id === 'direct-attack' ? 'Direct attack on a ' : 'Attack on a ';
                extra.push({id, text: `${prefix}${t.type === 'p' ? 'pawn' : 'piece'}: your ${names[witness.attacker]} on ${move.to} attacks ${names[t.type]} ${t.square}.`,
                  qualityClaim: false, evidence: {witness, targets: subset.map(r => r.target.square)}});
              }
              events = [...base.events, ...extra]; status = 'proven';
            }
          }
        }
      }
    }
  } catch (error) { if (error.message !== 'replay-quota') throw error; status = 'exhausted'; witness = null; events = base.events; }
  const priority = e => ({'direct-attack': 38, 'attack-on-pawn': 37, 'attack-on-piece': 37}[e.id] ?? inheritedPriority(e));
  assert.deepEqual(result, {...base, schema: 'coach-concepts-v62', events,
    comment: [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null,
    directAttackAnalysis: {limit, nodes, status, witness}});
  return {state: status, certificates: witness ? 1 : 0};
}

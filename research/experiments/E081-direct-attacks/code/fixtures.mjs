import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
export {reflect} from '../../E080-pawn-shield-defense/code/fixtures.mjs';
export const candidate = {id: 'knight-attacks-pawn', fen: setup({a1: 'K', a7: null, h8: 'k', b1: 'N', a4: 'p'}),
  move: 'b1c3', directAttackTags: true, scanReplies: false, expectedStatus: 'proven', expected: ['direct-attack', 'attack-on-pawn']};
export const fixtures = [candidate, {...candidate, id: 'knight-attacks-piece',
  fen: setup({a1: 'K', a7: null, h8: 'k', b1: 'N', a4: 'n'}), expected: ['direct-attack', 'attack-on-piece']},
  {...candidate, id: 'defended-pawn', fen: setup({a1: 'K', a7: null, h8: 'k', b1: 'N', a4: 'p', b5: 'b'})},
  {...candidate, id: 'disabled', directAttackTags: false, expectedStatus: 'disabled', expected: []},
  {...candidate, id: 'zero-budget', maxDirectAttackNodes: 0, expectedStatus: 'exhausted', expected: []}];
const add = (id, pieces, move, expectedStatus = 'proven', expected = ['direct-attack', 'attack-on-piece']) => fixtures.push({
  ...candidate, id, fen: setup({a7: null, ...pieces}), move, expectedStatus, expected});
add('pawn-diagonal', {c2: 'P', d4: 'p'}, 'c2c3', 'proven', ['direct-attack', 'attack-on-pawn']);
add('king-adjacency', {a1: 'K', c3: 'n'}, 'a1b2');
add('bishop-diagonal', {c1: 'B', c3: 'p'}, 'c1d2', 'proven', ['direct-attack', 'attack-on-pawn']);
add('rook-orthogonal', {b1: 'R', d2: 'n'}, 'b1b2');
add('queen-orthogonal-original-checked-enemy', {h8: null, h7: 'k', b1: 'Q', d2: 'n'}, 'b1b2');
Object.assign(fixtures.at(-1), {inputError: true, expectedError: 'non-moving king is in check'});
add('queen-orthogonal', {h8: null, h6: 'k', b1: 'Q', d2: 'n'}, 'b1b2');
for (const type of ['b', 'r', 'q']) add('knight-target-' + type, {b1: 'N', a4: type, a2: 'P'}, 'b1c3');
add('pinned-rook-contact', {a1: null, e1: 'K', e2: 'R', e8: 'r', a3: 'n'}, 'e2e3', 'no-new-fact', []);
add('blocked-rook-contact', {b1: 'R', c2: 'P', d2: 'n'}, 'b1b2', 'no-new-fact', []);
add('friendly-target', {b1: 'R', d2: 'N'}, 'b1b2', 'no-new-fact', []);
add('king-target-check', {h8: null, d2: 'k', b1: 'R'}, 'b1b2', 'no-new-fact', []);
add('unchanged-rook-contact', {b1: 'R', b4: 'n'}, 'b1b2', 'no-new-fact', []);
add('queen-checking-contact', {b1: 'Q', d2: 'n'}, 'b1b2', 'no-new-fact', []);
const historyMoves = ['b1c3', 'h8g8', 'c3b1', 'g8h8'], board = new Chess(candidate.fen);
for (const move of historyMoves) board.move(move);
fixtures.push({...candidate, id: 'valid-history', fen: board.fen(), history: {fen: candidate.fen, moves: historyMoves}});
const mirror = square => String.fromCharCode(201 - square.charCodeAt(0)) + square[1];
const mirrored = new Chess(); mirrored.clear();
for (const rank of new Chess(candidate.fen).board()) for (const piece of rank) if (piece) {
  mirrored.put({type: piece.type, color: piece.color}, mirror(piece.square));
}
fixtures.push({...candidate, id: 'literal-file-mirror', fen: mirrored.fen().split(' ')[0] + ' w - - 0 1',
  move: mirror(candidate.move.slice(0, 2)) + mirror(candidate.move.slice(2, 4))});

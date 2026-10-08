import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
import {fixtures as parentFixtures} from '../../E080-pawn-shield-defense/code/fixtures.mjs';
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
add('bishop-long-diagonal', {c1: 'B', a5: 'n'}, 'c1d2');
add('bishop-diagonal-blocker', {c1: 'B', c3: 'P', a5: 'n'}, 'c1d2', 'no-new-fact', []);
add('rook-orthogonal', {b1: 'R', d2: 'n'}, 'b1b2');
add('rook-vertical', {b1: 'R', c4: 'n'}, 'b1c1');
add('queen-orthogonal-original-checked-enemy', {h8: null, h7: 'k', b1: 'Q', d2: 'n'}, 'b1b2');
Object.assign(fixtures.at(-1), {inputError: true, expectedError: 'non-moving king is in check'});
add('queen-orthogonal', {h8: null, h6: 'k', b1: 'Q', d2: 'n'}, 'b1b2');
add('queen-long-diagonal', {h8: null, h6: 'k', b1: 'Q', e5: 'n'}, 'b1b2');
add('queen-diagonal-blocker', {h8: null, h6: 'k', b1: 'Q', c3: 'P', e5: 'n'}, 'b1b2', 'no-new-fact', []);
add('pawn-straight-is-not-capture', {c2: 'P', c4: 'p'}, 'c2c3', 'no-new-fact', []);
add('king-target-defended', {c3: 'n', d4: 'b'}, 'a1b2', 'no-new-fact', []);
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
add('capture-then-contact', {a1: null, h1: 'K', b1: 'N', c3: 'b', a4: 'p'}, 'b1c3', 'proven', ['direct-attack', 'attack-on-pawn']);
add('knight-promotion-contact', {a7: 'P', c7: 'p'}, 'a7a8n', 'proven', ['direct-attack', 'attack-on-pawn']);
add('queen-promotion-contact', {h8: null, h6: 'k', a7: 'P', c8: 'n'}, 'a7a8q');
add('all-capture-promotion-choices', {b6: 'P', a2: 'P', a8: 'r', c8: 'n'}, 'b6b7');
const epStart = setup({a7: null, c5: 'P', d7: 'p', e7: 'p'}, 'b'), epBoard = new Chess(epStart);
epBoard.move('d7d5');
fixtures.push({...candidate, id: 'en-passant-actual-contact', fen: epBoard.fen(), move: 'c5d6',
  history: {fen: epStart, moves: ['d7d5']}});
add('double-step-clears-hypothetical-ep', {c2: 'P', d4: 'p', d5: 'p'}, 'c2c4', 'proven', ['direct-attack', 'attack-on-pawn']);
add('en-passant-is-not-occupied-contact', {c2: 'P', d4: 'p'}, 'c2c4', 'no-new-fact', []);
add('castling-king-new-contact', {a1: null, e1: 'K', h1: 'R', h8: null, a8: 'k', h2: 'r'}, 'e1g1');
fixtures.at(-1).fen = fixtures.at(-1).fen.replace(' w - - ', ' w K - ');
add('castling-secondary-rook-only', {a1: null, e1: 'K', h1: 'R', h8: null, a8: 'k', f4: 'n'}, 'e1g1', 'no-new-fact', []);
fixtures.at(-1).fen = fixtures.at(-1).fen.replace(' w - - ', ' w K - ');
add('multiple-categories', {b1: 'N', a4: 'p', e4: 'n'}, 'b1c3', 'proven', ['direct-attack', 'attack-on-pawn', 'attack-on-piece']);
add('discovered-other-piece-only', {a1: 'R', e1: 'K', a2: 'B', a5: 'n'}, 'a2c4', 'no-new-fact', []);
add('higher-mate-warning', {a1: null, g1: 'K', f2: 'P', g2: 'P', b1: 'N', a4: 'p', g4: 'q', f3: 'b'},
  'b1c3', 'proven', ['direct-attack', 'attack-on-pawn']);
fixtures.at(-1).parentSelectedId = 'allows-mate';
for (const [id, value] of [['null', null], ['number', 1], ['string', 'true']]) {
  fixtures.push({...candidate, id: 'bad-flag-' + id, directAttackTags: value, inputError: true, expectedError: 'boolean'});
}
for (const [id, value] of [['null', null], ['negative', -1], ['fraction', .5], ['over', 50001]]) {
  fixtures.push({...candidate, id: 'bad-limit-' + id, maxDirectAttackNodes: value, inputError: true, expectedError: 'integer'});
}
fixtures.push({...candidate, id: 'default-disabled', directAttackTags: undefined, expectedStatus: 'disabled', expected: []},
  {...candidate, id: 'one-budget', maxDirectAttackNodes: 1, expectedStatus: 'exhausted', expected: []},
  {...candidate, id: 'history-mismatch', history: {fen: candidate.fen, moves: ['b1c3']}, inputError: true, expectedError: 'final FEN'},
  {...candidate, id: 'history-illegal', history: {fen: candidate.fen, moves: ['b1b6']}, inputError: true, expectedError: 'illegal move'},
  {...candidate, id: 'history-null', history: null, inputError: true, expectedError: 'Invalid history'});
for (const id of ['foundation-rejected', 'foundation-exhausted', 'foundation-terminal-root',
  'dead-promotion', 'valid-history', 'repetition-root', 'clock-root', 'foundation-clock-root',
  'malformed-fen', 'malformed-uci', 'ordinary-illegal', 'default-dead-root', 'actual-dead-capture',
  'root-mate', 'root-stalemate', 'foundation-root-mate', 'foundation-root-stalemate', 'actual-mate', 'actual-stalemate']) {
  const old = parentFixtures.find(f => f.id === 'guard-' + id);
  if (!old) throw Error('Missing inherited guard ' + id);
  const {pawnShieldTags, maxPawnShieldNodes, expectedStatus, expected, absent, ...rest} = old;
  fixtures.push({...rest, directAttackTags: true, scanReplies: false,
    expectedStatus: expectedStatus === 'not-applicable' ? 'not-applicable'
      : ['dead-promotion', 'repetition-root', 'actual-dead-capture', 'actual-mate', 'actual-stalemate'].includes(id)
        ? 'not-live' : 'no-new-fact', expected: []});
}

// Authored synthetic positions. No real games; no claim about real players.
// White pawn on (f, r) pairs with a Black pawn on (f, 9-r).
import {boardFen, reflect} from '../../FRIEND-shared/lib.mjs';

const fx = (id, pieces, move, expectedStatus, rest = {}) =>
  ({id, fen: boardFen(pieces), move, expectedStatus, ...rest});
const kings = {e1: 'K', e8: 'k'};

const positives = [
  fx('pawn-advance-completes', {...kings, a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c6: 'p'}, 'c2c3', 'proven'),
  fx('four-pawn-advance', {...kings, a2: 'P', b2: 'P', c2: 'P', d2: 'P', a7: 'p', b7: 'p', c7: 'p', d6: 'p'}, 'd2d3', 'proven'),
  fx('pawn-capture-completes', {g1: 'K', e8: 'k', a2: 'P', c4: 'P', d2: 'P', a7: 'p', d7: 'p', b4: 'p', b5: 'p'}, 'c4b5', 'proven'),
  fx('piece-captures-extra-pawn', {...kings, f3: 'B', a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c7: 'p', d5: 'p'}, 'f3d5', 'proven'),
  fx('promotion-removes-extra-pawn', {e1: 'K', h8: 'k', a2: 'P', b2: 'P', c2: 'P', d7: 'P', a7: 'p', b7: 'p', c7: 'p'}, 'd7d8q', 'proven'),
  {id: 'eight-pawn-full-army', fen: 'rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1', move: 'e2e3', expectedStatus: 'proven'},
];
const historyRoot = {...kings, g1: 'N', g8: 'n', a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c6: 'p'};
const historyCase = {id: 'advance-after-history',
  fen: boardFen({...kings, f3: 'N', f6: 'n', a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c6: 'p'}).replace(' 0 1', ' 2 2'),
  move: 'c2c3', expectedStatus: 'proven', history: {fen: boardFen(historyRoot), moves: ['g1f3', 'g8f6']}};

const negatives = [
  fx('symmetry-destroyed-by-pawn-move', {...kings, a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c7: 'p'}, 'c2c3', 'no-new-fact'),
  fx('one-pawn-off-by-a-rank', {...kings, a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c6: 'p'}, 'b2b3', 'no-new-fact'),
  fx('file-shifted', {...kings, a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', d7: 'p'}, 'e1e2', 'no-new-fact'),
  fx('extra-pawn-one-side', {...kings, a2: 'P', b2: 'P', c2: 'P', d2: 'P', a7: 'p', b7: 'p', c7: 'p'}, 'a2a3', 'no-new-fact'),
  fx('only-two-pawns-each', {...kings, a2: 'P', b2: 'P', a7: 'p', b6: 'p'}, 'b2b3', 'no-new-fact'),
  // A bare K v K position is a dead (terminal) position, so the first draft failed; rooks keep it live.
  fx('no-pawns', {...kings, a1: 'R', a8: 'r'}, 'e1e2', 'no-new-fact'),
  fx('left-right-mirror-only', {...kings, a2: 'P', b2: 'P', c2: 'P', f7: 'p', g7: 'p', h7: 'p'}, 'a2a3', 'no-new-fact'),
  fx('pre-existing-symmetry-quiet-knight', {...kings, b1: 'N', b8: 'n', a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c7: 'p'}, 'b1c3', 'no-new-fact'),
  fx('promotion-mate-after-symmetry', {e1: 'K', h8: 'k', a2: 'P', g2: 'P', h2: 'P', c7: 'P', a7: 'p', g7: 'p', h7: 'p'}, 'c7c8q', 'not-live'),
];
const rejected = fx('rejected-input-not-applicable', {...kings, a2: 'P', b2: 'P', c2: 'P', a7: 'p', b7: 'p', c6: 'p'}, 'c2c5', 'not-applicable', {extra: {foundationTags: true}});
const gates = [
  {...positives[0], id: 'disabled-equals-parent', flag: false, expectedStatus: 'disabled'},
  {...negatives[0], id: 'disabled-negative-equals-parent', flag: false, expectedStatus: 'disabled'},
  {...positives[0], id: 'budget-zero', limit: 0, expectedStatus: 'exhausted'},
  {...positives[0], id: 'budget-one-less', limit: 5, expectedStatus: 'exhausted'},
  {...positives[0], id: 'budget-exact', limit: 6, expectedStatus: 'proven'},
  {...historyCase, id: 'budget-one-less-with-history', limit: 7, expectedStatus: 'exhausted'},
  {...historyCase, id: 'budget-exact-with-history', limit: 8, expectedStatus: 'proven'},
  {...negatives[0], id: 'budget-exact-negative', limit: 5, expectedStatus: 'no-new-fact'},
  {...negatives[0], id: 'budget-one-less-negative', limit: 4, expectedStatus: 'exhausted'},
];
const errors = [
  {...positives[0], id: 'flag-not-boolean', flag: 1, inputError: 'symmetryTags must be boolean'},
  {...positives[0], id: 'budget-negative', limit: -1, inputError: 'maxSymmetryNodes must be integer'},
  {...positives[0], id: 'budget-fraction', limit: 0.5, inputError: 'maxSymmetryNodes must be integer'},
  {...positives[0], id: 'budget-over-limit', limit: 50001, inputError: 'maxSymmetryNodes must be integer'},
  {...positives[0], id: 'illegal-move', move: 'c2c5', inputError: 'Illegal move'},
  {...historyCase, id: 'history-fen-mismatch', history: {...historyCase.history, moves: ['g1f3']}, inputError: 'Invalid history'},
];

const pairs = [...positives, historyCase, ...negatives];
export const fixtures = [...pairs, ...pairs.map(reflect), rejected, ...gates, ...errors];

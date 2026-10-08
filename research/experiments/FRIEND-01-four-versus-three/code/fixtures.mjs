// Authored synthetic positions. No real games; no claim about real players.
import {boardFen, reflect} from '../../FRIEND-shared/lib.mjs';

const mirrorFile = square => String.fromCharCode(201 - square.charCodeAt(0)) + square[1];
export const fileMirror = f => ({...f, id: f.id + '-queenside',
  fen: boardFen(Object.fromEntries(Object.entries(readPieces(f.fen)).map(([s, p]) => [mirrorFile(s), p])), f.fen.split(' ')[1]),
  move: mirrorFile(f.move.slice(0, 2)) + mirrorFile(f.move.slice(2, 4)) + f.move.slice(4)});
function readPieces(fen) {
  const out = {};
  fen.split(' ')[0].split('/').forEach((row, i) => { let file = 0;
    for (const ch of row) { if (/\d/.test(ch)) file += +ch; else out['abcdefgh'[file++] + (8 - i)] = ch; } });
  return out;
}
const fx = (id, pieces, move, expectedStatus, rest = {}) =>
  ({id, fen: boardFen(pieces), move, expectedStatus, ...rest});

// Kingside base: after e4xf5 White has f5,f2,g2,h2 and Black e7,g7,h7 (4v3, one rook each).
const base = {g1: 'K', a1: 'R', e4: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f5: 'p', e7: 'p', g7: 'p', h7: 'p'};
const without = (pieces, ...squares) => Object.fromEntries(Object.entries(pieces).filter(([s]) => !squares.includes(s)));
const with_ = (pieces, extra) => ({...pieces, ...extra});

const positives = [
  fx('pawn-capture-kingside', base, 'e4f5', 'proven'),
  fx('enemy-majority', {g1: 'K', a1: 'R', e4: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f5: 'p', f7: 'p', g7: 'p', h7: 'p', e6: 'p'}, 'e4f5', 'proven'),
  fx('rook-takes-knight', {g1: 'K', a1: 'R', e2: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', a5: 'n', f7: 'p', g7: 'p', h7: 'p'}, 'a1a5', 'proven'),
  fx('pawn-takes-bishop', {g1: 'K', a1: 'R', e4: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f5: 'b', e7: 'p', g7: 'p', h7: 'p'}, 'e4f5', 'proven'),
  fx('quiet-kings-no-urgent-warning', {e1: 'K', c1: 'R', e4: 'P', f2: 'P', g2: 'P', h2: 'P', e8: 'k', c8: 'r', f5: 'p', e7: 'p', g7: 'p', h7: 'p'}, 'e4f5', 'proven'),
  fx('promotion-to-rook', {b8: 'k', a8: 'r', e7: 'p', f7: 'p', h7: 'p', g7: 'P', e2: 'P', f2: 'P', h2: 'P', h3: 'P', g1: 'K'}, 'g7g8r', 'proven'),
];
const history = {fen: boardFen(with_(without(base, 'a1', 'a8'), {b1: 'R', b8: 'r'})), moves: ['b1a1', 'b8a8']};
// Two history plies advance the counters (halfmove 2, fullmove 2); the first draft kept '0 1' and was rejected.
const historyCase = {...positives[0], id: 'pawn-capture-with-history', fen: positives[0].fen.replace(' 0 1', ' 2 2'), history};

const negatives = [
  fx('extra-black-bishop', with_(base, {c8: 'b'}), 'e4f5', 'no-new-fact'),
  fx('extra-black-queen', with_(base, {d8: 'q'}), 'e4f5', 'no-new-fact'),
  fx('two-white-rooks', with_(base, {h1: 'R'}), 'e4f5', 'no-new-fact'),
  fx('black-rook-missing', without(base, 'a8'), 'e4f5', 'no-new-fact'),
  fx('pawns-on-both-wings', with_(without(base, 'e7'), {a7: 'p'}), 'e4f5', 'no-new-fact'),
  fx('d-and-e-file-split', with_(without(base, 'h2'), {d2: 'P'}), 'e4f5', 'no-new-fact'),
  fx('four-versus-four', with_(base, {e6: 'p'}), 'e4f5', 'no-new-fact'),
  fx('five-versus-three', with_(base, {g3: 'P'}), 'e4f5', 'no-new-fact'),
  fx('three-versus-two', {g1: 'K', a1: 'R', e4: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f5: 'p', g7: 'p', h7: 'p'}, 'e4f5', 'no-new-fact'),
  fx('already-four-versus-three-quiet-rook', {g1: 'K', a1: 'R', e2: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f7: 'p', g7: 'p', h7: 'p'}, 'a1b1', 'no-new-fact'),
  fx('already-four-versus-three-pawn-push', {g1: 'K', a1: 'R', e2: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f7: 'p', g7: 'p', h7: 'p'}, 'e2e4', 'no-new-fact'),
  fx('four-versus-three-destroyed', {g1: 'K', a1: 'R', e4: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'r', f5: 'p', g7: 'p', h7: 'p'}, 'e4f5', 'no-new-fact'),
  fx('promotion-to-queen', {b8: 'k', a8: 'r', e7: 'p', f7: 'p', h7: 'p', g7: 'P', e2: 'P', f2: 'P', h2: 'P', h3: 'P', g1: 'K'}, 'g7g8q', 'no-new-fact'),
  fx('checkmate-after-capture', {c3: 'K', a1: 'R', e2: 'P', f2: 'P', g2: 'P', h2: 'P', g8: 'k', a8: 'b', h1: 'r', f7: 'p', g7: 'p', h7: 'p'}, 'a1a8', 'not-live'),
  fx('rejected-input-not-applicable', base, 'e4e6', 'not-applicable', {extra: {foundationTags: true}}),
];
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
  {...positives[0], id: 'flag-not-boolean', flag: 'yes', inputError: 'fourThreeTags must be boolean'},
  {...positives[0], id: 'budget-negative', limit: -1, inputError: 'maxFourThreeNodes must be integer'},
  {...positives[0], id: 'budget-fraction', limit: 1.5, inputError: 'maxFourThreeNodes must be integer'},
  {...positives[0], id: 'budget-over-limit', limit: 50001, inputError: 'maxFourThreeNodes must be integer'},
  {...positives[0], id: 'illegal-move', move: 'e4e6', inputError: 'Illegal move'},
  {...historyCase, id: 'history-fen-mismatch', history: {...history, moves: ['b1a1']}, inputError: 'Invalid history'},
];

const queensidePositives = positives.filter(f => ['pawn-capture-kingside', 'rook-takes-knight', 'pawn-takes-bishop'].includes(f.id)).map(fileMirror);
const colourPairs = [...positives, historyCase, ...negatives.filter(f => f.id !== 'rejected-input-not-applicable')];
export const fixtures = [
  ...colourPairs, ...colourPairs.map(reflect),
  ...queensidePositives, // queenside versions
  ...queensidePositives.map(reflect),
  ...negatives.filter(f => f.id === 'rejected-input-not-applicable'), ...gates, ...errors,
];

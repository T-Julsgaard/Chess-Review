// Authored synthetic positions. No real games; no claim about real players.
import {boardFen, reflect} from '../../FRIEND-shared/lib.mjs';

const fx = (id, pieces, move, expectedStatus, rest = {}) =>
  ({id, fen: boardFen(pieces), move, expectedStatus, ...rest});
const kings = {e1: 'K', e8: 'k'};

// Positive family. White pawn reaches relative rank 5 or 6, is pawn-supported, no
// Black pawn can ever attack it, and it removes at least one enemy-king destination.
const wedgeSix = {...kings, d5: 'P', e5: 'P', a7: 'p', g7: 'p', h7: 'p'};
const positives = [
  fx('rank6-left-support-two-squares', wedgeSix, 'e5e6', 'proven'),
  fx('rank6-right-support-two-squares', {...kings, e5: 'P', f5: 'P', a7: 'p', g7: 'p', h7: 'p'}, 'e5e6', 'proven'),
  fx('rank5-capture-two-squares', {e1: 'K', d7: 'k', c4: 'P', e4: 'P', d5: 'n', a7: 'p', g7: 'p', h7: 'p'}, 'e4d5', 'proven'),
  fx('rank6-edge-one-square', {e1: 'K', h8: 'k', g5: 'P', h5: 'P', a7: 'p'}, 'h5h6', 'proven'),
];
const historyCase = {id: 'rank6-after-history', expectedStatus: 'proven', move: 'e5e6',
  fen: boardFen({...wedgeSix, a3: 'N', a6: 'n'}).replace(' 0 1', ' 2 2'),
  history: {fen: boardFen({...wedgeSix, b1: 'N', b8: 'n'}), moves: ['b1a3', 'b8a6']}};

const negatives = [
  fx('unsupported-pawn', {...kings, e5: 'P', a7: 'p', g7: 'p', h7: 'p'}, 'e5e6', 'no-new-fact'),
  fx('rank4-with-denial', {e1: 'K', e6: 'k', d3: 'P', e3: 'P', a7: 'p'}, 'e3e4', 'no-new-fact'),
  fx('rank7-supported', {e1: 'K', e8: 'k', d6: 'P', e6: 'P', a7: 'p'}, 'e6e7', 'no-new-fact'),
  fx('promotion-excluded', {e1: 'K', h7: 'k', e7: 'P', d6: 'P', a7: 'p'}, 'e7e8q', 'no-new-fact'),
  fx('adjacent-enemy-pawn-attacks', {...kings, d5: 'P', e5: 'P', a7: 'p', f7: 'p', h7: 'p'}, 'e5e6', 'no-new-fact'),
  fx('enemy-pawn-reaches-by-capture', {e1: 'K', d7: 'k', c4: 'P', e4: 'P', d5: 'n', a7: 'p', f7: 'p', h7: 'p'}, 'e4d5', 'no-new-fact'),
  fx('king-too-far-to-be-denied', {...wedgeSix, e8: undefined, h8: 'k'}, 'e5e6', 'no-new-fact'),
  fx('denied-squares-already-own-occupied', {...wedgeSix, d7: 'b', f7: 'b'}, 'e5e6', 'no-new-fact'),
  fx('knight-arrival-not-a-pawn', {...kings, d5: 'P', c5: 'N', a7: 'p', g7: 'p', h7: 'p'}, 'c5e6', 'no-new-fact'),
  fx('pawn-gives-check-no-extra-denial', {e1: 'K', d7: 'k', d5: 'P', e5: 'P', a7: 'p', g7: 'p', h7: 'p'}, 'e5e6', 'no-new-fact'),
  fx('counterfactual-illegal-pinned-shield', {e1: 'K', f8: 'k', e8: 'r', d5: 'P', e5: 'P', a7: 'p'}, 'e5e6', 'no-new-fact'),
  fx('pawn-mate-is-terminal', {a1: 'K', h7: 'k', g8: 'b', e5: 'B', f5: 'N', g5: 'P', h5: 'P'}, 'g5g6', 'not-live'),
];
const rejected = fx('rejected-input-not-applicable', wedgeSix, 'e5e7', 'not-applicable', {extra: {foundationTags: true}});
const byId = id => negatives.find(f => f.id === id);
const gates = [
  {...positives[0], id: 'disabled-equals-parent', flag: false, expectedStatus: 'disabled'},
  {...byId('unsupported-pawn'), id: 'disabled-negative-equals-parent', flag: false, expectedStatus: 'disabled'},
  {...positives[0], id: 'budget-zero', limit: 0, expectedStatus: 'exhausted'},
  {...positives[0], id: 'budget-one-less', limit: 10, expectedStatus: 'exhausted'},
  {...positives[0], id: 'budget-exact', limit: 11, expectedStatus: 'proven'},
  {...historyCase, id: 'budget-one-less-with-history', limit: 12, expectedStatus: 'exhausted'},
  {...historyCase, id: 'budget-exact-with-history', limit: 13, expectedStatus: 'proven'},
  {...byId('unsupported-pawn'), id: 'budget-exact-shape-stage', limit: 4, expectedStatus: 'no-new-fact'},
  {...byId('unsupported-pawn'), id: 'budget-one-less-shape-stage', limit: 3, expectedStatus: 'exhausted'},
  {...byId('adjacent-enemy-pawn-attacks'), id: 'budget-exact-reach-stage', limit: 7, expectedStatus: 'no-new-fact'},
  {...byId('adjacent-enemy-pawn-attacks'), id: 'budget-one-less-reach-stage', limit: 6, expectedStatus: 'exhausted'},
  {...byId('counterfactual-illegal-pinned-shield'), id: 'budget-exact-counterfactual-stage', limit: 6, expectedStatus: 'no-new-fact'},
  {...byId('counterfactual-illegal-pinned-shield'), id: 'budget-one-less-counterfactual-stage', limit: 5, expectedStatus: 'exhausted'},
];
const errors = [
  {...positives[0], id: 'flag-not-boolean', flag: 'yes', inputError: 'wedgeTags must be boolean'},
  {...positives[0], id: 'budget-negative', limit: -1, inputError: 'maxWedgeNodes must be integer'},
  {...positives[0], id: 'budget-fraction', limit: 2.5, inputError: 'maxWedgeNodes must be integer'},
  {...positives[0], id: 'budget-over-limit', limit: 50001, inputError: 'maxWedgeNodes must be integer'},
  {...positives[0], id: 'illegal-move', move: 'e5e7', inputError: 'Illegal move'},
  {...historyCase, id: 'history-fen-mismatch', history: {...historyCase.history, moves: ['b1a3']}, inputError: 'Invalid history'},
];

const clean = f => ({...f, fen: f.fen}); // fixtures built with boardFen already
const pairs = [...positives, historyCase, ...negatives].map(clean);
export const fixtures = [...pairs, ...pairs.map(reflect), rejected, ...gates, ...errors];

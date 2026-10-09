import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {fixtures as oldChecking} from '../../E057-rook-checking-distance/code/fixtures.mjs';
import {fixtures as oldMaterial} from '../../FRIEND-01-four-versus-three/code/fixtures.mjs';
import {fixtures as parentFixtures} from '../../E081-direct-attacks/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
export {reflect} from '../../E081-direct-attacks/code/fixtures.mjs';
const position = men => setup({a1: null, a7: null, h8: null, h2: null, g1: 'K', g8: 'k', ...men});
export const side = {id: 'side-no-advanced-passer', fen: position({g8: null, g7: 'k', b1: 'R', a8: 'r'}),
  move: 'b1b7', rookEndingTags: true, scanReplies: false, expectedStatus: 'proven', expected: ['side-check-proof']};
export const fourThree = {id: 'four-three-last-minor-capture', fen: position({a2: 'R', a3: 'n', a8: 'r',
  e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}), move: 'a2a3',
  rookEndingTags: true, scanReplies: false, expectedStatus: 'proven', expected: ['rook-four-three']};
export const threeTwo = {...fourThree, id: 'three-two-last-minor-capture',
  fen: position({a2: 'R', a3: 'n', a8: 'r', e2: 'P', f2: 'P', g2: 'P', f7: 'p', g7: 'p'}), expected: ['rook-three-two']};
export const fixtures = [side, fourThree, threeTwo,
  {...side, id: 'disabled', rookEndingTags: false, expectedStatus: 'disabled', expected: []},
  {...side, id: 'zero-budget', maxRookEndingNodes: 0, expectedStatus: 'exhausted', expected: []},
  {...side, id: 'capturable-side-check', fen: position({g8: null, d7: 'k', c1: 'R', a8: 'r'}), move: 'c1c7'},
  {...fourThree, id: 'already-four-three', fen: position({a2: 'R', a8: 'r', e2: 'P', f2: 'P', g2: 'P', h2: 'P',
    e7: 'p', f7: 'p', g7: 'p'}), move: 'a2a3', expectedStatus: 'no-new-fact', expected: []}];
for (const old of oldChecking.filter(f => f.expected.includes('side-rook-check')).slice(0, 8)) {
  fixtures.push({...old, id: 'reused-E057-' + old.id, rookEndingTags: true,
    expectedStatus: 'proven', expected: ['side-rook-check'], reusedSide: true});
}
const add = (id, men, move, expectedStatus = 'no-new-fact', expected = []) => fixtures.push({
  ...side, id, fen: position(men), move, expectedStatus, expected});
for (const [own, enemy] of [[4, 3], [3, 4], [3, 2], [2, 3]]) {
  const men = {a2: 'R', a3: 'n', a8: 'r'};
  for (const s of ['a4', 'd2', 'f2', 'h2'].slice(0, own)) men[s] = 'P';
  for (const s of ['a7', 'c7', 'f7', 'h7'].slice(0, enemy)) men[s] = 'p';
  add('split-wing-' + own + '-' + enemy, men, 'a2a3', 'proven', [Math.max(own, enemy) === 4 ? 'rook-four-three' : 'rook-three-two']);
}
add('doubled-four-three', {a2: 'R', a3: 'n', a8: 'r', a4: 'P', a5: 'P', f2: 'P', h2: 'P', c7: 'p', f7: 'p', h7: 'p'},
  'a2a3', 'proven', ['rook-four-three']);
add('d-e-boundary-three-two', {a2: 'R', a3: 'n', a8: 'r', d2: 'P', d3: 'P', e2: 'P', d7: 'p', e7: 'p'},
  'a2a3', 'proven', ['rook-three-two']);
add('wrong-five-three', {a2: 'R', a3: 'n', a8: 'r', a4: 'P', d2: 'P', e2: 'P', f2: 'P', h2: 'P', c7: 'p', f7: 'p', h7: 'p'}, 'a2a3');
add('extra-rook', {a2: 'R', b1: 'R', a3: 'n', a8: 'r', e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}, 'a2a3');
add('remaining-minor', {a2: 'R', b1: 'N', a3: 'n', a8: 'r', e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}, 'a2a3');
add('remaining-queen', {a2: 'R', b1: 'Q', a3: 'n', a8: 'r', e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}, 'a2a3');
add('no-own-rook', {a8: 'r', e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}, 'e2e3');
add('no-enemy-rook', {a2: 'R', e2: 'P', f2: 'P', g2: 'P', h2: 'P', e7: 'p', f7: 'p', g7: 'p'}, 'e2e3');
for (const count of [3, 4]) {
  const men = {a2: 'R', a3: 'n', a8: 'r'};
  for (const s of ['e2', 'f2', 'g2', 'h2'].slice(0, count)) men[s] = 'P';
  for (const s of ['e7', 'f7', 'g7', 'h7'].slice(0, count)) men[s] = 'p';
  add('equal-pawns-' + count, men, 'a2a3');
}
for (const [large, small, id] of [[4, 3, 'rook-four-three'], [3, 2, 'rook-three-two']]) {
  const men = {a2: 'R', a8: 'r', e4: 'P', d5: 'p'};
  for (const s of ['f2', 'g2', 'h2'].slice(0, large - 1)) men[s] = 'P';
  for (const s of ['e7', 'f7', 'g7'].slice(0, small)) men[s] = 'p';
  add('pawn-capture-' + large + '-' + small, men, 'e4d5', 'proven', [id]);
  const promotion = {g8: null, e6: 'k', h8: 'r', a7: 'P'};
  for (const s of ['b2', 'd2', 'f2', 'h2'].slice(0, large)) promotion[s] = 'P';
  for (const s of ['c7', 'f7', 'h7'].slice(0, small)) promotion[s] = 'p';
  add('promotion-creates-rook-ending-' + large + '-' + small, promotion, 'a7a8r', 'proven', [id]);
  const epMen = {...men, e4: null, d5: null, e5: 'P', d7: 'p'};
  const initial = position(epMen).replace(' w ', ' b '), epBoard = new Chess(initial);
  epBoard.move('d7d5');
  fixtures.push({...side, id: 'en-passant-count-transition-' + large + '-' + small,
    fen: epBoard.fen(), move: 'e5d6', history: {fen: initial, moves: ['d7d5']},
    expectedStatus: 'proven', expected: [id]});
}
add('promotion-rook-check-is-not-actual-rook-move', {g8: null, d8: 'k', h6: 'r', a7: 'P',
  b2: 'P', d2: 'P', f2: 'P', h2: 'P', c7: 'p', f7: 'p', h7: 'p'}, 'a7a8r', 'proven', ['rook-four-three']);
fixtures.at(-1).absent = ['side-check-proof'];
add('side-and-four-three', {g8: null, g7: 'k', b1: 'R', b7: 'n', a8: 'r',
  e2: 'P', f2: 'P', g2: 'P', h2: 'P', a6: 'p', e6: 'p', f6: 'p'}, 'b1b7',
  'proven', ['side-check-proof', 'rook-four-three']);
add('capturable-side-and-four-three', {g8: null, d7: 'k', c1: 'R', c7: 'n', a8: 'r',
  e2: 'P', f2: 'P', g2: 'P', h2: 'P', e6: 'p', f6: 'p', h6: 'p'}, 'c1c7',
  'proven', ['side-check-proof', 'rook-four-three']);
fixtures.at(-1).scanReplies = true;
add('pawn-check-is-not-side-rook-check', {g8: null, d6: 'k', a2: 'R', h8: 'r', e4: 'P'}, 'e4e5');
add('four-promotion-interpositions', {g1: 'k', g8: null, c6: 'K', a3: 'R', h8: 'r', b2: 'p'},
  'a3a1', 'proven', ['side-check-proof']);
add('rear-file-only', {g8: null, e5: 'k', a2: 'R', h8: 'r'}, 'a2e2');
add('blocked-rank', {g8: null, g7: 'k', b1: 'R', a8: 'r', e7: 'p'}, 'b1b7');
add('side-with-minor', {g8: null, g7: 'k', b1: 'R', a8: 'r', a3: 'n'}, 'b1b7');
add('side-check-clock-terminal', {g8: null, g7: 'k', b1: 'R', a8: 'r'}, 'b1b7', 'not-live');
fixtures.at(-1).fen = fixtures.at(-1).fen.replace(' 0 1', ' 99 1');
for (const rank of [3, 4, 5, 6]) add('side-rank-' + rank, {g8: null, ['d' + rank]: 'k', b1: 'R', h8: 'r'},
  'b1b' + rank, 'proven', ['side-check-proof']);
for (const rank of [1, 2, 8]) add('side-rank-' + rank, {g8: null, ['d' + rank]: 'k',
  [rank === 1 ? 'b3' : 'b1']: 'R', h8: 'r'}, (rank === 1 ? 'b3' : 'b1') + 'b' + rank,
  'proven', ['side-check-proof']);
for (const [id, nodes] of [['side-no-advanced-passer', 20], ['four-three-last-minor-capture', 9],
  ['side-and-four-three', 20], ['reused-E057-side-three-clear-squares', 18]]) {
  const original = fixtures.find(f => f.id === id); if (!original) throw Error('Missing budget root ' + id);
  fixtures.push({...original, id: 'exact-budget-' + id, maxRookEndingNodes: nodes},
    {...original, id: 'short-budget-' + id, maxRookEndingNodes: nodes - 1, expectedStatus: 'exhausted',
      expected: original.reusedSide ? ['side-rook-check'] : [], reusedSide: false});
}
const mirror = s => String.fromCharCode(201 - s.charCodeAt(0)) + s[1];
for (const original of [side, fourThree, threeTwo]) {
  const c = new Chess(); c.clear();
  for (const row of new Chess(original.fen).board()) for (const p of row) if (p) c.put({type: p.type, color: p.color}, mirror(p.square));
  fixtures.push({...original, id: original.id + '-file-mirror', fen: c.fen().split(' ')[0] + ' ' + original.fen.split(' ').slice(1).join(' '),
    move: mirror(original.move.slice(0, 2)) + mirror(original.move.slice(2, 4))});
}
const h = new Chess(side.fen), moves = ['b1c1', 'g7f7', 'c1b1', 'f7g7'];
for (const move of moves) h.move(move);
fixtures.push({...side, id: 'actual-side-history', fen: h.fen(), history: {fen: side.fen, moves}});
for (const id of ['foundation-rejected', 'foundation-exhausted', 'foundation-terminal-root',
  'dead-promotion', 'valid-history', 'repetition-root', 'clock-root', 'foundation-clock-root',
  'malformed-fen', 'malformed-uci', 'ordinary-illegal', 'default-dead-root', 'actual-dead-capture',
  'root-mate', 'root-stalemate', 'foundation-root-mate', 'foundation-root-stalemate', 'actual-mate', 'actual-stalemate']) {
  const old = parentFixtures.find(f => f.id === 'guard-' + id); if (!old) throw Error('Missing parent guard ' + id);
  const {directAttackTags, maxDirectAttackNodes, expectedStatus, expected, absent, ...rest} = old;
  fixtures.push({...rest, rookEndingTags: true, scanReplies: false,
    ...(old.inputError ? {inputError: old.expectedError} : {}),
    expectedStatus: expectedStatus === 'not-applicable' ? 'not-applicable'
      : ['dead-promotion', 'repetition-root', 'actual-dead-capture', 'actual-mate', 'actual-stalemate'].includes(id)
        ? 'not-live' : 'no-new-fact', expected: []});
}
for (const [id, value] of [['null', null], ['number', 1], ['string', 'true']]) fixtures.push({...side,
  id: 'strict-flag-' + id, rookEndingTags: value, inputError: 'rookEndingTags must be boolean'});
for (const [id, value] of [['null', null], ['negative', -1], ['fraction', .5], ['over', 50001]]) fixtures.push({...side,
  id: 'strict-budget-' + id, maxRookEndingNodes: value, inputError: 'maxRookEndingNodes must be integer'});
fixtures.push({...side, id: 'default-disabled', rookEndingTags: undefined, expectedStatus: 'disabled', expected: []},
  {...side, id: 'one-budget', maxRookEndingNodes: 1, expectedStatus: 'exhausted', expected: []},
  {...side, id: 'mismatched-history', history: {fen: side.fen, moves: ['b1c1']}, inputError: 'final FEN'},
  {...side, id: 'illegal-history', history: {fen: side.fen, moves: ['b1b8']}, inputError: 'final FEN', retainedMislabel: true},
  {...side, id: 'corrected-illegal-history', history: {fen: side.fen, moves: ['b1c4']}, inputError: 'illegal move'},
  {...side, id: 'null-history', history: null, inputError: 'Invalid history'});
for (const old of oldMaterial.filter(f => f.expectedStatus === 'proven')) {
  const {fourThreeTags, maxFourThreeNodes, ...rest} = old;
  const adapterError = typeof old.inputError === 'string' && /fourThreeTags|maxFourThreeNodes/.test(old.inputError);
  fixtures.push({...rest, id: 'reused-FRIEND01-' + old.id,
    rookEndingTags: adapterError && old.inputError.includes('fourThreeTags') ? old.flag : true,
    ...(adapterError && old.inputError.includes('maxFourThreeNodes') ? {maxRookEndingNodes: old.limit} : {}),
    ...(adapterError ? {inputError: old.inputError.replaceAll('fourThreeTags', 'rookEndingTags').replaceAll('maxFourThreeNodes', 'maxRookEndingNodes'), borrowedInput: old} : {}),
    expected: ['rook-four-three'], reusedMaterial: true});
}

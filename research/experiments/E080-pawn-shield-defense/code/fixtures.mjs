import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
import {fixtures as previousFixtures} from '../../E079-central-king-support/code/fixtures.mjs';
export {reflect} from '../../E079-central-king-support/code/fixtures.mjs';
export const candidate = {id: 'queen-file-cover', fen: setup({a1: null, a7: null,
  g1: 'K', f2: 'P', g2: 'P', h2: 'P', h8: 'k', g4: 'q', f3: 'b'}),
  move: 'g2g3', pawnShieldTags: true, scanReplies: false};
export const rookOriginal = {...candidate, id: 'rook-original-negative',
  fen: setup({a1: null, a7: null, g1: 'K', g2: 'P', h2: 'P', h8: 'k',
    g4: 'r', f3: 'b', b5: 'b', f2: 'n'})};
export const rookCandidate = {...candidate, id: 'rook-file-cover',
  fen: setup({a1: null, a7: null, g1: 'K', f1: 'N', h1: 'R', f2: 'P',
    g2: 'P', h2: 'P', h8: 'k', g4: 'r', f3: 'b'})};
export const candidates = [candidate, rookCandidate];
for (const file of ['c', 'e']) {
  const left = String.fromCharCode(file.charCodeAt(0) - 1);
  const right = String.fromCharCode(file.charCodeAt(0) + 1);
  for (const slider of ['q', 'r']) candidates.push({...candidate,
    id: (slider === 'q' ? 'queen' : 'rook') + '-home-' + file,
    fen: setup({a1: null, a7: null, h2: null, h8: 'k', [file + '1']: 'K',
      [left + '2']: 'P', [file + '2']: 'P', [right + '2']: 'P',
      [file + '4']: slider, [left + '3']: 'b',
      ...(slider === 'r' ? {[left + '1']: 'N', [right + '1']: 'R'} : {})}),
    move: file + '2' + file + '3', expectedStatus: slider === 'q' ? 'no-new-fact' : 'proven'});
}
for (const original of [candidate, rookCandidate]) candidates.push({...original,
  id: original.id + '-other-bishop-ray', fen: (() => {
    // Separate authored support ray; no assertion of opening history.
    const pieces = {a1: null, a7: null, h8: 'k', g1: 'K', f2: 'P', g2: 'P',
      h2: 'P', g4: original === candidate ? 'q' : 'r', h3: 'b'};
    if (original === rookCandidate) Object.assign(pieces, {f1: 'N', h1: 'R'});
    return setup(pieces);
  })(), expectedStatus: original === candidate ? 'no-new-fact' : 'proven'});
export const fixtures = [...candidates, {...rookOriginal, expectedStatus: 'no-new-fact'}];
export const extraFixtures = [];
const add = (id, overrides, expectedStatus = 'no-new-fact') => extraFixtures.push({
  ...candidate, id, ...overrides, expectedStatus});
add('disabled', {pawnShieldTags: false}, 'disabled');
add('zero-budget', {maxPawnShieldNodes: 0}, 'exhausted');
add('one-budget', {maxPawnShieldNodes: 1}, 'exhausted');
for (const [id, value] of [['null', null], ['number', 1], ['string', 'true']]) {
  add('bad-flag-' + id, {pawnShieldTags: value, inputError: true, expectedError: 'boolean'});
}
for (const [id, value] of [['null', null], ['negative', -1], ['fraction', .5], ['over', 50001]]) {
  add('bad-limit-' + id, {maxPawnShieldNodes: value, inputError: true, expectedError: 'integer'});
}
const basic = pieces => setup({a1: null, a7: null, h2: null, h8: 'k', ...pieces});
add('nonpawn', {fen: basic({g1: 'K', f2: 'P', g2: 'P', h2: 'P', g4: 'q', f3: 'b', a3: 'N'}), move: 'a3b5'});
add('king-move', {move: 'g1f1'});
add('capture', {fen: basic({g1: 'K', f2: 'P', g2: 'P', h2: 'P', g4: 'q', f3: 'b', g3: 'b'}), move: 'h2g3'});
add('castling-original-checked-enemy', {fen: basic({e1: 'K', h1: 'R', d2: 'P', e2: 'P', f2: 'P', e4: 'q', d3: 'b'})
  .replace(' w - - ', ' w K - '), move: 'e1g1', inputError: true, expectedError: 'non-moving king is in check'});
add('castling', {fen: basic({h8: null, a8: 'k', e1: 'K', h1: 'R', d2: 'P', e2: 'P', f2: 'P', e4: 'q', d3: 'b'})
  .replace(' w - - ', ' w K - '), move: 'e1g1'});
add('promotion', {fen: basic({g1: 'K', a7: 'P'}), move: 'a7a8q'});
add('two-square-outside-cover', {fen: basic({g1: 'K', f2: 'P', g2: 'P', h2: 'P', g5: 'q', f3: 'b'}), move: 'g2g4'});
add('outside-home-file', {fen: basic({h1: 'K', g2: 'P', h2: 'P', h4: 'q', g3: 'b'}), move: 'h2h3'});
add('outside-home-rank', {fen: basic({g2: 'K', f3: 'P', g3: 'P', h3: 'P', g5: 'q', f4: 'b'}), move: 'g3g4'});
add('pinned-slider-no-mate', {fen: basic({h8: null, h5: 'k', g1: 'K', f2: 'P', g2: 'P', h2: 'P', g4: 'q', f3: 'B'})});
add('cover-pawn-original-unpinned', {fen: basic({g1: 'K', f1: 'N', h1: 'R', f2: 'P', g2: 'P', h2: 'P', h4: 'b', f8: 'r'}), move: 'f2f3'});
add('pinned-cover-pawn', {fen: basic({g1: 'K', f1: 'N', h1: 'R', f2: 'P', g2: 'P', h2: 'P', e3: 'b', f8: 'r'}),
  move: 'f2f3', inputError: true, expectedError: 'Illegal move'});
add('bishop-mate-does-not-use-moved-pawn', {fen: basic({g1: 'K', f1: 'N', h1: 'R', f2: 'P', g2: 'P', h2: 'P', h4: 'b', f8: 'r'})});
const moves = ['g1f1', 'h8g8', 'f1g1', 'g8h8'], historyBoard = new Chess(candidate.fen);
for (const move of moves) historyBoard.move(move);
add('valid-history', {fen: historyBoard.fen(), history: {fen: candidate.fen, moves}}, 'proven');
add('history-mismatch', {history: {fen: candidate.fen, moves: ['g1f1']}, inputError: true, expectedError: 'final FEN'});
add('history-illegal', {history: {fen: candidate.fen, moves: ['g1g4']}, inputError: true, expectedError: 'illegal move'});
add('history-null', {history: null, inputError: true, expectedError: 'Invalid history'});
for (const id of ['foundation-rejected', 'foundation-exhausted', 'foundation-terminal-root',
  'dead-promotion', 'valid-history', 'repetition-root', 'clock-root', 'foundation-clock-root',
  'malformed-fen', 'malformed-uci', 'ordinary-illegal', 'default-dead-root', 'actual-dead-capture',
  'root-mate', 'root-stalemate', 'foundation-root-mate', 'foundation-root-stalemate', 'actual-mate', 'actual-stalemate']) {
  const old = previousFixtures.find(f => f.id === 'guard-' + id);
  if (!old) throw Error('Missing frozen guard fixture ' + id);
  const {kingCenterTags, kingSupportDepth, maxKingCenterNodes, expected, absent, expectedStatus, ...rest} = old;
  extraFixtures.push({...rest, id: 'guard-' + id, pawnShieldTags: true, scanReplies: false,
    ...(id === 'malformed-fen' ? {expectedError: 'Invalid FEN: must contain six space-delimited fields'}
      : id === 'malformed-uci' ? {expectedError: 'Expected a UCI move'}
        : id === 'ordinary-illegal' ? {expectedError: 'Illegal move'} : {}),
    expectedStatus: expectedStatus === 'not-applicable' ? 'not-applicable'
      : ['dead-promotion', 'repetition-root', 'actual-dead-capture', 'actual-mate', 'actual-stalemate'].includes(id)
        ? 'not-live' : 'no-new-fact'});
}
fixtures.push(...extraFixtures);

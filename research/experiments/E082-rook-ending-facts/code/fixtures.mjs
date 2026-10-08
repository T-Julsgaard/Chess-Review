import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {fixtures as oldChecking} from '../../E057-rook-checking-distance/code/fixtures.mjs';
import {fixtures as oldMaterial} from '../../FRIEND-01-four-versus-three/code/fixtures.mjs';
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
for (const old of oldMaterial.filter(f => f.expectedStatus === 'proven')) {
  const {fourThreeTags, maxFourThreeNodes, ...rest} = old;
  const adapterError = typeof old.inputError === 'string' && /fourThreeTags|maxFourThreeNodes/.test(old.inputError);
  fixtures.push({...rest, id: 'reused-FRIEND01-' + old.id,
    rookEndingTags: adapterError && old.inputError.includes('fourThreeTags') ? old.flag : true,
    ...(adapterError && old.inputError.includes('maxFourThreeNodes') ? {maxRookEndingNodes: old.limit} : {}),
    ...(adapterError ? {inputError: old.inputError.replaceAll('fourThreeTags', 'rookEndingTags').replaceAll('maxFourThreeNodes', 'maxRookEndingNodes'), borrowedInput: old} : {}),
    expected: ['rook-four-three'], reusedMaterial: true});
}

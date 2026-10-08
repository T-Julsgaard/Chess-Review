import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
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

// Checkmate is shown on the mated king's square: a red glow behind the king and
// a "#" badge in the corner the move grades use. Plain check is not marked.
export const CHECKMATE_BADGES = Object.freeze({
  rounded: {name:'Rounded (default)', path:'M43 25 37 75 M63 25 57 75 M27 41H75 M25 59H73', width:8.5, cap:'round'},
  upright: {name:'Upright', path:'M40 25V75M60 25V75M25 40H75M25 60H75', width:9, cap:'round'},
  slanted: {name:'Slanted', path:'M47 24 33 76M69 24 55 76M29 41H77M24 59H72', width:8, cap:'square'},
  slab: {name:'Slab', path:'M42 27 36 73M64 27 58 73M26 40H76M24 60H74', width:11, cap:'butt'},
});
export function checkmateBadgeSvg(options = {}) {
  const style = Object.hasOwn(CHECKMATE_BADGES, options.checkmateBadge) ? options.checkmateBadge : 'rounded';
  const glyph = CHECKMATE_BADGES[style], ink = options.badgeAppearance === 'ink-mineral';
  const disc = ink ? 'r="48.5" fill="#363236" stroke="#7d5454" stroke-width="2.5"' : 'r="49" fill="#e02e2e"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true" data-checkmate-style="${style}"><circle cx="50" cy="50" ${disc}/><path d="${glyph.path}" fill="none" stroke="${ink ? '#e78781' : '#fff'}" stroke-width="${glyph.width}" stroke-linecap="${glyph.cap}"/></svg>`;
}
export function matedKingSquare(chess) {
  if (!chess.isCheckmate()) return null;
  const turn = chess.turn();
  for (const row of chess.board()) {
    for (const piece of row) if (piece?.type === 'k' && piece.color === turn) return piece.square;
  }
  return null;
}

export function mateMark(board, squareNode, square, flipped = false, options = {}) {
  const previous = board.querySelector(':scope > .mate-badge-layer');
  const badgeKey = checkmateBadgeSvg(options);
  if (squareNode && previous?.dataset.matedSquare === square && previous.dataset.flipped === String(flipped) && previous.dataset.badgeKey === badgeKey) return;
  board.querySelectorAll('.mate-glow, .mate-badge-layer').forEach(node => node.remove());
  if (!squareNode) return;
  const document = board.ownerDocument;
  const glow = document.createElement('span');
  glow.className = 'mate-glow';
  glow.setAttribute('aria-hidden', 'true');
  const badge = document.createElement('span');
  badge.className = 'mate-badge';
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', 'Checkmate');
  badge.replaceChildren(document.createRange().createContextualFragment(badgeKey));
  // A square is a stacking context. Keep the glow with the king, but put the
  // overhanging badge above every square so an adjacent move badge cannot clip it.
  const file = square.charCodeAt(0) - 97, rank = 8 - Number(square[1]);
  const row = flipped ? 7 - rank : rank, column = flipped ? 7 - file : file;
  const layer = document.createElement('div');
  layer.className = 'mate-badge-layer' + (row === 0 ? ' top-row' : '') + (column === 7 ? ' right-col' : '');
  layer.dataset.matedSquare = square;
  layer.dataset.flipped = String(flipped);
  layer.dataset.badgeKey = badgeKey;
  layer.style.top = row * 12.5 + '%';
  layer.style.left = column * 12.5 + '%';
  layer.append(badge);
  squareNode.prepend(glow);
  board.append(layer);
}

// Illustrative positions and moves for the habit cards. Each board is a crop,
// with a top-left square, dimensions, pieces, arrows and highlighted squares.
// Uppercase pieces are White and lowercase pieces are Black.
const DIAGRAMS = {
  knights4: {caption: 'Nc3 · Nf3', description: 'Both knights jump from b1 and g1 to c3 and f3.',
    boards: [['b3', 6, 3, 'c3N f3N', 'b1c3 g1f3', 'c3 f3']]},
  castleEarly: {caption: 'e.g. 5. O-O', description: 'An example of early kingside castling. The king moves from e1 to g1 and the rook lands on f1.',
    boards: [['e2', 4, 2, 'f2P g2P h2P f1R g1K', 'e1g1', 'f1 g1']]},
  noCastle: {caption: 'King still on e1', description: 'The king and both rooks still occupy their starting squares.',
    boards: [['a2', 8, 2, 'a2P d2P e2P h2P a1R e1K h1R', '', 'e1']]},
  castleLong: {caption: 'O-O-O', description: 'The king castles queenside from e1 to c1 and the rook lands on d1.',
    boards: [['a3', 5, 3, 'a2P b2P c2P c1K d1R', 'e1c1', 'c1 d1']]},
  opposite: {caption: 'O-O vs. O-O-O', description: 'White castles kingside and Black castles queenside.',
    boards: [['e2', 4, 2, 'f2P g2P h2P f1R g1K', 'e1g1', 'g1'], ['a8', 5, 2, 'c8k d8r a7p b7p c7p', 'e8c8', 'c8']]},
  fian: {caption: 'g3 · Bg2', description: 'The g-pawn moves one square and the bishop develops to g2 behind it.',
    boards: [['f3', 3, 3, 'g3P f2P g2B h2P', 'f1g2', 'g2']]},
  firstMove: {caption: 'e.g. 1. e4', description: 'An example of repeatedly opening with 1. e4. The pawn moves from e2 to e4.',
    boards: [['c4', 4, 3, 'e4P c2P d2P f2P', 'e2e4', 'e4']]},
  qtrade: {caption: 'Qxd5+ · Kxd5', description: 'White’s queen takes Black’s queen on d5 and the black king recaptures.',
    boards: [['c6', 4, 3, 'e6k d5q d4Q', 'd4d5 e6d5', 'd5']]},
  qEarly: {caption: 'e.g. 2. Qf3', description: 'White brings out the queen on move two, from d1 to f3.',
    boards: [['c3', 4, 3, 'f3Q c2P d2P f2P', 'd1f3', 'f3']]},
  gambit: {caption: '2…dxc4', description: 'In the Queen’s Gambit Accepted, Black takes the offered c-pawn on c4.',
    boards: [['c5', 4, 3, 'c4p d4P', 'd5c4', 'c4']]},
  storm: {caption: 'g5–g6 · h5–h6', description: 'The g- and h-pawns advance toward the black king after kingside castling.',
    boards: [['e8', 4, 4, 'f8r g8k g7p h7p g6P h6P', 'g5g6 h5h6', 'g6 h6']]},
  pair25: {caption: 'Light + dark squares', description: 'White still has its light- and dark-squared bishops on move 25.',
    boards: [['c5', 4, 3, 'c4B f4B', '', 'c4 f4']]},
  endgame: {caption: 'King and pawn ending', description: 'A simple endgame with a king and pawn against a lone king.',
    boards: [['c7', 4, 3, 'e7k d5K e5P', '', 'e5']]},
  length: {caption: 'Moves on the scoresheet', description: 'Every numbered row records a full move, with White’s move and Black’s reply.',
    scoresheet: ['1. e4 e5', '2. Nf3 Nc6', '3. Bb5 a6']},
  shortWins: {caption: 'e.g. 24. Qg7#', description: 'An example of a short win. White checkmates the black king on move 24.',
    boards: [['e8', 4, 3, 'h8k g7Q f6K', 'f7g7', 'h8 g7']]},
  captures: {caption: 'Nxd5', description: 'The knight on c3 takes the black pawn on d5.',
    boards: [['c5', 4, 3, 'd5p c3N', 'c3d5', 'd5']]},
  checks: {caption: 'Rg6+', description: 'A white rook on g6 gives check up the g-file to the black king.',
    boards: [['e8', 4, 3, 'g8k g6R', 'g6g8', 'g8']]},
  draws: {caption: 'Stalemate · ½–½', description: 'Black has no legal move and is out of check, so the game is drawn.',
    boards: [['e8', 4, 3, 'h8k f7K g6Q', '', 'h8']]},
  fightOn: {caption: 'Playing a rook down', description: 'White continues playing with a lone king against a king and rook.',
    boards: [['d3', 5, 3, 'f3r h3k d1K', 'e1d1', 'd1']]},
  promo: {caption: 'e8=Q', description: 'A pawn advances from e7 to the eighth rank and becomes a queen.',
    boards: [['d8', 3, 3, 'e8Q e7P', 'e7e8', 'e8']]},
  ep: {caption: 'exd6 e.p.', description: 'After Black plays d7 to d5, the white pawn on e5 captures it en passant by moving to d6.',
    boards: [['c6', 4, 3, 'd5p e5P', 'e5d6', 'd5 d6']]},
  under: {caption: 'e8=N', description: 'The pawn on e7 underpromotes to a knight on e8.',
    boards: [['d8', 3, 3, 'e8N e7P', 'e7e8', 'e8']]},
};

const FILES = 'abcdefgh';
const SVG = 'http://www.w3.org/2000/svg';

function drawBoard(doc, [corner, files, ranks, pieces, moves, focus]) {
  const board = doc.createElement('div');
  board.className = 'pv-sig-diagram-board';
  board.dataset.ranks = ranks;
  board.style.setProperty('--files', files);
  const startFile = FILES.indexOf(corner[0]), startRank = Number(corner[1]);
  const occupied = new Map(pieces.split(' ').map(entry => [entry.slice(0, 2), entry[2]]));
  const highlighted = new Set(focus.split(' '));
  for (let row = 0; row < ranks; row++) {
    for (let col = 0; col < files; col++) {
      const file = startFile + col, rank = startRank - row, square = FILES[file] + rank;
      const tile = doc.createElement('span');
      tile.className = (file + rank) % 2 ? 'is-dark' : 'is-light';
      if (highlighted.has(square)) tile.classList.add('is-highlight');
      const piece = occupied.get(square);
      if (piece) {
        const img = doc.createElement('img'), kind = piece.toUpperCase();
        const code = (piece === kind ? 'w' : 'b') + kind;
        img.src = new URL(`../../../pieces-img/cburnett/${code}.svg`, import.meta.url).href;
        img.alt = '';
        tile.append(img);
      }
      board.append(tile);
    }
  }
  if (!moves) return board;
  const overlay = doc.createElementNS(SVG, 'svg');
  overlay.setAttribute('viewBox', `0 0 ${files} ${ranks}`);
  const point = square => [FILES.indexOf(square[0]) - startFile + .5, startRank - Number(square[1]) + .5];
  for (const arrow of moves.split(' ')) {
    const [x, y] = point(arrow.slice(0, 2)), [endX, endY] = point(arrow.slice(2));
    const length = Math.hypot(endX - x, endY - y), dx = (endX - x) / length, dy = (endY - y) / length;
    // Shorten the shaft at both ends and draw a tip before the destination piece.
    const tipX = endX - .25 * dx, tipY = endY - .25 * dy;
    const tail = [x + .23 * dx, y + .23 * dy], neck = [tipX - .25 * dx, tipY - .25 * dy];
    const path = doc.createElementNS(SVG, 'path');
    path.setAttribute('d', `M ${tail.join(' ')} L ${neck.join(' ')} M ${neck[0] + .13 * dy} ${neck[1] - .13 * dx} L ${tipX} ${tipY} L ${neck[0] - .13 * dy} ${neck[1] + .13 * dx} Z`);
    overlay.append(path);
  }
  board.append(overlay);
  return board;
}

export function signatureDiagram(doc, id) {
  if (!Object.hasOwn(DIAGRAMS, id)) return null;
  const {description, caption, boards, scoresheet} = DIAGRAMS[id];
  const figure = doc.createElement('figure'), art = doc.createElement('div'), label = doc.createElement('figcaption');
  figure.className = 'pv-sig-illustration';
  art.className = 'pv-sig-diagram';
  art.setAttribute('role', 'img');
  art.setAttribute('aria-label', description);
  if (boards) {
    for (const board of boards) art.append(drawBoard(doc, board));
  } else {
    const moves = doc.createElement('pre');
    moves.textContent = scoresheet.join('\n');
    art.append(moves);
  }
  label.textContent = caption;
  figure.append(art, label);
  return figure;
}

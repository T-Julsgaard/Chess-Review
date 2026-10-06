// Newly authored synthetic mechanics fixtures. No real game source or players.
export const fixtures = [
  {id: 'defended-equal-targets', fen: '7k/1p3p2/2b1b3/8/8/5N2/P7/K7 w - - 0 1', move: 'f3d4', expected: [], absent: ['fork'], note: 'Two bishops attacked, but pawn recaptures erase the nominal material gain.'},
  {id: 'royal-knight', fen: '4k3/5q1p/8/5N2/8/8/P7/K7 w - - 0 1', move: 'f5d6', expected: ['fork', 'check'], absent: ['allows-fork'], note: 'Checking royal fork; every reply has a material witness.'},
  {id: 'capturable-forker', fen: '3rk3/5q2/8/5N2/8/8/8/K7 w - - 0 1', move: 'f5d6', expected: ['check'], absent: ['fork'], note: 'The rook can capture the forking knight.'},
  {id: 'pawn-fork', fen: '7k/7p/2r1r3/8/3P4/8/1PP5/1K1B4 w - - 0 1', move: 'd4d5', expected: ['fork'], absent: ['check'], note: 'Non-checking pawn fork of two rooks; king has an escape square.'},
  {id: 'fork-countermate', fen: '7k/7p/2r1r3/8/3P4/8/PPP5/1K1B4 w - - 0 1', move: 'd4d5', expected: [], absent: ['fork'], note: 'Material capture allows immediate Rxd1 mate; reject the apparent fork.'},
  {id: 'fork-draw', fen: '4k3/5q2/8/5N2/8/8/8/K7 w - - 0 1', move: 'f5d6', expected: ['check'], absent: ['fork'], note: 'Capturing queen and recapturing knight leaves a dead position; no material-success claim.'},
  {id: 'pawn-fork-capturable', fen: '7k/8/2r1b3/8/3P4/8/8/K7 w - - 0 1', move: 'd4d5', expected: [], absent: ['fork'], note: 'The attacked bishop can take the pawn.'},
  {id: 'pinned-pawn-fork', fen: '3r3k/8/2r1r3/8/3P4/8/8/3K4 w - - 0 1', move: 'd4d5', expected: [], absent: ['fork'], note: 'Pawn geometrically forks but cannot legally capture off its pin.'},
  {id: 'already-forking', fen: '4k3/5q2/8/8/3N4/8/8/K7 w - - 0 1', move: 'd4b5', expected: [], absent: ['fork'], note: 'Single-target attack is not a fork.'},
  {id: 'existing-pawn-fork', fen: '7k/8/2r1r3/3P4/8/8/8/K7 w - - 0 1', move: 'a1b1', expected: [], absent: ['fork'], note: 'An unrelated move must not claim an existing fork.'},
  {id: 'absolute-pin', fen: '4k3/4n3/8/8/8/8/8/K2R4 w - - 0 1', move: 'd1e1', expected: ['absolute-pin'], absent: ['check'], note: 'A new rook pin of a knight to its king.'},
  {id: 'pin-line-movement', fen: '4k3/4r3/8/8/8/8/8/K2R4 w - - 0 1', move: 'd1e1', expected: ['absolute-pin'], absent: [], note: 'Pinned rook can move along the pin line, including taking the pinner.'},
  {id: 'two-blockers', fen: '4k3/4n3/4b3/8/8/8/8/K2R4 w - - 0 1', move: 'd1e1', expected: [], absent: ['absolute-pin'], note: 'Two blockers do not form a direct absolute pin.'},
  {id: 'relative-pin-deferred', fen: '7k/4q3/4n3/8/8/8/8/K2R4 w - - 0 1', move: 'd1e1', expected: [], absent: ['absolute-pin'], note: 'Queen behind blocker is not an absolute pin.'},
  {id: 'existing-pin', fen: '4k3/4n3/8/8/8/8/8/K3R3 w - - 0 1', move: 'a1b1', expected: [], absent: ['absolute-pin'], note: 'Existing motif is not attributed to an unrelated move.'},
  {id: 'existing-pin-relocation', fen: '4k3/4n3/8/8/8/8/8/K3R3 w - - 0 1', move: 'e1e2', expected: [], absent: ['absolute-pin'], note: 'Moving the same pinner along the line does not create a new pin.'},
  {id: 'discovered-check', fen: '4k3/8/8/8/8/8/4B3/K3R3 w - - 0 1', move: 'e2f3', expected: ['discovered-check'], absent: ['double-check'], note: 'Bishop clears the rook file.'},
  {id: 'double-check', fen: '4k3/8/8/8/8/8/4B3/K3R3 w - - 0 1', move: 'e2b5', expected: ['double-check', 'discovered-check'], absent: [], note: 'Both bishop and rook give check.'},
  {id: 'direct-check', fen: '4k3/8/8/8/8/8/8/K2R4 w - - 0 1', move: 'd1e1', expected: ['check'], absent: ['discovered-check'], note: 'Moved rook check is not discovered.'},
  {id: 'mate', fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1', move: 'g6g7', expected: ['checkmate'], absent: ['check', 'fork'], note: 'Terminal mate outranks lesser facts.'},
  {id: 'stalemate', fen: '7k/5K2/8/6Q1/8/8/8/8 w - - 0 1', move: 'g5g6', expected: ['stalemate'], absent: ['checkmate', 'fork'], note: 'No legal move without check.'},
  {id: 'castle-kingside', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', move: 'e1g1', expected: ['castling'], absent: ['discovered-check'], note: 'Only rule fact; no claim about king safety.'},
  {id: 'castle-queenside', fen: '4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', move: 'e1c1', expected: ['castling'], absent: [], note: 'Queenside rule fact.'},
  {id: 'castle-rook-check', fen: '5k2/8/8/8/8/8/8/4K2R w K - 0 1', move: 'e1g1', expected: ['castling', 'check'], absent: ['discovered-check'], note: 'Castling rook moved; do not call its check discovered.'},
  {id: 'en-passant', fen: '7k/8/8/3pP3/8/8/8/K7 w - d6 0 1', move: 'e5d6', expected: ['en-passant'], absent: [], note: 'Captured pawn is on d5, not d6.'},
  {id: 'en-passant-discovery', fen: '8/8/8/R2pP2k/8/8/8/K7 w - d6 0 1', move: 'e5d6', expected: ['en-passant', 'discovered-check'], absent: [], note: 'En passant removes both blockers of the rook check.'},
  {id: 'promotion', fen: '7k/P7/8/8/8/8/8/7K w - - 0 1', move: 'a7a8q', expected: ['promotion', 'check'], absent: [], note: 'Queen promotion, no qualitative assessment.'},
  {id: 'underpromotion', fen: '8/P6k/8/8/8/8/8/7K w - - 0 1', move: 'a7a8n', expected: ['promotion'], absent: ['fork'], note: 'Knight underpromotion; no claim it is best.'},
  {id: 'allows-fork', fen: '7k/8/8/8/5n2/8/5Q2/K7 w - - 0 1', move: 'a1e1', invalid: true, note: 'King cannot jump to e1; illegal inputs fail.'},
  {id: 'fork-warning', fen: '6k1/7p/8/8/5n2/8/P4Q2/4K3 w - - 0 1', move: 'f2b2', expected: ['allows-fork'], absent: ['fork'], note: 'Black Nd3+ forks king e1 and queen b2.'},
  {id: 'fork-avoidance', fen: '6k1/7p/8/8/5n2/8/P4Q2/4K3 w - - 0 1', move: 'f2e2', alternative: 'f2b2', expected: ['avoids-fork'], absent: ['allows-fork'], note: 'Concrete comparison to the legal queen move allowing Nd3+.'},
  {id: 'ordinary-move', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', move: 'e2e4', expected: [], absent: ['fork', 'avoids-fork', 'absolute-pin'], note: 'Unsupported positional advice stays silent.'},
  {id: 'missing-ep-right', fen: '7k/8/8/3pP3/8/8/8/K7 w - - 0 1', move: 'e5d6', invalid: true, note: 'En passant requires the recorded right.'},
  {id: 'illegal-pinned-move', fen: '3r3k/8/8/8/3N4/8/8/3K4 w - - 0 1', move: 'd4f5', invalid: true, note: 'Pinned knight cannot expose its king.'},
];

// Reflect ranks and swap colors; preserves pawn direction and castling wings.
export function reflect(fixture) {
  const parts = fixture.fen.split(' ');
  parts[0] = parts[0].split('/').reverse().map(row => row.replace(/[a-zA-Z]/g, c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())).join('/');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[2] = parts[2].replace(/[KQkq]/g, c => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()).split('').sort((a,b) => 'KQkq'.indexOf(a) - 'KQkq'.indexOf(b)).join('');
  const square = sq => sq[0] + (9 - +sq[1]);
  if (parts[3] !== '-') parts[3] = square(parts[3]);
  const move = m => square(m.slice(0, 2)) + square(m.slice(2, 4)) + m.slice(4);
  return {...fixture, id: fixture.id + '-black', fen: parts.join(' '), move: move(fixture.move),
    ...(fixture.alternative ? {alternative: move(fixture.alternative)} : {})};
}


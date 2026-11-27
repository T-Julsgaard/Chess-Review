import {Chess} from './chess.js';

const PIECES = {p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen', k:'king'};
const VALUES = {p:1, n:3, b:3, r:5, q:9, k:0};
const WEAK = new Set(['inacc', 'mistake', 'miss', 'blunder']);
const NAME = {w:'White', b:'Black'};
const RAYS = {b:[[1,1],[1,-1],[-1,1],[-1,-1]], r:[[1,0],[-1,0],[0,1],[0,-1]]};
RAYS.q = [...RAYS.b, ...RAYS.r];
const other = color => color === 'w' ? 'b' : 'w';
function moveLabel(move) {
  if (move.isKingsideCastle()) return 'Castle kingside';
  if (move.isQueensideCastle()) return 'Castle queenside';
  const piece = PIECES[move.piece];
  return piece[0].toUpperCase() + piece.slice(1) + ' ' + move.to
    + (move.promotion ? ' (' + PIECES[move.promotion] + ')' : '');
}
// For comparing pieces on a line, the king outranks everything.
const worth = type => type === 'k' ? 100 : VALUES[type];

export function explanationPv(result) {
  const top = result?.lines?.find(line => (line.multipv ?? 1) === 1);
  // A rejected provisional line must not re-enter via the result's duplicate PV.
  if (top) return !top.bound || top.bound === 'exact' ? top.pv || null : null;
  if (result?.bound && result.bound !== 'exact') return null;
  return result?.pv || result?.bestmove || null;
}

// Only describe legal moves from this exact position. An incomplete/invalid PV
// contributes its legal prefix; it never turns into an invented tactical story.
function continuation(fen, pv) {
  const board = new Chess(fen), moves = [], uci = [], san = [];
  for (const token of String(pv || '').trim().split(/\s+/).slice(0, 8)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token)) break;
    try {
      const number = board.moveNumber(), color = board.turn();
      const move = board.move({from:token.slice(0,2), to:token.slice(2,4), promotion:token[4]});
      moves.push(move); uci.push(token);
      san.push((color === 'w' ? number + '. ' : moves.length === 1 ? number + '… ' : '') + move.san);
    } catch {break;}
  }
  return {board, moves, uci:uci.join(' '), san:san.join(' ')};
}
function scoreLabel(score) {
  // UCI mate 0 carries no winning-side sign. The board determines checkmate;
  // this numeric label must not guess that Black won an unsigned score.
  if (Number.isFinite(score?.mate)) return score.mate === 0 ? null : 'mate for ' + (score.mate > 0 ? 'White' : 'Black');
  if (!Number.isFinite(score?.cp)) return null;
  return (score.cp > 0 ? '+' : '') + (score.cp / 100).toFixed(1);
}
const mateFor = score => Number.isFinite(score?.mate) && score.mate !== 0 ? (score.mate > 0 ? 'w' : 'b') : null;

// --- Board geometry ---------------------------------------------------------
// Everything below reads attacks on a single fixed position (chess.js
// attackers()). It never searches, so a motif is a geometric fact about the
// shown position, and the engine's score stays the judge of whether it works.

const pieceName = piece => piece.type === 'k' ? 'the king' : `the ${PIECES[piece.type]} on ${piece.square}`;
const list = items => items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' and ' + items.at(-1);
const pieces = board => board.board().flat().filter(Boolean);
const defended = (board, square, color) => board.attackers(square, color).length > 0;

// Safe: nothing attacks it, or it is defended and no attacker is worth less.
function safe(board, square) {
  const piece = board.get(square), attackers = board.attackers(square, other(piece.color));
  if (!attackers.length) return true;
  if (!defended(board, square, piece.color)) return false;
  return attackers.every(from => {const type = board.get(from).type; return type === 'k' || VALUES[type] >= VALUES[piece.type];});
}
// Enemy pieces the piece on `from` attacks that are worth attacking: the king,
// anything worth more than the attacker, or an undefended piece (not a pawn).
function targets(board, from) {
  const mover = board.get(from), enemy = other(mover.color);
  return pieces(board).filter(piece => piece.color === enemy
    && board.attackers(piece.square, mover.color).includes(from)
    && (piece.type === 'k' || VALUES[piece.type] > VALUES[mover.type]
      || (piece.type !== 'p' && !defended(board, piece.square, enemy))))
    .sort((a, b) => (b.type === 'k') - (a.type === 'k') || VALUES[b.type] - VALUES[a.type]);
}
// Pin or skewer by the slider on `from`: the first two pieces along one of its
// lines are both enemy pieces, and the one behind is worth winning.
function lineTactic(board, from) {
  const slider = board.get(from), rays = RAYS[slider.type], enemy = other(slider.color);
  if (!rays) return null;
  for (const [df, dr] of rays) {
    const hits = [];
    for (let f = from.charCodeAt(0) - 97 + df, r = +from[1] - 1 + dr; f >= 0 && f < 8 && r >= 0 && r < 8 && hits.length < 2; f += df, r += dr) {
      const square = 'abcdefgh'[f] + (r + 1), piece = board.get(square);
      if (piece) hits.push({...piece, square});
    }
    if (hits.length < 2 || hits.some(piece => piece.color !== enemy)) continue;
    const [front, back] = hits;
    const winnable = back.type !== 'p' && (VALUES[back.type] > VALUES[slider.type] || !defended(board, back.square, enemy));
    if (worth(front.type) > worth(back.type)) {
      if (winnable) return {kind:'skewer', front, back};
    } else if (front.type !== 'p' && (back.type === 'k' || (worth(back.type) > worth(front.type) && winnable))) {
      return {kind:'pin', front, back};
    }
  }
  return null;
}
function kingSquare(board, color) {
  return pieces(board).find(piece => piece.type === 'k' && piece.color === color)?.square;
}

// --- Material over a line ----------------------------------------------------
// A capture alone does not say who wins material: the piece may be won back a
// move later. Material is compared only where the line settles: not in check,
// and the next move is neither a capture nor a check (or the line ends with
// nothing left to take back).
function quietPoints(moves, from) {
  const quiet = [];
  for (let i = Math.max(from, 1); i <= moves.length; i++) {
    const board = new Chess(moves[i - 1].after), next = moves[i];
    if (board.inCheck()) continue;
    // A line may end on a capture, but only once nothing can profitably take back.
    if (next ? next.captured || /[+#]/.test(next.san) : moves[i - 1].captured && unsettled(board, [moves[i - 1].to])) continue;
    quiet.push(board);
  }
  return quiet;
}
// Legal captures onto one square, generated only for the pieces attacking it.
const capturesOn = (board, square) => board.attackers(square, board.turn()).flatMap(from => board.moves({square:from, verbose:true}))
  .filter(move => move.to === square && move.captured && (!move.promotion || move.promotion === 'q'));
// Static exchange: what the side to move gains by capturing on `square` with its
// cheapest piece, each side recapturing only while that does not lose material.
function exchange(board, square) {
  const capture = capturesOn(board, square).sort((a, b) => worth(a.piece) - worth(b.piece))[0];
  if (!capture) return 0;
  board.move(capture.lan);
  const value = VALUES[capture.captured] - exchange(board, square);
  board.undo();
  return Math.max(0, value);
}
// Material is in flux while a king is in check or a piece that just captured
// can still be won back. An unrelated loose pawn elsewhere does not count.
function unsettled(board, squares) {
  if (board.inCheck()) return true;
  return [...new Set(squares)].flatMap(square => capturesOn(board, square)).some(move => {
    board.move(move.lan);
    const value = VALUES[move.captured] - exchange(board, move.to);
    board.undo();
    return value > 0;
  });
}
const count = board => pieces(board).reduce((all, piece) => {
  all[piece.color][piece.type] = (all[piece.color][piece.type] || 0) + 1; return all;
}, {w:{}, b:{}});
// What `winner` took and gave up from `fen` to where the line settles, with
// equal pieces cancelled: a knight for a knight is no material at all. The
// gain must still stand at the last settled position, so a pawn that is simply
// won back a few moves later is not reported as won.
function balance(fen, end, winner) {
  const start = count(new Chess(fen)), finish = count(end), loser = other(winner), won = [], lost = [];
  for (const type of ['q', 'r', 'b', 'n', 'p']) {
    const took = (start[loser][type] || 0) - (finish[loser][type] || 0);
    const gave = (start[winner][type] || 0) - (finish[winner][type] || 0);
    if (took < 0 || gave < 0) return null; // A promotion changes material in ways this does not name.
    const same = Math.min(took, gave);
    won.push(...Array(took - same).fill(type)); lost.push(...Array(gave - same).fill(type));
  }
  // A bishop and a knight are worth the same, so they cancel like equal pieces.
  for (const [a, b] of [['b', 'n'], ['n', 'b']]) {
    while (won.includes(a) && lost.includes(b)) { won.splice(won.indexOf(a), 1); lost.splice(lost.indexOf(b), 1); }
  }
  const sum = types => types.reduce((total, type) => total + VALUES[type], 0);
  return {won, lost, net:sum(won) - sum(lost)};
}
function outcome(fen, moves, winner, from) {
  const quiet = quietPoints(moves, from);
  if (!quiet.length) return null;
  const first = balance(fen, quiet[0], winner), last = balance(fen, quiet.at(-1), winner);
  if (!first || !last) return null;
  // Name what changed hands where the line first settles, but count only what is still held at its end.
  return {...first, net:Math.min(first.net, last.net)};
}
const NUMBERS = ['', 'a', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
function material(types) {
  const groups = [...new Set(types)].map(type => {
    const n = types.filter(t => t === type).length;
    return n === 1 ? `a ${PIECES[type]}` : `${NUMBERS[n] || n} ${PIECES[type]}s`;
  });
  return list(groups);
}
const gain = result => material(result.won) + (result.lost.length ? ' for ' + material(result.lost) : '');

// What a single legal move does on the board: capture, fork, pin, skewer,
// attack and check. `ing` reads "…, forking the king and the rook on a8" and
// `s` reads "This forks the king and the rook on a8". `settled` is the material
// outcome of the line the move starts, when known; it keeps "undefended" and
// "wins" honest when the material comes straight back.
function describe(move, previous, settled = null) {
  const board = new Chess(move.after);
  const color = move.color, enemy = other(color), parts = [];
  let capture = null, tactic = null, check = null, revealed = null;
  if (board.get(move.to).type !== 'k' && safe(board, move.to)) {
    const hit = targets(board, move.to);
    tactic = hit.length >= 2 ? {kind:'fork', targets:hit} : lineTactic(board, move.to)
      || (hit.length === 1 && hit[0].type !== 'k' ? {kind:'attack', target:hit[0]} : null);
  }
  const motif = tactic && tactic.kind !== 'attack';
  if (move.captured) {
    const square = move.isEnPassant() ? move.to[0] + move.from[1] : move.to;
    // Taking back on the square the previous move captured on is a trade, not a loose piece.
    const recapture = Boolean(previous?.captured) && previous.to === square;
    const bare = !recapture && !move.isEnPassant() && !defended(board, square, enemy);
    capture = {square, type:move.captured, recapture,
      loose:bare && (!settled || settled.net >= VALUES[move.captured])};
  }
  // Winning material is named as what changes hands, not as the first capture.
  const winning = Boolean(settled && settled.net >= 1 && !motif && !capture?.loose);
  if (winning) {
    parts.push([`winning ${gain(settled)}`, `wins ${gain(settled)}`]);
    tactic = null;
  } else if (capture) {
    const what = PIECES[capture.type], at = `the ${what} on ${capture.square}`;
    if (capture.recapture) parts.push([`recapturing ${at}`, `recaptures ${at}`]);
    else if (capture.loose) parts.push([`capturing the undefended ${what} on ${capture.square}`, `captures the undefended ${what} on ${capture.square}`]);
    else if (move.piece !== 'k' && VALUES[capture.type] > VALUES[move.piece]) {
      parts.push([`capturing ${at} with a ${PIECES[move.piece]}`, `captures ${at} with a ${PIECES[move.piece]}`]);
    } else parts.push([`capturing ${at}`, `captures ${at}`]);
  }
  if (tactic?.kind === 'fork') parts.push([`forking ${list(tactic.targets.map(pieceName))}`, `forks ${list(tactic.targets.map(pieceName))}`]);
  else if (tactic?.kind === 'pin') parts.push([`pinning ${pieceName(tactic.front)} to ${pieceName(tactic.back)}`, `pins ${pieceName(tactic.front)} to ${pieceName(tactic.back)}`]);
  else if (tactic?.kind === 'skewer') {
    const text = `${pieceName(tactic.front)} and ${pieceName(tactic.back)} behind it`;
    parts.push([`skewering ${text}`, `skewers ${text}`]);
  } else if (tactic?.kind === 'attack') parts.push([`attacking ${pieceName(tactic.target)}`, `attacks ${pieceName(tactic.target)}`]);
  if (board.inCheck()) {
    const by = board.attackers(kingSquare(board, enemy), color);
    check = by.length > 1 ? 'double' : by.includes(move.to) ? 'direct' : 'discovered';
    // The piece whose line the move opened, for "the rook on e1 gives check".
    const line = by.find(square => square !== move.to);
    if (line) revealed = {...board.get(line), square:line};
  }
  const impliedCheck = winning || tactic?.kind === 'fork' && tactic.targets[0].type === 'k' || tactic?.kind === 'skewer' && tactic.front.type === 'k';
  let suffix = '';
  if (check && !impliedCheck) {
    const phrase = {direct:'check', double:'double check', discovered:'a discovered check'}[check];
    // "with a bishop with check" reads badly; the second "with" becomes "giving".
    if (parts.length) suffix = (parts.at(-1)[0].includes(' with a ') ? ', giving ' : ' with ') + phrase;
    else parts.push(check === 'direct' ? ['putting the king in check', 'gives check'] : ['giving ' + phrase, 'gives ' + phrase]);
  }
  if (!parts.length) return null;
  // A capture that only trades material, with no motif, is not why a move works or fails.
  const trade = Boolean(capture && !capture.loose && !winning && !motif && settled && settled.net <= 0);
  return {capture, tactic, check, revealed, winning, trade, piece:move.piece,
    ing:parts.map(p => p[0]).join(' and ') + suffix, s:parts.map(p => p[1]).join(' and ') + suffix};
}

// Why the reply hurts, in one sentence, from the punished player's side.
function consequence(info, played, before, player, mention) {
  const {tactic, capture} = info;
  if (tactic?.kind === 'fork') {
    const rest = tactic.targets.filter(piece => piece.type !== 'k');
    if (rest.length < tactic.targets.length) return `The check must be answered first, leaving ${list(rest.map(pieceName))} exposed.`;
    return `${player} can't move ${rest.length === 2 ? 'both pieces' : 'all of them'} at once.`;
  }
  if (tactic?.kind === 'pin') return tactic.back.type === 'k'
    ? `The pinned ${PIECES[tactic.front.type]} can't move away without exposing the king.`
    : `If the ${PIECES[tactic.front.type]} moves, ${pieceName(tactic.back)} behind it is exposed.`;
  if (tactic?.kind === 'skewer') return tactic.front.type === 'k'
    ? `Once the king steps aside, ${pieceName(tactic.back)} can be taken.`
    : `If the ${PIECES[tactic.front.type]} moves away, ${pieceName(tactic.back)} behind it can be taken.`;
  if (capture?.loose) {
    const what = PIECES[capture.type];
    if (played?.to === capture.square) return `${mention(played, 'played')} moved the ${what} to a square where nothing defended it.`;
    if (played && before.get(capture.square)?.type === capture.type && defended(before, capture.square, before.turn())) {
      return `${mention(played, 'played')} left the ${what} on ${capture.square} without a defender.`;
    }
    return '';
  }
  if (info.check === 'double') return 'Two pieces give check at once, so only a king move can answer it.';
  if (info.check === 'discovered') return `The ${PIECES[info.piece]} moved out of the way, so ${pieceName(info.revealed)} now gives check.`;
  return '';
}
// A mating line is quoted only when the board confirms it ends in checkmate
// of the losing side and its length matches the reported mate distance.
function matingLine(line, winner, mate) {
  if (!line.moves.length || !line.board.isCheckmate() || line.board.turn() === winner) return null;
  const winnerMoves = line.moves.filter(move => move.color === winner).length;
  return Number.isFinite(mate) && winnerMoves !== Math.abs(mate) ? null : line.san;
}
function playedMove(beforeFen, afterFen) {
  const key = fen => fen.split(' ').slice(0, 3).join(' ');
  const board = new Chess(beforeFen), after = new Chess(afterFen), side = board.turn();
  // Only pieces whose squares changed can have moved, so only their moves are generated.
  const from = pieces(board).filter(piece => piece.color === side)
    .filter(piece => after.get(piece.square)?.type !== piece.type || after.get(piece.square)?.color !== side);
  return from.flatMap(piece => board.moves({square:piece.square, verbose:true}))
    .find(move => key(move.after) === key(afterFen)) || null;
}

// Selected, changed board facts inspired by E021 and the P007 teaching curation.
// No reply tree, history reconstruction or extra Stockfish search is needed.
// These describe what changed; they do not certify a strategic advantage.
function quietPurpose(move) {
  const before = new Chess(move.before), after = new Chess(move.after), side = move.color;
  const own = pieces(after).filter(piece => piece.color === side), rank = side === 'w' ? '1' : '8';
  const home = side === 'w' ? '2' : '7';
  if (move.isKingsideCastle() || move.isQueensideCastle()) return 'Castling takes the king away from the center and brings the rook into play.';
  if (!safe(after, move.to)) return null;
  // A piece that was attacked and is now safe is a retreat; say what it escaped.
  if (move.piece !== 'k' && !safe(before, move.from)) {
    const by = before.attackers(move.from, other(side)).map(square => ({...before.get(square), square}))
      .sort((a, b) => worth(a.type) - worth(b.type))[0];
    if (by) return `The ${PIECES[move.piece]} moves to safety from ${pieceName(by)}.`;
  }
  if (move.piece === 'p') {
    const passed = !pieces(after).some(piece => piece.color !== side && piece.type === 'p'
      && Math.abs(piece.square.charCodeAt(0) - move.to.charCodeAt(0)) <= 1
      && (side === 'w' ? +piece.square[1] > +move.to[1] : +piece.square[1] < +move.to[1]));
    if (passed && (side === 'w' ? +move.to[1] >= 5 : +move.to[1] <= 4)) return `The passed pawn advances toward promotion on ${move.to}.`;
  }
  if (move.piece === 'r' && move.from[0] !== move.to[0]) {
    const pawns = pieces(after).filter(piece => piece.type === 'p' && piece.square[0] === move.to[0]);
    if (!pawns.length) return `The rook takes the open ${move.to[0]}-file.`;
    if (pawns.every(piece => piece.color !== side)) {
      const ahead = pawns.sort((a, b) => Math.abs(a.square[1] - move.to[1]) - Math.abs(b.square[1] - move.to[1]))[0];
      return `The rook takes the semi-open ${move.to[0]}-file, facing the pawn on ${ahead.square}.`;
    }
  }
  const rooks = own.filter(piece => piece.type === 'r');
  if (rooks.length === 2 && after.attackers(rooks[0].square, side).includes(rooks[1].square)) {
    const old = pieces(before).filter(piece => piece.type === 'r' && piece.color === side);
    if (old.length === 2 && !before.attackers(old[0].square, side).includes(old[1].square)) return 'This connects the rooks so they defend each other.';
  }
  const newDefender = own.find(piece => piece.square !== move.to && piece.type !== 'k'
    && before.get(piece.square)?.color === side && !defended(before, piece.square, side)
    && defended(before, piece.square, other(side)) && after.attackers(piece.square, side).includes(move.to));
  if (newDefender) return `This defends the ${PIECES[newDefender.type]} on ${newDefender.square}, which was under attack.`;
  if (['b','n'].includes(move.piece) && move.from[1] === rank && move.to[1] !== rank && before.moveNumber() <= 10) {
    const center = ['d4','e4','d5','e5'].filter(square => after.attackers(square, side).includes(move.to));
    return center.length ? `The ${PIECES[move.piece]} develops and controls ${list(center)} in the center.`
      : `The ${PIECES[move.piece]} leaves the back rank and enters the game.`;
  }
  if (move.piece === 'p' && move.from[1] === home) {
    const bishop = own.find(piece => piece.type === 'b' && piece.square[1] === rank
      && before.attackers(move.from, side).includes(piece.square)
      && after.attackers(move.from, side).includes(piece.square));
    if (bishop) return `This opens a diagonal for the bishop on ${bishop.square}.`;
  }
  return null;
}

// Scores passed here are the review's White-relative scores, not raw UCI scores.
// viewerSide is the identified user, independent of the board's orientation.
// Without that identity, use color names rather than guessing who is "you".
// This function does no searches and cannot change classifications or accuracy.
// earlierFens are the game's positions before beforeFen, oldest first ([] at
// the first move). They let a recapture read as a trade instead of a free
// piece, and let an exchange be counted from where it began.
export function explainMove({beforeFen, afterFen, earlierFens, category, beforeScore, afterScore, beforePv, afterPv, viewerSide}) {
  try {
    const before = new Chess(beforeFen), after = new Chess(afterFen);
    const side = before.turn(), knownViewer = viewerSide === 'w' || viewerSide === 'b';
    const subject = color => !knownViewer ? NAME[color] : color === viewerSide ? 'You' : 'Your opponent';
    const possessive = color => !knownViewer ? NAME[color] + "'s" : color === viewerSide ? 'Your' : "Your opponent's";
    const opponent = subject(other(side)), player = subject(side);
    const moveSubject = knownViewer ? possessive(side) + ' move' : 'This';
    const reply = continuation(afterFen, afterPv), alternative = continuation(beforeFen, beforePv);
    const weak = WEAK.has(category), first = reply.moves[0], played = playedMove(beforeFen, afterFen);
    // Without history a recapture looks like a free piece, so only the reply,
    // which starts after this move, is counted.
    const known = Array.isArray(earlierFens);
    const prior = known && earlierFens.length ? playedMove(earlierFens.at(-1), beforeFen) : null;
    // Material is counted from where the current exchange began: walk back
    // through captures, checks and check answers while a capture is still
    // pending. Taking back a piece is then an even trade, and an exchange that
    // began a few moves earlier counts in full. Worked out only when needed.
    let past = null;
    const recall = () => past || (past = (() => {
      // Only the connected end of the supplied history is used.
      const calm = [...earlierFens.slice(-12), beforeFen], history = [];
      for (let k = calm.length - 1; k > 0; k--) {
        const move = k === calm.length - 1 && prior ? prior : playedMove(calm[k - 1], calm[k]);
        if (!move) { calm.splice(0, k); break; }
        history.unshift(move);
      }
      const forcing = move => Boolean(move && (move.captured || /[+#]/.test(move.san)));
      const memo = new Map();
      // Squares where the last three moves captured, while the capturer still stands there.
      const open = k => {
        if (!memo.has(k)) {
          const board = new Chess(calm[k]);
          const squares = history.slice(Math.max(0, k - 3), k)
            .filter(move => move.captured && board.get(move.to)?.color === move.color).map(move => move.to);
          memo.set(k, unsettled(board, squares));
        }
        return memo.get(k);
      };
      let begin = history.length;
      while (begin > 0 && open(begin) && (forcing(history[begin - 1]) || /[+#]/.test(history[begin - 2]?.san || ''))) begin--;
      // A gain must also stand against the calm positions just before, so a pawn
      // that is only won back is not called won or undefended.
      const checks = [begin];
      for (let k = begin - 1; k >= Math.max(0, begin - 4); k--) if (!open(k)) checks.push(k);
      return {calm, history, checks};
    })());
    const fromCalm = (line, winner, skip) => {
      if (!line.length || !known) return null;
      const {calm, history, checks} = recall();
      const results = checks.map(k => outcome(calm[k], [...history.slice(k), ...line], winner, history.length - k + skip));
      if (!results[0]) return null;
      return {...results[0], net:Math.min(...results.filter(Boolean).map(result => result.net))};
    };
    // Mark only actual move mentions, never incidental square names in prose.
    // Every link carries the legal prefix from its own before/after position.
    const references = [];
    const reference = (move, origin, pv = move.lan) => ({
      text: moveLabel(move), san: move.san, uci: pv,
      origin, category: origin === 'played' ? category : 'best',
      plyOffset: origin === 'reply' ? 0 : -1,
      from: move.from, to: move.to,
    });
    const mention = (move, origin, pv) => {
      references.push(reference(move, origin, pv));
      return '\uE000' + (references.length - 1) + '\uE001';
    };
    const quoteMate = (line, winner, mate, origin) => !matingLine(line, winner, mate) ? null
      : line.moves.map((move, index) => {
        const number = new Chess(move.before).moveNumber();
        const prefix = move.color === 'w' ? number + '. ' : index === 0 ? number + '… ' : '';
        return prefix + mention(move, origin, line.uci.split(' ').slice(0, index + 1).join(' '));
      }).join(' ');
    const prose = text => {
      const parts = [], pattern = /\uE000(\d+)\uE001/g;
      let start = 0;
      for (const match of text.matchAll(pattern)) {
        if (match.index > start) parts.push({text:text.slice(start, match.index)});
        const move = references[+match[1]];
        parts.push({text:move.text, move}); start = match.index + match[0].length;
      }
      if (start < text.length) parts.push({text:text.slice(start)});
      return parts;
    };
    const previous = scoreLabel(beforeScore), current = scoreLabel(afterScore);
    const better = weak && alternative.moves.length && alternative.moves[0].san !== played?.san ? alternative : null;
    const betterInfo = better && describe(better.moves[0], prior, fromCalm(better.moves, side, 1));
    // The reply is judged from just before the played move, so a reply that only takes
    // back what the played move captured is an even trade, not the punishment.
    const replySettled = weak && first && played ? outcome(beforeFen, [played, ...reply.moves], other(side), 2) : null;
    const replyDescribed = weak && first ? describe(first, played, replySettled) : null;
    const replyInfo = replyDescribed?.trade ? null : replyDescribed;
    const couldHave = () => (knownViewer ? `${player} could have played ` : 'Better was ') + mention(better.moves[0], 'alternative');
    const betterLine = better ? couldHave() + '.' : '';
    // When the summary is only an evaluation, the alternative also says what it does.
    const betterReason = betterInfo && !betterInfo.trade ? betterInfo : null;
    const betterWhy = betterReason ? `${couldHave()}, ${betterReason.ing}.` : betterLine;
    const loss = Number.isFinite(beforeScore?.cp) && Number.isFinite(afterScore?.cp)
      ? (beforeScore.cp - afterScore.cp) * (side === 'w' ? 1 : -1) : null;
    const beneficiary = !knownViewer ? opponent : other(side) === viewerSide ? 'you' : 'your opponent';
    const lossLine = loss >= 30 ? `${moveSubject} gives ${beneficiary} a ${loss >= 200 ? 'much stronger' : 'better'} position.` : '';
    let summary, detail = '';
    if (after.isCheckmate()) summary = 'Checkmate. The king has no legal escape.';
    else if (after.isStalemate()) summary = 'Stalemate: there are no legal moves, but the king is not in check.';
    else if (weak && first?.san.includes('#')) {
      summary = `${moveSubject} allows ${mention(first, 'reply')}, checkmate.`;
      detail = betterLine;
    } else if (weak && mateFor(afterScore) && mateFor(afterScore) !== side) {
      const alreadyFacingMate = mateFor(beforeScore) && mateFor(beforeScore) !== side;
      const winner = !knownViewer ? opponent : other(side) === viewerSide ? 'you' : 'your opponent';
      summary = alreadyFacingMate ? `${player} ${player === 'You' ? 'are' : 'is'} still facing a forced mate.`
        : `${moveSubject} allows mate in ${Math.abs(afterScore.mate)} for ${winner}.`;
      // Scores and displayed lines can come from different searches. The line
      // is quoted only when the board proves it mates in the reported distance.
      const line = quoteMate(reply, other(side), afterScore.mate, 'reply');
      detail = line ? `Mating line: ${line}.` : betterLine;
    } else if (weak && mateFor(beforeScore) === side && !Number.isFinite(afterScore?.mate)) {
      summary = `${moveSubject} lets a forced mate slip away.`;
      const line = quoteMate(alternative, side, beforeScore.mate, 'alternative');
      detail = betterLine || (line ? `Mating line: ${line}.` : '');
    } else if (category === 'miss' && betterReason) {
      // A miss is about the chance that was passed up, so lead with it.
      summary = `${moveSubject} misses ${mention(better.moves[0], 'alternative')}, ${betterReason.ing}.`;
      detail = '';
    } else if (weak && first?.promotion) {
      summary = `${opponent} can reply ${mention(first, 'reply')}, promoting to a ${PIECES[first.promotion]}.`;
      detail = betterLine;
    } else if (replyInfo) {
      const info = replyInfo;
      const plainCheck = !info.capture && !info.tactic && info.check === 'direct';
      summary = plainCheck ? `${moveSubject} allows ${mention(first, 'reply')}, putting the king in check.` : `${opponent} can reply ${mention(first, 'reply')}, ${info.ing}.`;
      // The alternative is more useful than repeating the tactic.
      detail = betterLine || consequence(info, played, before, player, mention);
    } else if (weak && betterReason) {
      summary = lossLine || 'A stronger move was available.';
      detail = betterWhy;
    } else if (weak && better && quietPurpose(better.moves[0])) {
      summary = betterLine;
      detail = quietPurpose(better.moves[0]);
    } else if (weak && loss !== null) {
      summary = lossLine || 'A stronger continuation was available.';
      detail = betterLine || (first ? `${possessive(other(side))} best reply is ${mention(first, 'reply')}.` : '');
    } else if (weak) {
      summary = 'A stronger move was available.';
      detail = betterLine || (first ? `${possessive(other(side))} best reply is ${mention(first, 'reply')}.` : '');
    } else {
      summary = {
        brilliant:'A sacrifice that Stockfish rates as sound.',
        great:'A strong response to the previous mistake.',
        best:"Stockfish's first choice in this position.",
        excellent:'A precise move that keeps the position on track.',
        good:'A playable move, with a stronger option available.',
        book:'This follows a known position in the opening book.',
      }[category] || (reply.moves.length ? 'Explore the available engine continuation.' : 'Waiting for analysis of this move.');
      if (category && category !== 'book' && played) {
        const piece = PIECES[played.promotion || played.piece], moved = after.get(played.to);
        const sacrifice = category === 'brilliant' && moved.type !== 'k' && !safe(after, played.to);
        const withCheck = after.inCheck() ? ', with check' : '';
        const offered = !sacrifice ? ''
          : played.captured && VALUES[played.captured] < VALUES[moved.type]
            ? `${moveSubject} gives up the ${piece} for a ${PIECES[played.captured]}${withCheck}.` : `${moveSubject} offers the ${piece} on ${played.to}${withCheck}.`;
        // A sacrificed piece can be taken, so it has no fork or pin to describe.
        const info = sacrifice ? null : played.promotion ? {s:`promotes to a ${piece}`}
          : describe(played, prior, fromCalm([played, ...reply.moves], side, 1));
        const mate = mateFor(afterScore) === side ? quoteMate(reply, side, afterScore.mate, 'reply') : null;
        const distance = Math.abs(afterScore?.mate);
        const mateText = mateFor(afterScore) === side
          ? `${moveSubject} forces mate ${distance === 1 ? 'next move' : 'in ' + distance}${mate ? ': ' + mate : ''}.` : '';
        const purpose = mateText || offered || (info ? `${moveSubject} ${info.s}.` : quietPurpose(played));
        if (purpose) { summary = purpose; detail = ''; }
      }
    }
    const summaryParts = prose(summary), detailParts = prose(detail);
    return {
      summary: summaryParts.map(part => part.text).join(''), detail: detailParts.map(part => part.text).join(''),
      summaryParts, detailParts, played: played ? reference(played, 'played') : null,
      evaluation: previous && current ? `${previous} → ${current}` : null,
      reply: reply.moves.length ? {san:reply.san, uci:reply.uci, text:reply.moves.map(moveLabel).join(' → ')} : null,
      alternative: better ? {san:better.san, uci:better.uci, move:better.moves[0].san,
        moveText:moveLabel(better.moves[0]), text:better.moves.map(moveLabel).join(' → ')} : null,
      threat: weak && first && !after.isGameOver()
        && (mateFor(afterScore) !== other(side) || matingLine(reply, other(side), afterScore.mate))
        ? {san:first.san, text:moveLabel(first), uci:reply.uci.split(' ')[0]} : null,
    };
  } catch {return null;}
}

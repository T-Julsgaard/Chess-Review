import {Chess} from './chess.js';

const PIECES = {p:'pawn', n:'knight', b:'bishop', r:'rook', q:'queen'};
const VALUES = {p:1, n:3, b:3, r:5, q:9, k:0};
const WEAK = new Set(['inacc', 'mistake', 'miss', 'blunder']);

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
function material(board, side) {
  return board.board().flat().filter(Boolean).reduce((sum, piece) =>
    sum + (piece.color === side ? 1 : -1) * VALUES[piece.type], 0);
}
function scoreLabel(score) {
  if (Number.isFinite(score?.mate)) return 'mate for ' + (score.mate > 0 ? 'White' : 'Black');
  if (!Number.isFinite(score?.cp)) return null;
  return (score.cp > 0 ? '+' : '') + (score.cp / 100).toFixed(1);
}

// Scores passed here are the review's White-relative scores, not raw UCI scores.
// This function does no searches and cannot change classifications or accuracy.
export function explainMove({beforeFen, afterFen, category, beforeScore, afterScore, beforePv, afterPv}) {
  try {
    const before = new Chess(beforeFen), after = new Chess(afterFen);
    const side = before.turn(), opponent = side === 'w' ? 'Black' : 'White', player = side === 'w' ? 'White' : 'Black';
    const reply = continuation(afterFen, afterPv), alternative = continuation(beforeFen, beforePv);
    const weak = WEAK.has(category), first = reply.moves[0];
    const previous = scoreLabel(beforeScore), current = scoreLabel(afterScore);
    let summary, detail = '';
    if (after.isCheckmate()) summary = 'Checkmate. The king has no legal escape.';
    else if (after.isStalemate()) summary = 'Stalemate: there are no legal moves, but the king is not in check.';
    else if (weak && first?.san.includes('#')) {
      summary = `This allows ${first.san}, checkmate.`;
      detail = `${opponent} can end the game immediately; ${player} has no legal answer to the check.`;
    } else if (weak && Number.isFinite(afterScore?.mate) && afterScore.mate !== 0
      && (afterScore.mate > 0 ? 'w' : 'b') !== side) {
      summary = `This allows a forced mate for ${opponent}.`;
      detail = first ? `Stockfish finds mate in ${Math.abs(afterScore.mate)}, starting with ${first.san}.` : `Stockfish reports mate in ${Math.abs(afterScore.mate)}.`;
    } else if (weak && Number.isFinite(beforeScore?.mate) && beforeScore.mate !== 0
      && (beforeScore.mate > 0 ? 'w' : 'b') === side && !Number.isFinite(afterScore?.mate)) {
      summary = 'This lets a forced mate slip away.';
      if (alternative.moves[0]) detail = `Stockfish's mating continuation starts with ${alternative.moves[0].san}.`;
    } else if (weak && first?.captured) {
      const capturedSquare = first.isEnPassant() ? first.to[0] + first.from[1] : first.to;
      summary = `${opponent} can reply ${first.san}, capturing the ${PIECES[first.captured]} on ${capturedSquare}.`;
      const loss = material(before, side) - material(reply.board, side);
      if (reply.moves.length >= 3 && loss >= 2) detail = `In the shown engine line, ${player} loses a net ${loss} points of material.`;
    } else if (weak && Number.isFinite(beforeScore?.cp) && Number.isFinite(afterScore?.cp)) {
      const loss = (beforeScore.cp - afterScore.cp) * (side === 'w' ? 1 : -1);
      summary = loss >= 30 ? `This gives up ${(loss / 100).toFixed(1)} pawns of engine evaluation.` : 'Stockfish prefers a different continuation here.';
      if (first) detail = `${opponent}'s strongest reply is ${first.san}.`;
    } else {
      summary = {
        brilliant:'A sacrifice that Stockfish rates as sound.',
        great:'The only strong move that takes advantage of the previous mistake.',
        best:"Stockfish's first choice in this position.",
        excellent:'This keeps nearly all of the position’s winning chances.',
        good:'A playable move, with a stronger option available.',
        book:'This follows a known position in the opening book.',
      }[category] || 'The available engine line is shown below.';
      if (category === 'brilliant' && current) detail = `After the sacrifice, the engine evaluation is ${current} (White's perspective).`;
    }
    return {
      summary, detail,
      evaluation: previous && current ? `${previous} → ${current}` : null,
      reply: reply.moves.length ? {san:reply.san, uci:reply.uci} : null,
      alternative: weak && alternative.moves.length && alternative.moves[0].after !== afterFen
        ? {san:alternative.san, uci:alternative.uci, move:alternative.moves[0].san} : null,
    };
  } catch {return null;}
}

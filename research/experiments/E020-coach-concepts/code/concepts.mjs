import {Chess} from '../../../../lib/chess.js';

export const VALUES = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
const NAMES = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const other = color => color === 'w' ? 'b' : 'w';
export const uci = move => move.from + move.to + (move.promotion || '');
const pieces = chess => chess.board().flat().filter(Boolean);
const king = (chess, color) => pieces(chess).find(p => p.color === color && p.type === 'k').square;
const balance = (chess, color) => pieces(chess).reduce((v, p) => v + VALUES[p.type] * (p.color === color ? 1 : -1), 0);
const event = (id, text, evidence) => ({id, text, evidence, qualityClaim: false});
class Exhausted extends Error {}
function budget(limit) {
  if (!Number.isSafeInteger(limit) || limit < 1) throw Error('maxNodes must be a positive safe integer');
  return {used: 0, limit, tick() { if (++this.used > this.limit) throw new Exhausted(); }};
}
function play(chess, move, work, fn) {
  work.tick();
  chess.move(move);
  try { return fn(); } finally { chess.undo(); }
}
function moves(chess, work) { work.tick(); return chess.moves({verbose: true}); }
function drawn(chess) { return !chess.isCheckmate() && chess.isDraw(); }

export function legalPosition(fen) {
  const chess = new Chess(fen);
  const fields = fen.split(/\s+/), rights = fields[2], ep = fields[3];
  if (!/^(?:K?Q?k?q?|-)$/.test(rights) || !/^(0|[1-9]\d*)$/.test(fields[4]) ||
      !/^[1-9]\d*$/.test(fields[5]) || !Number.isSafeInteger(+fields[4]) || !Number.isSafeInteger(+fields[5])) {
    throw Error('Invalid position: malformed rights or counters');
  }
  for (const [right, color, rank, file] of [['K','w','1','h'],['Q','w','1','a'],['k','b','8','h'],['q','b','8','a']]) {
    if (!rights.includes(right)) continue;
    const k = chess.get('e'+rank), r = chess.get(file+rank);
    if (k?.type !== 'k' || k.color !== color || r?.type !== 'r' || r.color !== color) {
      throw Error('Invalid position: castling rights lack starting king/rook');
    }
  }
  if (ep !== '-') {
    const advanced = chess.get(ep[0] + (chess.turn() === 'w' ? '5' : '4'));
    const origin = ep[0] + (chess.turn() === 'w' ? '7' : '2');
    if (chess.get(ep) || chess.get(origin) || advanced?.type !== 'p' || advanced.color === chess.turn() || +fields[4] !== 0) {
      throw Error('Invalid position: inconsistent en-passant state');
    }
  }
  // chess.js validates FEN syntax, but not that the side which just moved is safe.
  if (chess.isAttacked(king(chess, other(chess.turn())), chess.turn())) {
    throw Error('Invalid position: non-moving king is in check');
  }
  return chess;
}
function inputMove(chess, value) {
  if (typeof value !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value)) throw Error('Expected a UCI move');
  const move = chess.moves({verbose: true}).find(m => uci(m) === value);
  if (!move) throw Error('Illegal move: ' + value);
  return move;
}

// A finite AND/OR witness, with no engine evaluation or attack-count shortcut.
// AND: every defender reply. OR: one original target capture by the forker.
// AND: every immediate counterreply preserves positive net nominal material.
function certifyFork(chess, move, targets, beforeBalance, work) {
  if (chess.isGameOver()) return null;
  const defenderReplies = moves(chess, work), witnesses = [];
  let minimumGain = Infinity;
  for (const reply of defenderReplies) {
    const witness = play(chess, reply, work, () => {
      if (chess.isGameOver()) return null;
      const attacker = chess.get(move.to);
      if (!attacker || attacker.color !== move.color || attacker.type !== move.piece) return null;
      const captures = moves(chess, work).filter(m => m.from === move.to && m.captured &&
        targets.some(t => t.type !== 'k' && t.square === m.to && t.type === m.captured));
      let best = null;
      for (const capture of captures) {
        const proof = play(chess, capture, work, () => {
          if (drawn(chess)) return null;
          let worstGain = balance(chess, move.color) - beforeBalance, worstReply = null;
          const responses = moves(chess, work);
          for (const response of responses) {
            const gain = play(chess, response, work, () => {
              if (chess.isCheckmate() || drawn(chess)) return -Infinity;
              return balance(chess, move.color) - beforeBalance;
            });
            if (gain < worstGain) { worstGain = gain; worstReply = uci(response); }
          }
          if (worstGain <= 0) return null;
          return {capture: uci(capture), target: capture.to, worstReply, worstGain, responses: responses.length};
        });
        if (proof && (!best || proof.worstGain > best.worstGain)) best = proof;
      }
      return best;
    });
    if (!witness) return null;
    minimumGain = Math.min(minimumGain, witness.worstGain);
    witnesses.push({reply: uci(reply), ...witness});
  }
  return {horizonPliesAfterFork: 3, materialValues: VALUES, minimumGain, witnesses};
}

function fork(chess, move, before, work) {
  if (!['n', 'p'].includes(move.piece) || move.promotion) return null;
  const targets = pieces(chess).filter(p => p.color !== move.color && p.type !== 'p' &&
    chess.attackers(p.square, move.color).includes(move.to));
  if (targets.length < 2) return null;
  // A moved piece must create a new target pair; old forks are not discoveries.
  const oldTargets = pieces(before).filter(p => p.color !== move.color && p.type !== 'p' &&
    before.attackers(p.square, move.color).includes(move.from)).map(p => p.square);
  if (targets.every(p => oldTargets.includes(p.square))) return null;
  const proof = certifyFork(chess, move, targets, balance(before, move.color), work);
  if (!proof) return null;
  const royal = targets.some(p => p.type === 'k') && targets.some(p => p.type === 'q');
  return event('fork', `Your ${NAMES[move.piece]} on ${move.to} forks ${targets.map(p => `the ${NAMES[p.type]} on ${p.square}`).join(' and ')}. Every legal reply still allows a capture of one of these targets.`,
    {piece: move.piece, attacker: move.to, targets, royal, proof});
}

function pins(chess, color) {
  const result = [], enemyKing = king(chess, other(color));
  const [kx, ky] = [enemyKing.charCodeAt(0) - 97, +enemyKing[1] - 1];
  for (const slider of pieces(chess).filter(p => p.color === color && ['b', 'r', 'q'].includes(p.type))) {
    const dx = kx - (slider.square.charCodeAt(0) - 97), dy = ky - (+slider.square[1] - 1);
    const diagonal = Math.abs(dx) === Math.abs(dy), straight = dx === 0 || dy === 0;
    if (!(slider.type === 'b' ? diagonal : slider.type === 'r' ? straight : diagonal || straight)) continue;
    const sx = Math.sign(dx), sy = Math.sign(dy), line = [];
    let x = slider.square.charCodeAt(0) - 97 + sx, y = +slider.square[1] - 1 + sy;
    while (x !== kx || y !== ky) { line.push(String.fromCharCode(97 + x) + (y + 1)); x += sx; y += sy; }
    const blockers = line.map(square => chess.get(square) && {...chess.get(square), square}).filter(Boolean);
    if (blockers.length === 1 && blockers[0].color !== color) result.push({slider: slider.square,
      blocker: blockers[0].square, piece: blockers[0].type, king: enemyKing, line});
  }
  return result;
}

function facts(chess, before, move) {
  const result = [], enemyKing = king(chess, other(move.color));
  if (chess.isCheckmate()) return [event('checkmate', 'Checkmate. The king is in check and has no legal escape.', {king: enemyKing})];
  if (chess.isStalemate()) return [event('stalemate', 'Stalemate. The opponent has no legal move, and their king is not in check.', {king: enemyKing})];
  if (move.isKingsideCastle() || move.isQueensideCastle()) result.push(event('castling', `You castled ${move.isKingsideCastle() ? 'kingside' : 'queenside'}.`, {wing: move.isKingsideCastle() ? 'kingside' : 'queenside'}));
  if (move.isEnPassant()) result.push(event('en-passant', `Your pawn on ${move.to} captured en passant.`, {from: move.from, to: move.to, capturedSquare: move.to[0] + move.from[1]}));
  if (move.promotion) result.push(event('promotion', `You ${move.promotion === 'q' ? 'promoted' : 'underpromoted'} the pawn on ${move.to} to a ${NAMES[move.promotion]}.`, {piece: move.promotion, underpromotion: move.promotion !== 'q'}));
  if (chess.isCheck()) {
    const attackers = chess.attackers(enemyKing, move.color);
    const rookTo = move.isKingsideCastle() ? `f${move.to[1]}` : move.isQueensideCastle() ? `d${move.to[1]}` : null;
    // A castling rook is also moved; it cannot be a discovered checker.
    const discovered = attackers.filter(sq => sq !== move.to && sq !== rookTo &&
      !before.attackers(enemyKing, move.color).includes(sq));
    if (attackers.length === 2) result.push(event('double-check', `Double check: both pieces on ${attackers.join(' and ')} attack the king on ${enemyKing}. Only a king move can answer it.`, {king: enemyKing, attackers}));
    if (discovered.length) result.push(event('discovered-check', `Moving from ${move.from} opens a check from ${discovered.join(' and ')} against the king on ${enemyKing}.`, {king: enemyKing, revealed: discovered, vacated: move.from}));
    if (!result.some(e => ['double-check', 'discovered-check'].includes(e.id))) result.push(event('check', `You give check to the king on ${enemyKing}.`, {king: enemyKing, attackers}));
  }
  const oldPins = pins(before, move.color);
  for (const pin of pins(chess, move.color)) {
    if (oldPins.some(p => (p.slider === pin.slider || (p.slider === move.from && pin.slider === move.to)) && p.blocker === pin.blocker && p.king === pin.king)) continue;
    result.push(event('absolute-pin', `Your piece on ${pin.slider} pins the ${NAMES[pin.piece]} on ${pin.blocker} to the king on ${pin.king}. It cannot move off that line without exposing its king.`, pin));
  }
  return result;
}

function scan(chess, work) {
  const threats = [];
  if (chess.isGameOver()) return threats;
  const before = new Chess(chess.fen());
  for (const move of moves(chess, work)) {
    const found = play(chess, move, work, () => fork(chess, move, before, work));
    if (found) threats.push({move: uci(move), san: move.san, ...found.evidence});
  }
  return threats;
}

/** Pure research API. Callers loading real data must use the shared policy gate. */
export function explainMove({fen, move: value, alternative = null, scanReplies = true, maxNodes = 50000}) {
  const before = legalPosition(fen), move = inputMove(before, value);
  if (before.isGameOver()) throw Error('Cannot explain a move from a terminal position');
  if (alternative !== null) inputMove(before, alternative);
  const work = budget(maxNodes), chess = new Chess(fen);
  chess.move(move);
  const events = facts(chess, before, move), diagnostics = {tactics: 'complete', replyScan: scanReplies ? 'complete' : 'disabled'};
  let tactics = [];
  if (!chess.isGameOver()) {
    try {
      const created = fork(chess, move, before, work);
      if (created) tactics.push(created);
      const threats = scanReplies ? scan(chess, work) : [];
      if (threats.length) {
        const threat = threats[0];
        tactics.unshift(event('allows-fork', `Watch out: ${threat.san} lets the opponent fork ${threat.targets.map(t => `your ${NAMES[t.type]} on ${t.square}`).join(' and ')}.`, {threat, supportedReplies: threats.map(t => t.move)}));
      }
      if (alternative !== null && alternative !== value && scanReplies && !threats.length) {
        const counterfactual = new Chess(fen);
        counterfactual.move(alternative);
        const alternatives = scan(counterfactual, work);
        if (alternatives.length) {
          const threat = alternatives[0], immediate = chess.moves({verbose: true}).find(m => uci(m) === threat.move);
          // Prove prevention of this specific fork, not just loss of its gain gate.
          const absent = !immediate || play(chess, immediate, work, () => {
            const p = chess.get(threat.attacker);
            return !p || threat.targets.some(t => {
              const target = chess.get(t.square);
              return !target || target.color === p.color || target.type !== t.type ||
                !chess.attackers(t.square, p.color).includes(threat.attacker);
            });
          });
          if (absent) tactics.push(event('avoids-fork', `Your move prevents the fork with ${threat.san} that ${inputMove(before, alternative).san} would allow.`,
            {alternative, threat, scope: 'this specific fork; bounded knight/pawn scan'}));
        }
      }
    } catch (error) {
      if (!(error instanceof Exhausted)) throw error;
      tactics = []; diagnostics.tactics = 'budget-exhausted';
      if (scanReplies) diagnostics.replyScan = 'budget-exhausted';
    }
  }
  const all = [...tactics, ...events];
  return {schema: 'coach-concepts-v1', before: fen, after: chess.fen(), move: value, san: move.san,
    events: all, comment: all[0]?.text ?? null, diagnostics: {...diagnostics, nodes: Math.min(work.used, work.limit), maxNodes}};
}

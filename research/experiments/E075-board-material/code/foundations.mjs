import {Chess} from '../../../../lib/chess.js';
import {legalPosition, VALUES, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {explainMove as parent, priority as previousPriority} from '../../E074-french-scheveningen/code/centers.mjs';

const names = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const coordinate = square => ({square, file: square[0], rank: Number(square[1])});
function inventory(chess, actor) {
  const pieces = chess.board().flat().filter(Boolean).map(({square, type, color}) => ({square, type, color}))
    .sort((a, b) => a.square.localeCompare(b.square));
  const counts = {own: {p: 0, n: 0, b: 0, r: 0, q: 0, k: 0}, enemy: {p: 0, n: 0, b: 0, r: 0, q: 0, k: 0}};
  for (const piece of pieces) counts[piece.color === actor ? 'own' : 'enemy'][piece.type]++;
  const total = side => Object.entries(counts[side]).reduce((sum, [type, count]) => sum + count * VALUES[type], 0);
  const own = total('own'), enemy = total('enemy');
  return {pieces, counts, own, enemy, balance: own - enemy,
    unequalArmies: Object.keys(VALUES).some(type => counts.own[type] !== counts.enemy[type])};
}
function moveRecord(chess, value) {
  const before = chess.fen(), move = chess.move(value);
  return {uci: uci(move), from: move.from, to: move.to, piece: move.piece, color: move.color,
    captured: move.captured || null, promotion: move.promotion || null, flags: move.flags,
    san: move.san, before, after: chess.fen()};
}
export const priority = event => ({'nominal-balance': 4.8, 'material-imbalance': 4.7,
  'piece-movement': 4.6, 'material-inventory': 4.5, 'legal-input': 4.4,
  'board-coordinates': 4.3, 'illegal-input': 1000}[event.id] ?? previousPriority(event));

export function explainMove(input) {
  const enabled = input.foundationTags ?? false;
  if (typeof enabled !== 'boolean') throw Error('foundationTags must be boolean');
  if (!enabled) return parent(input);
  return explainAttempt(input);
}

export function explainAttempt(input) {
  if (input.foundationTags !== true) return explainMove(input);
  const limit = input.maxFoundationNodes ?? 50000;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxFoundationNodes must be integer 0..50000');
  if (typeof input.move !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.move)) throw Error('Expected a UCI move');
  const history = [], root = legalPosition(input.history?.fen || input.fen);
  if (input.history && (!Array.isArray(input.history.moves) || input.history.moves.length > 1000)) throw Error('Invalid history');
  for (const value of input.history?.moves || []) {
    if (root.isGameOver()) throw Error('History continues after game over');
    if (typeof value !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(value) || !root.moves({verbose: true}).some(m => uci(m) === value)) throw Error('Invalid history move');
    history.push(moveRecord(root, value));
  }
  if (root.fen() !== legalPosition(input.fen).fen()) throw Error('History does not match position');
  const actor = root.turn(), schema = 'coach-concepts-v56';
  if (root.isGameOver()) return {schema, events: [], comment: null,
    foundationAnalysis: {status: 'unavailable', limit, nodes: 0, reason: 'terminal-root'}};
  const legalMoves = root.moves({verbose: true}).map(uci).sort();
  const accepted = legalMoves.includes(input.move), base = accepted ? parent(input) : {events: [], comment: null};
  let nodes = 0;
  const tick = () => { if (++nodes > limit) throw Error('foundation-budget'); };
  const extra = [];
  try {
    tick();
    tick(); const before = inventory(root, actor);
    const from = coordinate(input.move.slice(0, 2)), to = coordinate(input.move.slice(2, 4));
    const origin = root.get(from.square);
    const evidence = {actor, fen: root.fen(), input: input.move, history,
      origin: origin ? {type: origin.type, color: origin.color} : null,
      from, to, legalMoves, originMoves: legalMoves.filter(move => move.startsWith(from.square)),
      accepted, before, after: null, played: null, values: {...VALUES}};
    const add = (id, text) => { tick(); extra.push({id, text, qualityClaim: false, evidence}); };
    if (!accepted) {
      const alternatives = evidence.originMoves.slice(0, 3);
      add('illegal-input', alternatives.length ?
        `Illegal move here. ${evidence.originMoves.length > 3 ? 'Examples of legal' : 'Legal'} moves from ${from.square}: ${alternatives.join('/')}.` :
        `Illegal move here: no legal move starts on ${from.square}.`);
    } else {
      evidence.played = moveRecord(root, input.move);
      tick(); evidence.after = inventory(root, actor);
      const move = evidence.played;
      let text = `Your ${names[move.piece]} legally moves from ${move.from} to ${move.to}.`;
      if (move.flags.includes('k') || move.flags.includes('q')) {
        const rank = move.from[1], kingside = move.flags.includes('k');
        text = `${kingside ? 'Kingside' : 'Queenside'} castling moves your king ${move.from} to ${move.to} and rook ${kingside ? 'h' : 'a'}${rank} to ${kingside ? 'f' : 'd'}${rank}.`;
      } else if (move.flags.includes('e')) {
        text = `En passant: your pawn moves ${move.from} to ${move.to} and removes the pawn on ${move.to[0]}${move.from[1]}.`;
      } else if (move.promotion) {
        text = `Your pawn ${move.captured ? 'captures and promotes' : 'promotes'} to a ${names[move.promotion]} on ${move.to}.`;
      } else if (move.captured) text = `Your ${names[move.piece]} legally captures the ${names[move.captured]} from ${move.from} on ${move.to}.`;
      add('piece-movement', text);
      add('board-coordinates', `${to.square} is file ${to.file}, rank ${to.rank}; your move starts on ${from.square}.`);
      add('legal-input', `Legal move: ${input.move} leaves your king out of check.`);
      const nonPawns = side => ['n', 'b', 'r', 'q'].reduce((sum, type) => sum + evidence.after.counts[side][type], 0);
      add('material-inventory', `Material inventory: pawns/nonking pieces are ${evidence.after.counts.own.p}/${nonPawns('own')} for you and ${evidence.after.counts.enemy.p}/${nonPawns('enemy')} for your opponent.`);
      add('nominal-balance', `Nominal material: you have ${evidence.after.own} points versus ${evidence.after.enemy}; the difference is ${evidence.after.balance}.`);
      if (evidence.after.unequalArmies) add('material-imbalance', `Material imbalance: your piece counts differ from your opponent's; nominal totals are ${evidence.after.own} versus ${evidence.after.enemy}.`);
    }
  } catch (error) {
    if (error.message !== 'foundation-budget') throw error;
    return {...base, schema, foundationAnalysis: {status: 'exhausted', limit, nodes, accepted}};
  }
  const events = [...base.events, ...extra];
  const comment = [...events].sort((a, b) => priority(b) - priority(a))[0]?.text || null;
  if (events.some(event => event.text && event.text.split(/\s+/).length > 24)) throw Error('Comment exceeds 24 words');
  return {...base, schema, events, comment,
    foundationAnalysis: {status: accepted ? 'accepted' : 'rejected', limit, nodes, accepted}};
}

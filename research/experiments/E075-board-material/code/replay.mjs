import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';

const labels = {p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king'};
const weights = {p: 1, n: 3, b: 3, r: 5, q: 9, k: 0};
const key = move => move.from + move.to + (move.promotion || '');
function inventory(fen, actor) {
  const pieces = [];
  fen.split(' ')[0].split('/').forEach((row, index) => {
    let file = 0;
    for (const symbol of row) {
      if (/\d/.test(symbol)) file += Number(symbol);
      else {
        pieces.push({square: 'abcdefgh'[file++] + (8 - index), type: symbol.toLowerCase(),
          color: symbol === symbol.toUpperCase() ? 'w' : 'b'});
      }
    }
    assert.equal(file, 8);
  });
  pieces.sort((a, b) => a.square.localeCompare(b.square));
  const counts = Object.fromEntries(['own', 'enemy'].map(side => [side,
    Object.fromEntries(Object.keys(weights).map(type => [type,
      pieces.filter(piece => piece.type === type && (piece.color === actor) === (side === 'own')).length]))]));
  const total = side => counts[side].p + 3 * (counts[side].n + counts[side].b) +
    5 * counts[side].r + 9 * counts[side].q;
  return {pieces, counts, own: total('own'), enemy: total('enemy'),
    balance: total('own') - total('enemy'),
    unequalArmies: ['p', 'n', 'b', 'r', 'q', 'k'].some(type => counts.own[type] !== counts.enemy[type])};
}
function play(chess, value) {
  const before = chess.fen(), move = chess.move(value);
  return {uci: key(move), from: move.from, to: move.to, piece: move.piece, color: move.color,
    captured: move.captured || null, promotion: move.promotion || null, flags: move.flags,
    san: move.san, before, after: chess.fen()};
}
export function replay(input, event) {
  assert.equal(input.foundationTags, true);
  assert.equal(event.qualityClaim, false);
  const chess = new Chess(input.history?.fen || input.fen), history = [];
  for (const value of input.history?.moves || []) {
    assert.ok(!chess.isGameOver());
    assert.ok(chess.moves({verbose: true}).some(move => key(move) === value));
    history.push(play(chess, value));
  }
  assert.equal(chess.fen(), new Chess(input.fen).fen());
  assert.ok(!chess.isGameOver());
  const fen = chess.fen(), actor = chess.turn();
  const legalMoves = chess.moves({verbose: true}).map(key).sort();
  const accepted = legalMoves.includes(input.move);
  const from = {square: input.move.slice(0, 2), file: input.move[0], rank: Number(input.move[1])};
  const to = {square: input.move.slice(2, 4), file: input.move[2], rank: Number(input.move[3])};
  const origin = chess.get(from.square);
  const expected = {actor, fen, input: input.move, history,
    origin: origin ? {type: origin.type, color: origin.color} : null,
    from, to, legalMoves, originMoves: legalMoves.filter(move => move.slice(0, 2) === from.square),
    accepted, before: inventory(fen, actor), after: null, played: null, values: weights};
  const texts = {};
  if (!accepted) {
    const examples = expected.originMoves.slice(0, 3);
    texts['illegal-input'] = examples.length ?
      `Illegal move here. ${expected.originMoves.length > 3 ? 'Examples of legal' : 'Legal'} moves from ${from.square}: ${examples.join('/')}.` :
      `Illegal move here: no legal move starts on ${from.square}.`;
  } else {
    expected.played = play(chess, input.move);
    expected.after = inventory(chess.fen(), actor);
    const ownKing = expected.after.pieces.find(piece => piece.type === 'k' && piece.color === actor);
    assert.ok(!chess.isAttacked(ownKing.square, actor === 'w' ? 'b' : 'w'));
    const m = expected.played;
    let movement = `Your ${labels[m.piece]} legally moves from ${m.from} to ${m.to}.`;
    if (['k', 'q'].some(flag => m.flags.includes(flag))) {
      const kingside = m.to[0] === 'g', rank = actor === 'w' ? 1 : 8;
      movement = `${kingside ? 'Kingside' : 'Queenside'} castling moves your king ${m.from} to ${m.to} and rook ${kingside ? 'h' : 'a'}${rank} to ${kingside ? 'f' : 'd'}${rank}.`;
      assert.equal(chess.get((kingside ? 'f' : 'd') + rank)?.type, 'r');
      assert.equal(chess.get((kingside ? 'h' : 'a') + rank), undefined);
    } else if (m.flags.includes('e')) {
      const victim = m.to[0] + (Number(m.to[1]) + (actor === 'w' ? -1 : 1));
      assert.equal(chess.get(victim), undefined);
      movement = `En passant: your pawn moves ${m.from} to ${m.to} and removes the pawn on ${victim}.`;
    } else if (m.promotion) movement = `Your pawn ${m.captured ? 'captures and promotes' : 'promotes'} to a ${labels[m.promotion]} on ${m.to}.`;
    else if (m.captured) movement = `Your ${labels[m.piece]} legally captures the ${labels[m.captured]} from ${m.from} on ${m.to}.`;
    const counts = expected.after.counts;
    const men = side => counts[side].n + counts[side].b + counts[side].r + counts[side].q;
    Object.assign(texts, {
      'piece-movement': movement,
      'board-coordinates': `${to.square} is file ${to.file}, rank ${to.rank}; your move starts on ${from.square}.`,
      'legal-input': `Legal move: ${input.move} leaves your king out of check.`,
      'material-inventory': `Material inventory: you have ${counts.own.p} pawns and ${men('own')} nonking pieces; your opponent has ${counts.enemy.p} pawns and ${men('enemy')} nonking pieces.`,
      'nominal-balance': `Nominal material: you have ${expected.after.own} points versus ${expected.after.enemy}; the difference is ${expected.after.balance}.`,
    });
    if (expected.after.unequalArmies) texts['material-imbalance'] = `Material imbalance: your piece counts differ from your opponent's; nominal totals are ${expected.after.own} versus ${expected.after.enemy}.`;
  }
  assert.deepEqual(event.evidence, expected);
  assert.ok(Object.hasOwn(texts, event.id));
  assert.equal(event.text, texts[event.id]);
  assert.ok(event.text.split(/\s+/).length <= 24);
  return {kind: event.id, accepted, legalMoves: legalMoves.length, inventoryEntries: expected.before.pieces.length + (expected.after?.pieces.length || 0)};
}

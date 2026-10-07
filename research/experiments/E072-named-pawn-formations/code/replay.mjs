import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';

function record(c, move) {
  const before = c.fen(), m = c.move(move);
  return {move: m.from + m.to + (m.promotion || ''), san: m.san, from: m.from, to: m.to,
    piece: m.piece, color: m.color, captured: m.captured || null, promotion: m.promotion || null, before, after: c.fen()};
}
export function replay(f, event) {
  assert.equal(f.formationTags, true); assert.ok(['stonewall-structure','maroczy-bind'].includes(event.id));
  assert.equal(event.qualityClaim, false);
  const c = legalPosition(f.history?.fen || f.fen), color = legalPosition(f.fen).turn();
  const convert = square => color === 'w' ? square : square[0] + (9 - Number(square[1]));
  const dStart = convert('d2'), cStart = convert('c7'), enemy = color === 'w' ? 'b' : 'w';
  let own = c.get(dStart)?.type === 'p' && c.get(dStart)?.color === color ? dStart : null;
  let opp = c.get(cStart)?.type === 'p' && c.get(cStart)?.color === enemy ? cStart : null;
  let first = null, exchange = null; const history = [];
  if (f.history) {
    assert.ok(Array.isArray(f.history.moves) && f.history.moves.length <= 1000);
    for (const move of f.history.moves) {
      assert.ok(!c.isGameOver()); assert.match(move, /^[a-h][1-8][a-h][1-8][qrbn]?$/);
      const from = move.slice(0,2), to = move.slice(2,4), piece = c.get(from), victim = c.get(to) ? to : piece.type === 'p' && from[0] !== to[0] ? to[0] + from[1] : null;
      const ownMoves = own === from, oppMoves = opp === from, ownLost = own !== null && victim === own, oppLost = opp !== null && victim === opp;
      const row = record(c, move), ply = history.length;
      if (first && row.to === first.capture.to && row.captured && piece.type !== 'p' && piece.color !== first.capture.color && ((first.order === 'own-d-takes-enemy-c' && ownLost) || (first.order === 'enemy-c-takes-own-d' && oppLost)))
        exchange = {firstPly: first.ply, capture: first.capture, recapturePly: ply, recapture: row, order: first.order};
      first = row.piece === 'p' && ((ownMoves && oppLost) || (oppMoves && ownLost)) ? {ply, capture: row, order: ownMoves ? 'own-d-takes-enemy-c' : 'enemy-c-takes-own-d'} : null;
      if (ownLost) own = null; else if (ownMoves) own = to;
      if (oppLost) opp = null; else if (oppMoves) opp = to;
      history.push(row);
    }
  }
  if (own !== null || opp !== null) exchange = null;
  assert.equal(c.fen(), legalPosition(f.fen).fen()); assert.ok(!c.isGameOver());
  const before = legalPosition(c.fen()), played = record(c, f.move), e = event.evidence;
  assert.deepEqual(e.history, history); assert.deepEqual(e.played, played);
  assert.equal(played.piece, 'p'); assert.ok(!c.isGameOver());
  const cells = (event.id === 'stonewall-structure' ? ['c3','d4','e3','f4'] : ['c4','e4']).map(convert);
  const present = (board, s) => board.get(s)?.type === 'p' && board.get(s)?.color === color;
  assert.deepEqual(e.cells, cells); assert.ok(cells.includes(played.to));
  assert.ok(cells.every(s => present(c,s))); assert.ok(!cells.every(s => present(before,s)));
  let specs;
  if (event.id === 'maroczy-bind') {
    assert.ok(f.history && exchange); assert.deepEqual(e.exchange, exchange);
    assert.equal(c.get(convert('d5')), undefined);
    assert.ok(!c.board().flat().some(p => p?.type === 'p' && ((p.color === color && p.square[0] === 'd') || (p.color !== color && p.square[0] === 'c'))));
    specs = [['d5',['c4','e4']]];
  } else { assert.equal(e.exchange, null); specs = [['d4',['c3','e3']],['f4',['e3']]]; }
  const counterframes = []; let captures = 0;
  for (const [square, sources] of specs) {
    const target = convert(square), frame = legalPosition(c.fen()), removed = frame.get(target);
    frame.remove(target); frame.put({type:'n',color:enemy}, target);
    const parts = frame.fen().split(' '); parts[1] = color; parts[3] = '-';
    const test = legalPosition(parts.join(' ')); assert.ok(!test.isGameOver());
    const counterFen = test.fen(), moves = [];
    for (const move of test.moves({verbose:true})) if (move.piece === 'p' && move.to === target && move.captured === 'n') {
      moves.push(record(test, move.from + move.to + (move.promotion || ''))); test.undo(); captures++;
    }
    assert.ok(sources.map(convert).every(s => moves.some(m => m.from === s)));
    counterframes.push({target, sources:sources.map(convert), removed:removed ? {type:removed.type,color:removed.color} : null, counterFen, captures:moves});
  }
  assert.deepEqual(e.counterframes, counterframes);
  const replies = []; let terminals = 0, promotions = 0, losses = 0;
  for (const move of c.moves({verbose:true})) {
    const response = record(c, move.from + move.to + (move.promotion || ''));
    const flags = {present:cells.filter(s => present(c,s)),check:c.isCheck(),checkmate:c.isCheckmate(),stalemate:c.isStalemate(),draw:c.isDraw(),gameOver:c.isGameOver()};
    replies.push({response,...flags}); if (flags.gameOver) terminals++; if (response.promotion) promotions++; if (flags.present.length < cells.length) losses++; c.undo();
  }
  assert.deepEqual(e.replies, replies);
  const text = event.id === 'stonewall-structure'
    ? `Stonewall structure: ${cells.join('/')}; ${cells[0]} and ${cells[2]} support ${cells[1]}, while ${cells[2]} supports ${cells[3]}.`
    : `${color === 'w' ? 'Maroczy bind' : 'Reversed Maroczy bind'}: ${cells[0]} and ${cells[1]} control ${convert('d5')} after the recorded d-pawn/c-pawn exchange.`;
  assert.equal(event.text,text); assert.ok(text.split(/\s+/).length <= 24);
  return {passed:true,replies:replies.length,leaves:captures,countercaptures:captures,historyPlies:history.length,terminals,promotions,namedPawnLosses:losses};
}

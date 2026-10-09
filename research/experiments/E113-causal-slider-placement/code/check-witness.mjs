import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
// Neutral saved-policy replay; candidate and query implementation are not imported.
export function checkWitness(w,result,input) {
  const a = result.sliderPlacementAnalysis,H = a.plies;
  assert.equal(H,input.sliderPlacementPlies ?? 2); assert.equal(a.limit,input.maxSliderPlacementNodes ?? 50000);
  assert.ok(a.nodes >= 1 && a.nodes <= a.limit); assert.equal(w.experiment,'E113');
  assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const code of w.history?.moves || []) c.move(code);
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen());
  assert.ok(!c.isGameOver()); assert.equal(c.fen().split(' ')[2],'-');
  assert.ok(c.board().flat().filter(Boolean).length <= 10);
  const actor = c.turn(),m = c.move(input.move);
  assert.equal(w.actor,actor); assert.ok(!m.captured && !m.promotion);
  assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san});
  assert.equal(w.after,c.fen()); assert.equal(result.after,c.fen());
  const rank = actor === 'w' ? +m.to[1] : 9-+m.to[1],central = ['d4','e4','d5','e5'];
  const rook = m.piece === 'r' && m.from[1] === m.to[1] && m.from[0] !== m.to[0] && [3,4].includes(rank);
  const queen = m.piece === 'q' && !central.includes(m.from) && central.includes(m.to);
  assert.ok(rook || queen); assert.equal(w.rank,rank); assert.equal(w.rook,rook); assert.equal(w.queen,queen);
  assert.deepEqual(w.inventory,c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square)));
  const check = (board,q) => { assert.equal(q.winner,actor); assert.equal(q.plies,H); replayQuery(board,q); return q.tree.win; };
  const actual = check(c,w.actual); let qualifies = false;
  if (!actual) { assert.equal(w.freshActual,null); assert.equal(w.restored,null); }
  else {
    const fresh = check(legalPosition(w.after),w.freshActual);
    if (!fresh) assert.equal(w.restored,null);
    else {
      const changed = legalPosition(w.after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
      const fields = changed.fen().split(' '); fields[3] = '-';
      assert.equal(w.restored.fen,fields.join(' '));
      let restored; try { restored = legalPosition(w.restored.fen); } catch { assert.equal(w.restored.legal,false); assert.equal(w.restored.proof,null); }
      if (restored) { assert.equal(w.restored.legal,true); qualifies = !check(restored,w.restored.proof); }
    }
  }
  const expected = qualifies ? [{id:rook ? 'causal-rook-lift-mate' : 'causal-queen-centralization-mate',
    text:rook ? `Rook lift: ${m.san} transfers your rook across rank ${m.to[1]} and permits this ${H}-ply mate; restoring only its old square stops it.`
      : `Queen centralization: ${m.san} enters ${m.to} and permits this ${H}-ply mate; restoring only your queen to ${m.from} stops that complete policy.`,
    qualityClaim:false,evidence:{experiment:'E113',before:w.before,after:w.after,detail:{source:'sliderPlacementAnalysis.witness'}}}] : [];
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E113'),expected);
  assert.equal(a.status,qualifies ? 'proven' : 'no-new-fact');
  for (const e of expected) assert.ok(e.text.split(/\s+/).length <= 24);
}

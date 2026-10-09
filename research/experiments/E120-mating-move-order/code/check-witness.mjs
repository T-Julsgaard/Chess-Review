import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const quiet = m => m && !m.captured && !m.promotion && m.piece !== 'p';
export function checkWitness(w,result,input) {
  const a = result.moveOrderAnalysis,H = input.orderTailPlies ?? 0;
  assert.equal(a.plies,H); assert.equal(a.limit,input.maxMoveOrderNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E120'); assert.deepEqual(w.history,input.history || null);
  const start = () => { const p = legalPosition(input.history?.fen || input.fen); for (const code of input.history?.moves || []) { assert.ok(!p.isGameOver()); p.move(code); } return p; };
  const c = start(); assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.ok(!c.isGameOver()); assert.ok(units(c).length <= 10);
  const actor = c.turn(),root = ordered(c),b = root.find(m => uci(m) === input.orderFollowup),m = c.move(input.move),after = c.fen();
  assert.equal(w.actor,actor); assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver());
  assert.ok(quiet(m) && quiet(b) && m.from !== b.from);
  const detail = x => ({move:uci(x),from:x.from,to:x.to,piece:x.piece,san:x.san});
  assert.deepEqual(w.played,detail(m)); assert.deepEqual(w.followup,detail(b)); assert.deepEqual(w.inventory,units(c));
  assert.deepEqual(w.rootMoves,root.map(uci)); assert.equal(w.check,c.isCheck());
  const replies = ordered(c); assert.deepEqual(w.replies,replies.map(uci)); assert.ok(w.branches.length > 0 && w.branches.length <= replies.length);
  const audit = (p,proof,n) => { assert.equal(proof.winner,actor); assert.equal(proof.plies,n); return replayQuery(p,proof).win; }; let success = true;
  for (const [i,row] of w.branches.entries()) {
    assert.equal(row.reply,uci(replies[i])); c.move(replies[i]);
    try {
      const terminal = c.isGameOver(),next = terminal ? null : ordered(c).find(x => uci(x) === input.orderFollowup);
      assert.equal(row.fen,c.fen()); assert.equal(row.terminal,terminal);
      assert.deepEqual(row.followup,next ? {move:uci(next),san:next.san,captured:next.captured || null,promotion:next.promotion || null} : null);
      if (quiet(next)) {
        c.move(next); try { assert.equal(row.post,c.fen()); success = audit(c,row.proof,H); } finally { c.undo(); }
      } else { assert.equal(row.post,null); assert.equal(row.proof,null); success = false; }
      if (!success) assert.equal(i,w.branches.length-1);
    } finally { c.undo(); }
  }
  assert.equal(w.success,success); let reverseFails = false;
  if (success) {
    assert.equal(w.branches.length,replies.length); const reversed = start(); reversed.move(b);
    assert.ok(w.reverse); assert.equal(w.reverse.move,uci(b)); assert.equal(w.reverse.fen,reversed.fen()); reverseFails = !audit(reversed,w.reverse.proof,H+2);
  } else assert.equal(w.reverse,null);
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E120',before:w.before,after,detail:{source:'moveOrderAnalysis.witness'}}});
  if (success && reverseFails) {
    add('proved-mating-move-order',`Move order: ${m.san} then ${b.san} permits mate after every defense; playing ${b.san} first cannot force mate within the same ${H+2}-ply continuation.`);
    if (w.check) add('forcing-check-move-order',`Forcing order: ${m.san} checks; every legal evasion allows ${b.san} and mate within ${H} further plies. Reversing the order loses that bound.`);
  }
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E120'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

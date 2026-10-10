import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const points = (c,actor) => units(c).reduce((sum,p) => sum+VALUES[p.type]*(p.color === actor ? 1 : -1),0);
const victim = m => m.isEnPassant() ? m.to[0]+m.from[1] : m.to;
const wing = s => /^[a-c]/.test(s) ? 'queenside' : /^[f-h]/.test(s) ? 'kingside' : null;
function checkPolicy(c,p,actor,baseline) {
  assert.equal(p.fen,c.fen()); const replies = ordered(c); assert.deepEqual(p.moves,replies.map(uci));
  assert.ok(p.branches.length > 0 && p.branches.length <= replies.length); let coverage = true,queen = null,king = null;
  for (const [ri,row] of p.branches.entries()) {
    assert.equal(row.reply,uci(replies[ri])); c.move(replies[ri]);
    try {
      const terminal = c.isGameOver(),offset = points(c,actor)-baseline,captures = terminal ? [] : ordered(c).filter(x => x.captured && wing(victim(x)));
      assert.equal(row.fen,c.fen()); assert.equal(row.terminal,terminal); assert.equal(row.offset,offset); assert.equal(row.captures.length,captures.length);
      for (const [ci,m] of captures.entries()) {
        const t = row.captures[ci],start = points(c,actor); assert.equal(t.move,uci(m)); assert.equal(t.victim,victim(m)); assert.equal(t.wing,wing(victim(m))); c.move(m);
        try {
          assert.equal(t.post,c.fen()); let minimum = points(c,actor)-start,valid = !c.isDraw() && minimum > 0; const witnesses = [];
          for (const reply of c.moves({verbose:true})) {
            c.move(reply); try { const gain = points(c,actor)-start; witnesses.push({reply:uci(reply),gain}); minimum = Math.min(minimum,gain); if (gain <= 0 || c.isCheckmate() || c.isDraw()) valid = false; } finally { c.undo(); }
          }
          if (valid) { assert.deepEqual(t.proof,{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses}); assert.equal(t.net,minimum+offset); }
          else { assert.equal(t.proof,null); assert.equal(t.net,null); }
        } finally { c.undo(); }
      }
      const wings = ['queenside','kingside'].filter(side => row.captures.some(x => x.wing === side && x.proof && x.net > 0)); assert.deepEqual(row.wings,wings);
      if (wings.length === 1) { if (wings[0] === 'queenside' && queen === null) queen = ri; if (wings[0] === 'kingside' && king === null) king = ri; }
      if (!wings.length) { coverage = false; assert.equal(ri,p.branches.length-1); }
    } finally { c.undo(); }
  }
  if (coverage) assert.equal(p.branches.length,replies.length);
  assert.equal(p.coverage,coverage); assert.equal(p.queensideOnly,queen); assert.equal(p.kingsideOnly,king);
  return {coverage,queen,king};
}
export function checkWitness(w,result,input) {
  const a = result.bothWingAnalysis;
  assert.equal(a.limit,input.maxBothWingNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E124'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(input.history?.fen || input.fen); for (const code of input.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.ok(!c.isGameOver()); assert.ok(units(c).length <= 10); assert.equal(c.fen().split(' ')[2],'-');
  const actor = c.turn(),baseline = points(c,actor),m = c.move(input.move),after = c.fen();
  assert.equal(w.actor,actor); assert.equal(w.baseline,baseline); assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver());
  assert.ok(!m.captured && !m.promotion && !['k','p'].includes(m.piece)); assert.deepEqual(w.inventory,units(c)); assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san});
  const actual = checkPolicy(c,w.actual,actor,baseline); let causal = false;
  if (actual.coverage && actual.queen !== null && actual.king !== null) {
    assert.ok(w.restored); const changed = legalPosition(after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
    const fields = changed.fen().split(' '); fields[3] = '-'; assert.equal(w.restored.fen,fields.join(' ')); let p;
    try { p = legalPosition(fields.join(' ')); } catch { /* Independently validate comparison legality. */ }
    assert.equal(w.restored.legal,!!p); assert.equal(w.restored.terminal,p ? p.isGameOver() : null);
    if (p && !p.isGameOver()) causal = !checkPolicy(p,w.restored.policy,actor,baseline).coverage; else assert.equal(w.restored.policy,null);
  } else assert.equal(w.restored,null);
  const expected = [];
  if (causal) expected.push({id:'necessary-both-wing-capture-policy',text:`Both-wing attack: ${m.san} guarantees a certified net material capture after every defense; some require each wing. Restoring only that piece breaks this policy.`,qualityClaim:false,evidence:{experiment:'E124',before:w.before,after,detail:{source:'bothWingAnalysis.witness'}}});
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E124'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

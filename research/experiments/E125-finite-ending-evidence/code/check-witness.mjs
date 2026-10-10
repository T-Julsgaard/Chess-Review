import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkWitness as checkSource} from '../../E124-both-wing-capture-policy/code/check-witness.mjs';
import {checkConversion} from '../../E106-ending-conversion-policies/code/check-policy.mjs';
export function checkWitness(w,r,f) {
  const a = r.endingEvidenceAnalysis; assert.equal(a.limit,f.maxEndingEvidenceNodes ?? 50000); assert.equal(a.plies,f.endingPlies ?? 4); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  const h = validateHistory(f),c = legalPosition(h?.start || f.fen); for (const move of h?.moves || []) c.move(move);
  assert.equal(w.experiment,'E125'); assert.equal(w.before,c.fen()); assert.ok(!c.isGameOver()); assert.equal(w.actor,c.turn()); assert.deepEqual(w.history,h ? {fen:h.start,moves:h.moves} : null);
  const old = c.board().flat().filter(Boolean),pre = legalPosition(c.fen()),m = c.move(f.move);
  assert.equal(w.played,uci(m)); assert.equal(w.after,c.fen()); assert.equal(r.after,c.fen()); assert.ok(!c.isGameOver() && !m.captured && !m.promotion);
  const sparse = !old.some(p => p.type === 'q') && ['w','b'].every(color => old.filter(p => p.color === color && !['k','p'].includes(p.type)).length <= 2 && old.filter(p => p.color === color && p.type === 'p').length <= 2);
  const source = r.bothWingAnalysis.witness; if (source) checkSource(source,r,{...f,bothWingTags:true});
  let fork = null;
  if (m.piece === 'n' && sparse && source) {
    const targets = c.board().flat().filter(p => p && p.color !== w.actor && !['k','p'].includes(p.type) && /^[a-cf-h]/.test(p.square) && c.attackers(p.square,w.actor).includes(m.to) && !pre.attackers(p.square,w.actor).includes(m.from)).map(p => p.square).sort();
    if (targets.length >= 2) { const p = source.actual,selections = p.branches.map(row => row.captures.findIndex(t => t.move.slice(0,2) === m.to && targets.includes(t.victim) && t.proof && t.net > 0)); fork = {targets,selections,success:p.branches.length === p.moves.length && selections.every(i => i >= 0)}; }
  }
  assert.deepEqual(w.fork,fork);
  const pawns = old.filter(p => p.color === w.actor && p.type === 'p'),eligible = ['k','p'].includes(m.piece) && pawns.length === 1 && old.every(p => ['k','p'].includes(p.type)) && old.filter(p => p.color !== w.actor && p.type === 'p').length <= 1;
  if (!eligible) assert.equal(w.conversion,null);
  else {
    const v = w.conversion; assert.ok(v); assert.equal(v.pawn,pawns[0].square); assert.equal(v.tracked,m.from === v.pawn ? m.to : v.pawn);
    const cache = new Map(); let index = 0;
    const query = bound => { if (!cache.has(bound)) { const q = v.queries[index++]; assert.ok(q); assert.equal(q.plies,bound); assert.equal(q.actor,w.actor); assert.equal(q.pawn,v.tracked); assert.equal(q.baselineFen,w.before); checkConversion(q,c); cache.set(bound,q.win); } return cache.get(bound); };
    let minimum = null;
    if (query(a.plies)) { let lo = 0,hi = a.plies; while (lo < hi) { const mid = Math.floor((lo+hi)/2); if (query(mid)) hi = mid; else lo = mid+1; } minimum = lo; assert.equal(query(lo),true); if (lo) assert.equal(query(lo-1),false); }
    assert.equal(v.minimum,minimum); assert.equal(index,v.queries.length);
  }
  const expected = [];
  if (fork?.success) expected.push(['ending-knight-fork',`Ending fork: ${m.san} newly attacks two pieces; every defense permits this knight a certified net gain by capturing an original target.`]);
  if (w.conversion && w.conversion.minimum !== null) expected.push(['bounded-conversion-tempo-count',`Tempo count: after ${m.san}, the smallest successful bound is ${w.conversion.minimum} further plies for mate or a surviving queen against every defense.`]);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E125'),expected.map(([id,text]) => ({id,text,qualityClaim:false,evidence:{experiment:'E125',before:w.before,after:w.after,detail:{source:'endingEvidenceAnalysis.witness'}}})));
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); return true;
}

import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {checkWitness as checkEntry} from '../../E118-causal-attack-entry/code/check-witness.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const near = (a,b) => Math.abs(a.charCodeAt(0)-b.charCodeAt(0)) <= 2 && Math.abs(+a[1]-+b[1]) <= 2;
export function checkWitness(w,result,input) {
  const a = result.pieceStormAnalysis,entry = result.attackEntryAnalysis.witness,H = result.attackEntryAnalysis.plies;
  assert.equal(a.limit,input.maxPieceStormNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E119'); assert.equal(result.attackEntryAnalysis.status,'proven');
  checkEntry(entry,result,{...input,attackEntryTags:true});
  assert.deepEqual(w.history,input.history); assert.ok(w.history.moves.length >= 2);
  const c = legalPosition(w.history.fen),records = [];
  for (const code of w.history.moves) { assert.ok(!c.isGameOver()); const before = c.fen(),m = c.move(code); records.push({before,m,after:c.fen()}); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen());
  const [first,reply] = records.slice(-2),m = first.m,r = reply.m,actor = c.turn();
  assert.equal(w.actor,actor); assert.equal(m.color,actor); assert.notEqual(r.color,actor);
  assert.ok(!m.captured && !m.promotion && !['k','p'].includes(m.piece));
  assert.ok(!r.captured && !r.promotion && r.piece !== 'k');
  assert.deepEqual(w.first,{before:first.before,move:uci(m),after:first.after,from:m.from,to:m.to,piece:m.piece,san:m.san});
  assert.deepEqual(w.reply,{before:reply.before,move:uci(r),after:reply.after});
  assert.notEqual(m.to,entry.played.from); c.move(input.move); assert.equal(c.fen(),w.after); assert.equal(w.after,entry.after);
  const king = units(c).find(p => p.color !== actor && p.type === 'k').square;
  assert.equal(w.king,king); assert.equal(king,entry.king);
  for (const fen of [first.before,first.after,reply.after]) assert.equal(units(legalPosition(fen)).find(p => p.type === 'k' && p.color !== actor).square,king);
  assert.ok(!near(m.from,king) && near(m.to,king)); assert.equal(c.get(m.from),undefined);
  assert.ok(entry.partners.some(p => p.square === m.to && p.type === m.piece)); assert.deepEqual(w.inventory,units(c));
  const local = position => units(position).filter(p => p.type !== 'k' && p.type !== 'p' && near(p.square,king));
  const oldLocal = local(legalPosition(first.before)),newLocal = local(c);
  assert.deepEqual(w.oldLocal,oldLocal); assert.deepEqual(w.newLocal,newLocal);
  const counts = {beforeOwn:oldLocal.filter(p => p.color === actor).length,beforeEnemy:oldLocal.filter(p => p.color !== actor).length,afterOwn:newLocal.filter(p => p.color === actor).length,afterEnemy:newLocal.filter(p => p.color !== actor).length}; assert.deepEqual(w.counts,counts);
  const checkFrame = (x,restore) => {
    const p = legalPosition(w.after); p.remove(m.to); if (restore) p.put({type:m.piece,color:actor},m.from);
    const fields = p.fen().split(' '); fields[3] = '-'; assert.equal(x.fen,fields.join(' '));
    let q; try { q = legalPosition(x.fen); } catch { /* Independent frame legality. */ }
    assert.equal(x.legal,!!q); if (!q) { assert.equal(x.proof,null); return false; }
    assert.equal(x.proof.winner,actor); assert.equal(x.proof.plies,H); return !replayQuery(q,x.proof).win;
  };
  const restored = checkFrame(w.restored,true),removed = checkFrame(w.removed,false),expected = [];
  const add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E119',before:w.before,after:w.after,detail:{source:'pieceStormAnalysis.witness'}}});
  if (restored && removed) {
    add('recorded-joint-piece-storm',`Piece storm: recorded ${m.san} then ${entry.played.san} bring distinct pieces near the king; restoring or removing either arrival stops this ${H}-ply mate.`);
    if (counts.afterOwn-counts.beforeOwn >= 2 && counts.beforeOwn <= counts.beforeEnemy && counts.afterOwn > counts.afterEnemy) add('causal-local-numerical-superiority',`Local superiority: nearby nonpawn attackers increase ${counts.beforeOwn}→${counts.afterOwn}, against ${counts.afterEnemy} defenders; both recorded arrivals are independently necessary for this ${H}-ply mate.`);
  }
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E119'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

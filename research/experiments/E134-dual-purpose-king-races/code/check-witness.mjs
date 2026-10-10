import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code = m => m.from+m.to+(m.promotion || ''),position = fen => fen.split(' ').slice(0,4).join(' ');
const victim = m => !m.captured ? null : m.flags.includes('e') ? m.to[0]+m.from[1] : m.to;
const balance = (c,actor) => c.board().flat().filter(Boolean).reduce((n,p) => n+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color === actor ? 1 : -1),0);
function signature(c) {
  const h = c.history({verbose:true}),last = h.findLastIndex(m => m.piece === 'p' || m.captured),positions = last === -1 ? [h[0]?.before || c.fen(),...h.map(m => m.after)] : h.slice(last).map(m => m.after),counts = new Map();
  for (const fen of positions) { const key = position(fen); counts.set(key,(counts.get(key) || 0)+1); }
  return JSON.stringify([...counts].sort((a,b) => a[0].localeCompare(b[0])));
}
// Independent legal DAG replay; no search, detector, ledger or move-order imports.
export function checkResource(q,c) {
  assert.ok(['combined','capture','queen'].includes(q.mode)); assert.ok(Number.isSafeInteger(q.plies) && q.plies >= 0 && q.plies <= 10); assert.equal(q.rootFen,c.fen());
  const initial = balance(legalPosition(q.baselineFen),q.actor); assert.equal(q.initialBalance,initial); const visited = new Set();
  function replay(id,ours,enemy,left) {
    const n = q.nodes[id]; assert.ok(n); assert.equal(n.fen,c.fen()); assert.equal(n.ours,ours); assert.equal(n.enemy,enemy); assert.equal(n.left,left); assert.equal(n.historySignature,signature(c));
    if (visited.has(id)) return; visited.add(id);
    if (q.mode !== 'queen' && enemy === null && c.board().flat().filter(Boolean).every(p => p.color === q.actor || p.type === 'k')) { assert.equal(n.kind,'stopped'); assert.equal(n.win,true); return; }
    if (c.isGameOver()) { assert.equal(n.kind,'terminal'); assert.equal(n.win,false); assert.equal(n.mate,c.isCheckmate()); assert.equal(n.draw,c.isDraw()); return; }
    const p = ours && c.get(ours); let goal = false;
    if (q.mode !== 'capture' && p?.type === 'q' && p.color === q.actor && c.turn() !== q.actor) {
      assert.ok(n.probe); assert.equal(n.probe.gain,balance(c,q.actor)-initial); const moves = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b)));
      assert.deepEqual(n.probe.replies.map(r => r.move),moves.map(code)); const goods = [];
      for (const [i,m] of moves.entries()) {
        c.move(code(m)); const piece = c.get(ours),good = piece?.type === 'q' && piece.color === q.actor && !c.isGameOver();
        assert.deepEqual(n.probe.replies[i],{move:code(m),after:c.fen(),gain:balance(c,q.actor)-initial,good:!!good}); goods.push(!!good); c.undo();
      }
      goal = goods.every(Boolean); assert.equal(n.probe.win,goal);
    } else assert.equal(n.probe ?? null,null);
    if (goal) { assert.equal(n.kind,'queen'); assert.equal(n.win,true); return; }
    if (!left) { assert.equal(n.kind,'limit'); assert.equal(n.win,false); return; }
    const own = c.turn() === q.actor,moves = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b))); assert.deepEqual(n.moves,moves.map(code));
    const follow = (move,child) => {
      const m = moves.find(m => code(m) === move); assert.ok(m); const captured = victim(m); let a = ours,b = enemy;
      if (m.color === q.actor && m.from === ours) a = m.to; else if (m.color !== q.actor && captured === ours) a = null;
      if (m.color !== q.actor && m.from === enemy) b = m.to; else if (m.color === q.actor && captured === enemy) b = null;
      c.move(move); try { replay(child,a,b,left-1); } finally { c.undo(); }
    };
    if (['choice','counterchoice'].includes(n.kind)) { assert.equal(n.kind,own ? 'choice' : 'counterchoice'); assert.equal(n.win,own); assert.equal(q.nodes[n.child]?.win,own); follow(n.move,n.child); }
    else { assert.equal(n.kind,own ? 'all-fail' : 'all'); assert.equal(n.win,!own); assert.deepEqual(n.branches.map(b => b.move),moves.map(code)); for (const b of n.branches) { assert.equal(q.nodes[b.child]?.win,!own); follow(b.move,b.child); } }
  }
  replay(q.root,q.ownPawn,q.enemyPawn,q.plies); assert.equal(q.win,q.nodes[q.root].win); assert.equal(visited.size,Object.keys(q.nodes).length); assert.equal(c.fen(),q.rootFen); return visited.size;
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E134'); assert.deepEqual(w.history,input.history ?? null);
  const c = legalPosition(w.history?.fen || input.fen); for (const move of w.history?.moves || []) { assert.equal(c.isGameOver(),false); c.move(move); }
  assert.equal(c.fen(),legalPosition(input.fen).fen()); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.equal(c.isGameOver(),false);
  const army = c.board().flat().filter(Boolean); assert.equal(army.length,4); assert.equal(army.filter(p => p.type === 'k').length,2); assert.equal(c.get(w.ownPawn)?.type,'p'); assert.equal(c.get(w.ownPawn)?.color,w.actor); assert.equal(c.get(w.enemyPawn)?.type,'p'); assert.notEqual(c.get(w.enemyPawn)?.color,w.actor);
  const m = c.move(input.move); assert.equal(w.played,code(m)); assert.equal(w.san,m.san); assert.equal(w.after,c.fen()); assert.equal(result.after,w.after); assert.equal(c.isGameOver(),false); assert.equal(m.piece,'k'); assert.equal(m.captured,undefined);
  assert.equal(Math.abs(m.from.charCodeAt(0)-m.to.charCodeAt(0)),1); assert.equal(Math.abs(+m.from[1]-+m.to[1]),1); for (const f of [w.before,w.after]) assert.deepEqual(f.split(' ').slice(2,4),['-','-']);
  const d = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1])); const distances = {own:{before:d(m.from,w.ownPawn),after:d(m.to,w.ownPawn)},enemy:{before:d(m.from,w.enemyPawn),after:d(m.to,w.enemyPawn)}};
  assert.deepEqual(w.distances,distances); assert.ok(distances.own.after < distances.own.before && distances.enemy.after < distances.enemy.before);
  for (const mode of ['combined','capture','queen']) if (w[mode]) { const q = w[mode]; assert.equal(q.mode,mode); assert.equal(q.actor,w.actor); assert.equal(q.ownPawn,w.ownPawn); assert.equal(q.enemyPawn,w.enemyPawn); assert.equal(q.baselineFen,w.before); assert.equal(q.plies,input.kingRacePlies ?? 10); checkResource(q,c); }
  const events = result.events.filter(e => e.evidence?.experiment === 'E134'); assert.ok(w.combined);
  if (!w.combined.win) { assert.equal(result.kingRaceAnalysis.status,'no-combined-policy'); assert.equal(w.capture,null); assert.equal(w.queen,null); assert.deepEqual(events,[]); return; }
  assert.ok(w.capture);
  if (w.capture.win || w.queen?.win) { assert.equal(result.kingRaceAnalysis.status,'single-resource-suffices'); if (w.capture.win) assert.equal(w.queen,null); assert.deepEqual(events,[]); return; }
  assert.ok(w.queen); assert.equal(result.kingRaceAnalysis.status,'proven'); assert.equal(events.length,1); const e = events[0]; assert.equal(e.id,'adaptive-dual-purpose-king-race'); assert.equal(e.qualityClaim,false);
  assert.equal(e.text,`Dual-purpose king race: ${m.san} guarantees stopping the enemy pawn or a surviving promoted queen within ${input.kingRacePlies ?? 10} plies; neither resource alone is guaranteed.`);
  assert.equal(e.evidence.before,w.before); assert.equal(e.evidence.after,w.after); assert.deepEqual(e.evidence.detail,{source:'kingRaceAnalysis.witness'});
}

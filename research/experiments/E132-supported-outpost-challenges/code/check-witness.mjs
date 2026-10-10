import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code = m => m.from+m.to+(m.promotion || '');
const rec = m => ({move:code(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const victim = m => !m.captured ? null : m.flags.includes('e') ? m.to[0]+m.from[1] : m.to;
const ordered = c => c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b)));
const quietKnight = m => m.piece === 'n' && !m.captured && !m.promotion;
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color === color ? 1 : -1),0);
// Separate geometric pawn arithmetic rather than the detector's attacker helper.
function profile(c,target,enemy) {
  const relative = enemy === 'w' ? +target[1] : 9-+target[1],pawns = c.board().flat().filter(p => p?.type === 'p').map(({square,color}) => ({square,color})).sort((a,b) => a.square.localeCompare(b.square));
  const supporters = pawns.filter(p => p.color === enemy && Math.abs(p.square.charCodeAt(0)-target.charCodeAt(0)) === 1 && +target[1]-+p.square[1] === (enemy === 'w' ? 1 : -1)).map(p => p.square);
  const challengers = pawns.filter(p => p.color !== enemy && Math.abs(p.square.charCodeAt(0)-target.charCodeAt(0)) === 1 && (enemy === 'w' ? +p.square[1] > +target[1] : +p.square[1] < +target[1])).map(p => p.square);
  return {target,relative,pawns,supporters,challengers,eligible:'cdef'.includes(target[0]) && relative >= 4 && relative <= 6 && supporters.length > 0 && !challengers.length};
}
function verifyEntry(r,c,m,actor) {
  assert.deepEqual(r.entry,rec(m)); c.move(code(m)); assert.equal(r.after,c.fen()); assert.equal(r.terminal,c.isGameOver());
  const baseline = balance(c,actor),moves = ordered(c); assert.equal(r.baseline,baseline); assert.deepEqual(r.moves,moves.map(rec));
  const captures = r.terminal ? [] : moves.filter(m => m.captured === 'n' && victim(m) === r.entry.to); assert.deepEqual(r.captures.map(x => x.capture),captures.map(rec));
  for (const [i,cap] of captures.entries()) {
    const x = r.captures[i]; c.move(code(cap)); assert.equal(x.after,c.fen()); assert.equal(x.terminal,c.isGameOver()); assert.equal(x.gain,balance(c,actor)-baseline);
    const replies = x.terminal ? [] : ordered(c); assert.deepEqual(x.replies.map(z => z.reply),replies.map(rec));
    for (const [j,reply] of replies.entries()) {
      const capturedSquare = victim(reply); c.move(code(reply));
      assert.deepEqual(x.replies[j],{reply:rec(reply),victim:capturedSquare,after:c.fen(),gain:balance(c,actor)-baseline,terminal:c.isGameOver(),mate:c.isCheckmate(),draw:c.isDraw()}); c.undo();
    }
    assert.equal(x.eligible,!x.terminal && x.replies.every(z => !z.terminal && z.gain >= 0)); c.undo();
  }
  assert.equal(r.selected,r.captures.findIndex(x => x.eligible)); assert.equal(r.success,!r.terminal && r.selected !== -1); c.undo();
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E132'); assert.deepEqual(w.history,input.history ?? null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const move of w.history?.moves || []) { assert.equal(c.isGameOver(),false); c.move(move); }
  assert.equal(c.fen(),legalPosition(input.fen).fen()); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.equal(c.isGameOver(),false);
  const m = c.move(input.move); assert.deepEqual(w.played,rec(m)); assert.ok(!['p','k'].includes(m.piece) && !m.promotion); assert.equal(w.after,c.fen()); assert.equal(result.after,w.after); assert.equal(c.isGameOver(),false);
  const fields = w.before.split(' '); fields[1] = c.turn(); fields[3] = '-'; const prior = legalPosition(fields.join(' ')); assert.equal(prior.isGameOver(),false);
  assert.equal(w.prior.fen,prior.fen()); const oldMoves = ordered(prior); assert.deepEqual(w.prior.moves,oldMoves.map(rec));
  const oldEntries = oldMoves.filter(quietKnight); assert.deepEqual(w.prior.entries.map(r => r.entry),oldEntries.map(rec));
  for (const [i,entry] of oldEntries.entries()) {
    const r = w.prior.entries[i],enemy = prior.turn(); prior.move(code(entry)); const p = profile(prior,entry.to,enemy);
    assert.equal(r.after,prior.fen()); assert.equal(r.terminal,prior.isGameOver()); assert.deepEqual(r.profile,p);
    assert.deepEqual(r.replies,ordered(prior).map(reply => ({move:rec(reply),victim:victim(reply)})));
    assert.equal(r.secure,!r.terminal && p.eligible && r.replies.every(z => z.victim !== entry.to)); prior.undo();
  }
  const targets = [...new Set(w.prior.entries.filter(r => r.secure).map(r => r.entry.to))].sort(); assert.deepEqual(w.targets,targets);
  const actualMoves = ordered(c); assert.deepEqual(w.actualMoves,actualMoves.map(rec)); assert.ok(w.selected >= 0 && w.selected < targets.length); assert.equal(w.trials.length,w.selected+1);
  for (const [i,t] of w.trials.entries()) {
    assert.equal(t.target,targets[i]); const entries = actualMoves.filter(m => quietKnight(m) && m.to === t.target); assert.deepEqual(t.entries.map(r => r.entry),entries.map(rec));
    for (const [j,entry] of entries.entries()) verifyEntry(t.entries[j],c,entry,w.actor);
    assert.equal(t.success,t.entries.length > 0 && t.entries.every(r => r.success)); assert.equal(t.success,i === w.selected);
  }
  const events = result.events.filter(e => e.evidence?.experiment === 'E132'); assert.equal(events.length,1); const e = events[0];
  assert.equal(e.id,'stops-secure-supported-knight-outpost'); assert.equal(e.qualityClaim,false);
  assert.equal(e.text,`Outpost challenged: after ${m.san}, every immediate knight entry on ${targets[w.selected]} permits capture without nominal material loss through the next enemy reply.`);
  assert.equal(e.evidence.before,w.before); assert.equal(e.evidence.after,w.after); assert.deepEqual(e.evidence.detail,{source:'outpostChallengeAnalysis.witness'}); assert.equal(result.outpostChallengeAnalysis.status,'proven');
}

import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
export function checkWitness(w,result,input) {
  const a = result.forcedPawnAnalysis;
  assert.equal(a.limit,input.maxForcedPawnNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E122'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(input.history?.fen || input.fen); for (const code of input.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.ok(!c.isGameOver());
  const actor = c.turn(),m = c.move(input.move),after = c.fen(),army = units(c),replies = ordered(c);
  assert.equal(w.actor,actor); assert.equal(w.after,after); assert.equal(result.after,after); assert.ok(!c.isGameOver());
  assert.ok(!m.captured && !m.promotion && !['k','p'].includes(m.piece)); assert.equal(w.before.split(' ')[2],'-'); assert.equal(after.split(' ')[2],'-');
  assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san}); assert.deepEqual(w.inventory,army);
  assert.deepEqual(w.replies,replies.map(x => ({move:uci(x),piece:x.piece})));
  const changed = legalPosition(after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
  const fields = changed.fen().split(' '); fields[3] = '-'; assert.equal(w.restored.fen,fields.join(' ')); let p;
  try { p = legalPosition(w.restored.fen); } catch { /* Independently reconstruct illegal frame. */ }
  assert.equal(w.restored.legal,!!p); const restoredMoves = p ? ordered(p).map(x => ({move:uci(x),piece:x.piece})) : [];
  assert.deepEqual(w.restored.moves,restoredMoves);
  const forced = replies.length > 0 && replies.every(x => x.piece === 'p') && !!p && restoredMoves.some(x => x.piece !== 'p'); assert.equal(w.forced,forced);
  const targets = []; if (forced) for (const file of 'cdefgh') for (let rank = 3; rank <= 6; rank++) if (!c.get(file+rank)) targets.push(file+rank);
  const knights = forced ? army.filter(x => x.color === actor && x.type === 'n') : [];
  assert.deepEqual(w.targets,targets); assert.deepEqual(w.knights,knights);
  const candidates = targets.flatMap(target => knights.map(knight => ({target,knight:knight.square})));
  assert.ok(w.trials.length <= candidates.length); let selected = null;
  for (const [ti,trial] of w.trials.entries()) {
    assert.equal(trial.target,candidates[ti].target); assert.equal(trial.knight,candidates[ti].knight);
    assert.ok(trial.branches.length > 0 && trial.branches.length <= replies.length); let success = true;
    for (const [ri,row] of trial.branches.entries()) {
      const reply = replies[ri],target = trial.target,abandoned = c.attackers(target,c.turn()).includes(reply.from);
      assert.equal(row.reply,uci(reply)); c.move(reply);
      try {
        const pawns = units(c).filter(x => x.type === 'p' && x.color !== actor),permanent = pawns.every(x => x.color === 'b' ? +x.square[1] <= +target[1] : +x.square[1] >= +target[1]);
        const terminal = c.isGameOver(),empty = !c.get(target),entry = !terminal && empty && abandoned && permanent ? ordered(c).find(x => x.from === trial.knight && x.to === target && !x.captured) : null;
        assert.equal(row.fen,c.fen()); assert.equal(row.abandoned,abandoned); assert.deepEqual(row.pawns,pawns); assert.equal(row.permanent,permanent); assert.equal(row.terminal,terminal); assert.equal(row.empty,empty); assert.equal(row.entry,entry ? uci(entry) : null);
        let safe = false;
        if (entry) {
          c.move(entry); try { assert.equal(row.post,c.fen()); const responses = ordered(c).map(x => ({move:uci(x),victim:victim(x)})); assert.deepEqual(row.responses,responses); safe = !c.isGameOver() && responses.every(x => x.victim !== target); } finally { c.undo(); }
        } else { assert.equal(row.post,null); assert.deepEqual(row.responses,[]); }
        assert.equal(row.safe,safe); if (!safe) { success = false; assert.equal(ri,trial.branches.length-1); }
      } finally { c.undo(); }
    }
    assert.equal(trial.success,success); if (success) { assert.equal(trial.branches.length,replies.length); selected = ti; assert.equal(ti,w.trials.length-1); break; }
  }
  if (selected === null) assert.equal(w.trials.length,candidates.length); assert.equal(w.selected,selected);
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E122',before:w.before,after,detail:{source:'forcedPawnAnalysis.witness'}}});
  if (forced) add('causal-forced-pawn-response',`Induced pawn move: after ${m.san}, every legal reply moves a pawn; restoring only your moved piece permits a nonpawn reply.`);
  if (selected !== null) add('forced-irreversible-pawn-hole',`Permanent pawn hole: every reply abandons ${w.trials[selected].target}, beyond all remaining enemy pawns' future attacks; your knight can enter without immediate capture.`);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E122'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

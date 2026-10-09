import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
function material(c,code,certificate) {
  const actor = c.turn(),points = () => units(c).reduce((sum,p) => sum+VALUES[p.type]*(p.color === actor ? 1 : -1),0),start = points();
  c.move(code);
  try {
    let minimum = points()-start,valid = !c.isDraw() && minimum > 0; const witnesses = [];
    for (const reply of c.moves({verbose:true})) {
      c.move(reply);
      try { const gain = points()-start; witnesses.push({reply:uci(reply),gain}); minimum = Math.min(minimum,gain); if (gain <= 0 || c.isCheckmate() || c.isDraw()) valid = false; }
      finally { c.undo(); }
    }
    if (valid) assert.deepEqual(certificate,{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses});
    else assert.equal(certificate,null);
    return {post:c.fen(),valid};
  } finally { c.undo(); }
}
export function checkWitness(w,result,input) {
  const a = result.pawnDefenseAnalysis,H = input.pawnCoverPlies ?? 1;
  assert.equal(a.plies,H); assert.equal(a.limit,input.maxPawnDefenseNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  assert.equal(w.experiment,'E117'); assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(input.history?.fen || input.fen);
  for (const code of input.history?.moves || []) { assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver()); assert.ok(units(c).length <= 10);
  const actor = c.turn(),kingBefore = units(c).find(p => p.color === actor && p.type === 'k').square,m = c.move(input.move),after = c.fen(),army = units(c),replies = ordered(c);
  assert.ok(!c.isGameOver()); assert.equal(w.after,after); assert.equal(result.after,after);
  assert.deepEqual(w.played,{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san,captured:m.captured || null,promotion:m.promotion || null});
  assert.deepEqual(w.inventory,army); assert.deepEqual(w.rootMoves,replies.map(uci));
  const pawns = army.filter(p => p.color !== actor && p.type === 'p'); let selected = null;
  assert.ok(w.pawns.length <= pawns.length);
  for (const [pi,trial] of w.pawns.entries()) {
    assert.equal(trial.square,pawns[pi].square); assert.ok(trial.branches.length > 0 && trial.branches.length <= replies.length); let success = true;
    for (const [ri,row] of trial.branches.entries()) {
      assert.equal(row.reply,uci(replies[ri])); c.move(replies[ri]);
      try {
        const terminal = c.isGameOver(),retained = c.get(trial.square)?.type === 'p' && c.get(trial.square)?.color !== actor;
        const captures = terminal || !retained ? [] : ordered(c).filter(x => x.to === trial.square && x.captured === 'p' && !x.isEnPassant());
        assert.equal(row.fen,c.fen()); assert.equal(row.terminal,terminal); assert.equal(row.retained,retained); assert.deepEqual(row.captures,captures.map(uci));
        assert.ok(row.trials.length <= captures.length); let chosen = null;
        for (const [ci,t] of row.trials.entries()) {
          assert.equal(t.move,uci(captures[ci])); const checked = material(c,t.move,t.proof); assert.equal(t.post,checked.post);
          if (checked.valid) { chosen = ci; assert.equal(ci,row.trials.length-1); break; }
        }
        if (chosen === null) { assert.equal(row.trials.length,captures.length); success = false; assert.equal(ri,trial.branches.length-1); }
        assert.equal(row.selected,chosen);
      } finally { c.undo(); }
    }
    assert.equal(trial.success,success);
    if (success) { assert.equal(trial.branches.length,replies.length); selected = pi; assert.equal(pi,w.pawns.length-1); break; }
  }
  if (selected === null) assert.equal(w.pawns.length,pawns.length); assert.equal(w.selectedPawn,selected);
  const king = army.find(p => p.color === actor && p.type === 'k').square,dir = actor === 'w' ? 1 : -1;
  const members = army.filter(p => p.color === actor && p.type === 'p' && Math.abs(p.square.charCodeAt(0)-king.charCodeAt(0)) <= 1 && [1,2].includes((+p.square[1]-+king[1])*dir)).map(p => p.square);
  const eligible = m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0] && king === kingBefore && +king[1] === (actor === 'w' ? 1 : 8) && 'ceg'.includes(king[0]) && w.before.split(' ')[2] === '-' && after.split(' ')[2] === '-' && !c.isCheck() && members.includes(m.to);
  const audit = (position,p) => { assert.equal(p.winner,c.turn()); assert.equal(p.plies,H); return replayQuery(position,p).win; }; let coverWin = false;
  if (eligible) {
    const x = w.cover; assert.ok(x); assert.equal(x.king,king); assert.deepEqual(x.members,members);
    if (audit(c,x.actual)) { assert.equal(x.fresh,null); assert.equal(x.removed,null); }
    else {
      assert.ok(x.fresh);
      if (audit(legalPosition(after),x.fresh)) assert.equal(x.removed,null);
      else {
        const changed = legalPosition(after); for (const square of members) changed.remove(square);
        const fields = changed.fen().split(' '); fields[3] = '-'; const xframe = x.removed; assert.ok(xframe); assert.equal(xframe.fen,fields.join(' '));
        let p; try { p = legalPosition(xframe.fen); } catch { /* Legal-frame refusal is independently reconstructed. */ }
        assert.equal(xframe.legal,!!p); if (p) coverWin = audit(p,xframe.proof); else assert.equal(xframe.proof,null);
      }
    }
  } else assert.equal(w.cover,null);
  const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E117',before:w.before,after,detail:{source:'pawnDefenseAnalysis.witness'}}});
  if (selected !== null) add('all-defense-profitable-pawn-capture',`Pawn weakness: after every legal defense, the pawn on ${pawns[selected].square} remains capturable with positive net material through every immediate reply.`);
  if (coverWin) add('causal-bounded-pawn-cover',`Pawn cover: ${members.join('/')} prevents this ${H}-ply enemy mate; removing only those cover pawns permits it. Broader king safety remains unassessed.`);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E117'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); return true;
}

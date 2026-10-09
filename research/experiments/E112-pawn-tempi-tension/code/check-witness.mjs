import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {checkConversion} from '../../E106-ending-conversion-policies/code/check-policy.mjs';

// Reconstructs identities, frames, quantifiers and labels; imports no candidate or solver.
export function checkWitness(w,result,input) {
  const a = result.pawnTempoAnalysis, H = a.plies;
  assert.equal(H,input.pawnTempoPlies ?? 4);
  assert.equal(a.limit,input.maxPawnTempoNodes ?? 50000);
  assert.ok(a.nodes <= a.limit && a.nodes >= 1);
  assert.equal(w.experiment,'E112');
  assert.deepEqual(w.history,input.history || null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const move of w.history?.moves || []) c.move(move);
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen());
  assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver() && !c.isCheck());
  const actor = c.turn(), men = c.board().flat().filter(Boolean);
  assert.ok(men.length >= 4 && men.length <= 6 && men.every(p => ['p','k'].includes(p.type)));
  assert.equal(w.before.split(' ')[2],'-');
  const pawns = men.filter(p => p.type === 'p' && p.color === actor).map(p => p.square).sort();
  assert.ok(pawns.length >= 2); assert.deepEqual(w.pawns,pawns);
  const legal = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
  const kings = legal.filter(m => m.piece === 'k'), captures = legal.filter(m => m.piece === 'p' && m.captured === 'p');
  assert.deepEqual(w.rootMoves,legal.map(uci)); assert.deepEqual(w.kingMoves,kings.map(uci)); assert.deepEqual(w.captures,captures.map(uci));
  const played = c.move(input.move);
  assert.deepEqual(w.played,{move:uci(played),piece:played.piece,from:played.from,to:played.to,
    captured:played.captured || null,promotion:played.promotion || null,san:played.san});
  assert.ok(!played.captured && !played.promotion && !c.isGameOver() && !c.isCheck());
  assert.equal(w.after,c.fen()); assert.equal(result.after,c.fen());
  const pairs = captures.filter(m => !m.isEnPassant() && c.get(m.from)?.type === 'p' && c.get(m.from)?.color === actor &&
    c.get(m.to)?.type === 'p' && c.get(m.to)?.color !== actor).map(m => ({from:m.from,to:m.to}));
  assert.deepEqual(w.preservedPairs,pairs);
  const proof = (q,position,pawn,baseline) => {
    assert.equal(q.actor,actor); assert.equal(q.pawn,pawn); assert.equal(q.plies,H);
    assert.equal(q.baselineFen,baseline); checkConversion(q,position);
  };
  const selected = {spare:null,tension:null};
  for (const [index,t] of w.trials.entries()) {
    assert.ok(index < pawns.length); assert.equal(t.pawn,pawns[index]);
    const tracked = t.pawn === played.from ? played.to : t.pawn;
    assert.equal(t.tracked,tracked); proof(t.actual,c,tracked,w.before);
    let spare = false, tension = false;
    const alternative = (row,code) => {
      assert.equal(row.move,code); c.undo(); const m = c.move(code);
      try { proof(row.proof,c,m.from === t.pawn ? m.to : t.pawn,w.before); }
      finally { c.undo(); c.move(input.move); }
    };
    if (t.actual.win && played.piece === 'p' && t.pawn !== played.from && kings.length && selected.spare === null) {
      const fields = w.before.split(' '); fields[1] = actor === 'w' ? 'b' : 'w'; fields[3] = '-';
      const frame = (f,fen,remove,baselineRemove) => {
        assert.ok(f); const position = legalPosition(fen), baseline = legalPosition(w.before);
        for (const s of remove) position.remove(s);
        for (const s of baselineRemove) baseline.remove(s);
        const parts = position.fen().split(' '); parts[3] = '-';
        assert.equal(f.fen,parts.join(' ')); assert.equal(f.baselineFen,baseline.fen());
        let checked; try { checked = legalPosition(f.fen); } catch { assert.equal(f.legal,false); assert.equal(f.proof,null); return false; }
        assert.equal(f.legal,true); proof(f.proof,checked,t.pawn,baseline.fen()); return f.proof.win;
      };
      if (frame(t.pass,fields.join(' '),[],[])) {
        const sp = frame(t.strippedPass,fields.join(' '),[played.from],[played.from]);
        const sa = frame(t.strippedActual,w.after,[played.to],[played.from]);
        if (sp && sa) {
          assert.ok(t.kings.length > 0 && t.kings.length <= kings.length);
          for (const [i,row] of t.kings.entries()) {
            alternative(row,uci(kings[i]));
            if (!row.proof.win) { assert.equal(i,t.kings.length-1); spare = true; }
          }
          if (!spare) assert.equal(t.kings.length,kings.length);
        } else assert.deepEqual(t.kings,[]);
      } else { assert.equal(t.strippedPass,null); assert.equal(t.strippedActual,null); assert.deepEqual(t.kings,[]); }
    } else { assert.equal(t.pass,null); assert.equal(t.strippedPass,null); assert.equal(t.strippedActual,null); assert.deepEqual(t.kings,[]); }
    if (t.actual.win && pairs.length && selected.tension === null) {
      assert.equal(t.exchanges.length,captures.length);
      for (const [i,row] of t.exchanges.entries()) alternative(row,uci(captures[i]));
      tension = t.exchanges.length > 0 && t.exchanges.every(q => !q.proof.win);
    } else assert.deepEqual(t.exchanges,[]);
    assert.equal(t.spare,spare); assert.equal(t.tension,tension);
    if (spare) selected.spare = index;
    if (tension) selected.tension = index;
    if (selected.spare !== null && selected.tension !== null) assert.equal(index,w.trials.length-1);
  }
  if (selected.spare === null || selected.tension === null) assert.equal(w.trials.length,pawns.length);
  assert.deepEqual(w.selected,selected);
  const expected = [], add = (id,text,trial) => expected.push({id,text,qualityClaim:false,
    evidence:{experiment:'E112',before:w.before,after:w.after,detail:{trial}}});
  if (selected.spare !== null) {
    add('conversion-spare-pawn-tempo',`Spare pawn move: ${played.san} preserves this ${H}-ply conversion without needing that pawn; a recorded king alternative fails the same goal.`,selected.spare);
    add('conversion-passing-move',`Passing move: ${played.san} preserves the demonstrated ${H}-ply conversion available with the opponent to move; the moved pawn is dispensable.`,selected.spare);
  }
  if (selected.tension !== null) add('conversion-maintained-pawn-tension',
    `Maintaining tension: ${played.san} retains an available pawn exchange and achieves this ${H}-ply conversion; every available pawn capture fails that same goal.`,selected.tension);
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E112'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  for (const e of expected) assert.ok(e.text.split(/\s+/).length <= 24);
  return {trials:w.trials.length,spare:selected.spare !== null,tension:selected.tension !== null};
}

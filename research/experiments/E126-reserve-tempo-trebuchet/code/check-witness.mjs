import assert from 'node:assert/strict';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
const units = c => c.board().flat().filter(Boolean);
const material = (c,color) => units(c).reduce((n,p) => n+VALUES[p.type]*(p.color === color ? 1 : -1),0);
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const adjacent = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(Number(a[1])-Number(b[1]))) === 1;
function getPair(c) {
  const all = units(c),kings = Object.fromEntries(['w','b'].map(color => [color,all.find(p => p.type === 'k' && p.color === color).square]));
  const pairs = all.filter(p => p.type === 'p' && p.color === 'w').map(p => ({w:p.square,b:p.square[0]+(Number(p.square[1])+1),kings})).filter(pair => c.get(pair.b)?.type === 'p' && c.get(pair.b).color === 'b' && Object.values(kings).every(k => adjacent(k,pair.w) && adjacent(k,pair.b)));
  assert.equal(pairs.length,1); return pairs[0];
}
export function checkLoss(p,c,target,mode) {
  const loser = c.turn(),winner = loser === 'w' ? 'b' : 'w',baseline = material(c,winner),moves = ordered(c),options = moves.filter(m => mode === 'all' || m.piece === 'k');
  assert.equal(p.fen,c.fen()); assert.equal(p.loser,loser); assert.equal(p.winner,winner); assert.equal(p.target,target); assert.equal(p.mode,mode); assert.equal(p.baseline,baseline);
  assert.deepEqual(p.legalMoves,moves.map(uci)); assert.deepEqual(p.options,options.map(uci)); assert.ok(p.rows.length <= options.length);
  let success = !!options.length;
  for (const [i,row] of p.rows.entries()) {
    const m = options[i]; assert.equal(row.move,uci(m)); c.move(m);
    try {
      const terminal = c.isGameOver(),offset = material(c,winner)-baseline,pawn = c.get(target),captures = terminal || pawn?.type !== 'p' || pawn.color !== loser ? [] : ordered(c).filter(x => x.piece === 'k' && x.captured === 'p' && x.to === target);
      assert.equal(row.fen,c.fen()); assert.equal(row.terminal,terminal); assert.equal(row.offset,offset); assert.equal(row.captures.length,captures.length);
      for (const [j,capture] of captures.entries()) {
        const t = row.captures[j],start = material(c,winner); assert.equal(t.move,uci(capture)); c.move(capture);
        try {
          assert.equal(t.post,c.fen()); let minimum = material(c,winner)-start,valid = !c.isDraw() && minimum > 0; const witnesses = [];
          for (const reply of c.moves({verbose:true})) { c.move(reply); try { const gain = material(c,winner)-start; minimum = Math.min(minimum,gain); witnesses.push({reply:uci(reply),gain}); if (gain <= 0 || c.isCheckmate() || c.isDraw()) valid = false; } finally { c.undo(); } }
          if (valid) { assert.deepEqual(t.proof,{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses}); assert.equal(t.net,minimum+offset); }
          else { assert.equal(t.proof,null); assert.equal(t.net,null); }
        } finally { c.undo(); }
      }
      const good = row.captures.some(t => t.proof && t.net > 0); assert.equal(row.success,good);
      if (!good) { success = false; assert.equal(i,p.rows.length-1); }
    } finally { c.undo(); }
  }
  if (success) assert.equal(p.rows.length,options.length); else if (options.length) assert.ok(p.rows.length > 0);
  assert.equal(p.success,success); return success;
}
export function checkWitness(w,r,f) {
  const a = r.reserveTempoAnalysis; assert.equal(a.limit,f.maxReserveTempoNodes ?? 50000); assert.ok(a.nodes >= 1 && a.nodes <= a.limit);
  const h = validateHistory(f),c = legalPosition(h?.start || f.fen); for (const move of h?.moves || []) c.move(move);
  assert.equal(w.experiment,'E126'); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.deepEqual(w.history,h ? {fen:h.start,moves:h.moves} : null); assert.ok(!c.isGameOver());
  const old = units(c); assert.ok(old.length <= 6 && old.every(p => ['k','p'].includes(p.type))); assert.equal(c.fen().split(' ')[2],'-');
  const m = c.move(f.move); assert.equal(w.played,uci(m)); assert.equal(w.after,c.fen()); assert.equal(r.after,c.fen()); assert.ok(!c.isGameOver() && !m.captured && !m.promotion);
  const pair = getPair(c); assert.deepEqual(w.pair,pair); const kind = m.piece === 'k' && old.length === 4 ? 'trebuchet' : m.piece === 'p' && m.from !== pair[w.actor] ? 'reserve' : null;
  assert.ok(kind); assert.equal(w.kind,kind); const actual = checkLoss(w.actual,c,pair[c.turn()],'all'); let success = false;
  if (!actual) { assert.equal(w.opposite,null); assert.equal(w.kingAlternatives,null); }
  else if (kind === 'trebuchet') {
    assert.equal(w.kingAlternatives,null); const other = w.opposite; assert.ok(other); const fields = c.fen().split(' '); fields[1] = w.actor; fields[3] = '-'; assert.equal(other.fen,fields.join(' ')); let frame;
    try { frame = legalPosition(fields.join(' ')); } catch { /* Frame must independently be legal. */ }
    assert.equal(other.legal,!!frame); assert.equal(other.terminal,frame ? frame.isGameOver() : null);
    if (frame && !frame.isGameOver()) success = checkLoss(other.policy,frame,pair[w.actor],'all'); else assert.equal(other.policy,null);
  } else {
    assert.equal(w.opposite,null); c.undo(); assert.deepEqual(getPair(c),pair); success = checkLoss(w.kingAlternatives,c,pair[w.actor],'king'); c.move(f.move);
  }
  const expected = [];
  if (success) { const id = kind === 'trebuchet' ? 'reciprocal-trebuchet-pawn-loss' : 'certified-reserve-pawn-tempo';
    const text = kind === 'trebuchet' ? `Trebuchet pattern: after ${m.san}, every legal move loses the blocked pawn to a certified king capture, for either side to move.` : `Reserve tempo: ${m.san} preserves the king-and-pawn guards; every defense loses its blocked pawn, whereas every prior king alternative loses yours.`;
    assert.ok(text.split(/\s+/).length <= 24); expected.push({id,text,qualityClaim:false,evidence:{experiment:'E126',before:w.before,after:w.after,detail:{source:'reserveTempoAnalysis.witness'}}}); }
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E126'),expected); assert.equal(a.status,success ? 'proven' : 'no-new-fact'); return true;
}

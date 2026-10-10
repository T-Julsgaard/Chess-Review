import assert from 'node:assert/strict';
import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code = m => m.from+m.to+(m.promotion || '');
const desc = m => ({move:code(m),san:m.san,from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,castle:m.flags.includes('k') || m.flags.includes('q')});
// Separate implementation: no detector, panel helper or parent policy import.
function verifyPanel(saved,c) {
  assert.equal(saved.fen,c.fen()); assert.equal(saved.terminal,c.isGameOver());
  const moves = c.moves({verbose:true}).map(code).sort(),rows = [];
  assert.deepEqual(saved.rows.map(r => r.move),moves);
  for (const move of moves) { c.move(move); rows.push({move,after:c.fen(),mate:c.isCheckmate(),draw:c.isDraw()}); c.undo(); }
  assert.deepEqual(saved.rows,rows);
  assert.deepEqual(saved.mates,c.isGameOver() ? [] : rows.filter(r => r.mate).map(r => r.move));
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E130'); assert.equal(w.openingPriorPlyLimit,20);
  assert.deepEqual(w.history,input.history ?? null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const move of w.history?.moves || []) { assert.equal(c.isGameOver(),false); c.move(move); }
  assert.equal(c.fen(),legalPosition(input.fen).fen()); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.equal(c.isGameOver(),false);
  const moves = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b)));
  assert.deepEqual(w.rootMoves,moves.map(desc));
  const played = c.move(input.move); assert.deepEqual(w.played,desc(played)); assert.equal(w.after,c.fen()); assert.equal(result.after,c.fen()); assert.equal(c.isGameOver(),false);
  verifyPanel(w.actual,c); c.undo();
  assert.equal(w.early,!!w.history && w.history.fen === DEFAULT_POSITION && w.history.moves.length <= 20);
  const priorFields = w.before.split(' '); priorFields[1] = w.actor === 'w' ? 'b' : 'w'; priorFields[3] = '-';
  verifyPanel(w.prior,legalPosition(priorFields.join(' '))); assert.equal(w.prior.terminal,false); assert.ok(w.prior.mates.length);
  const relevant = moves.filter(m => desc(m).castle || m.piece === 'p' && !m.captured && !m.promotion);
  assert.deepEqual(w.alternatives.map(r => r.played),relevant.map(desc));
  for (const [i,m] of relevant.entries()) { c.move(code(m)); verifyPanel(w.alternatives[i].panel,c); c.undo(); }
  const safe = [],delays = [];
  w.alternatives.forEach((r,i) => {
    if (r.played.castle && !r.panel.terminal && !r.panel.mates.length) safe.push(i);
    if (!r.played.castle && !r.panel.terminal && r.panel.mates.some(x => w.prior.mates.includes(x))) delays.push(i);
  });
  assert.deepEqual(w.safeCastles,safe); assert.deepEqual(w.pawnDelays,delays);
  const common = w.prior.mates.filter(x => w.actual.mates.includes(x)); assert.deepEqual(w.common,common);
  let ids;
  if (w.played.castle) {
    assert.equal(w.early,true); assert.equal(w.actual.mates.length,0); assert.ok(delays.length); assert.equal(w.restored,null);
    ids = ['early-castle-removes-immediate-mate'];
  } else {
    assert.equal(w.played.piece,'p'); assert.equal(w.played.captured,null); assert.equal(w.played.promotion,null); assert.ok(common.length); assert.ok(safe.length);
    const r = legalPosition(w.after); r.remove(w.played.to); assert.ok(r.put({type:'p',color:w.actor},w.played.from));
    const fields = r.fen().split(' '); fields[3] = '-'; verifyPanel(w.restored,legalPosition(fields.join(' ')));
    assert.equal(w.restored.terminal,false); assert.ok(common.some(x => w.restored.mates.includes(x)));
    ids = [...(w.early ? ['opening-pawn-delay-retains-mate'] : []),'pawn-delay-retains-avoidable-mate'];
  }
  assert.deepEqual(w.ids,ids); const events = result.events.filter(e => e.evidence?.experiment === 'E130'); assert.deepEqual(events.map(e => e.id),ids);
  const castle = safe.length ? w.alternatives[safe[0]].played.san : w.played.san;
  const texts = {
    'early-castle-removes-immediate-mate':`Early castling: ${w.played.san} removes every immediate mate; a legal pawn delay leaves a pre-existing mate available.`,
    'opening-pawn-delay-retains-mate':`Opening pawn delay: ${w.played.san} leaves a pre-existing immediate mate; ${castle} instead removes every next-move mate.`,
    'pawn-delay-retains-avoidable-mate':`Pawn delay: ${w.played.san} leaves a pre-existing immediate mate; ${castle} instead removes every next-move mate.`,
  };
  for (const e of events) { assert.equal(e.text,texts[e.id]); assert.equal(e.qualityClaim,false); assert.equal(e.evidence.before,w.before); assert.equal(e.evidence.after,w.after); assert.deepEqual(e.evidence.detail,{source:'castlingTimingAnalysis.witness'}); }
  assert.equal(result.castlingTimingAnalysis.status,'proven');
}

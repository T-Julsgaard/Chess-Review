import assert from 'node:assert/strict';
import {DEFAULT_POSITION} from '../../../../lib/chess.js';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code = m => m.from+m.to+(m.promotion || '');
const rec = m => ({move:code(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const capturedSquare = m => !m.captured ? null : m.flags.includes('e') ? m.to[0]+m.from[1] : m.to;
const quietPawn = m => m.piece === 'p' && !m.captured && !m.promotion;
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+({p:1,n:3,b:3,r:5,q:9,k:0}[p.type])*(p.color === color ? 1 : -1),0);
// Independent complete legal inventories and material arithmetic, no candidate/helper imports.
function verifyPanel(p,c,offer,beforeOffer) {
  assert.equal(p.root,c.fen()); assert.deepEqual(p.offer,offer); assert.equal(p.beforeOffer,beforeOffer); assert.equal(p.capturer,c.turn());
  const baseline = balance(legalPosition(beforeOffer),c.turn()),capturer = c.turn(); assert.equal(p.baseline,baseline);
  assert.equal(c.get(offer.to)?.type,'p'); assert.notEqual(c.get(offer.to)?.color,capturer);
  const all = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b))); assert.deepEqual(p.moves,all.map(rec));
  const captures = all.filter(m => m.piece === 'p' && m.captured === 'p' && capturedSquare(m) === offer.to);
  assert.deepEqual(p.rows.map(r => r.capture),captures.map(rec)); const eligible = [];
  for (const [i,m] of captures.entries()) {
    const r = p.rows[i]; assert.equal(r.victim,capturedSquare(m)); c.move(code(m));
    assert.equal(r.after,c.fen()); assert.equal(r.terminal,c.isGameOver()); assert.equal(r.gain,balance(c,capturer)-baseline);
    const replies = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b))); assert.deepEqual(r.replies.map(x => x.reply),replies.map(rec));
    for (const [j,reply] of replies.entries()) {
      const victim = capturedSquare(reply); c.move(code(reply));
      assert.deepEqual(r.replies[j],{reply:rec(reply),victim,after:c.fen(),gain:balance(c,capturer)-baseline,mate:c.isCheckmate(),draw:c.isDraw(),takesAcceptor:victim === m.to}); c.undo();
    }
    const pass = !r.terminal && r.replies.every(x => !x.takesAcceptor); assert.equal(r.eligible,pass); if (pass) eligible.push(i); c.undo();
  }
  assert.deepEqual(p.eligible,eligible);
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E131'); assert.equal(w.openingActualPlyLimit,20); assert.deepEqual(w.history,input.history); assert.equal(w.history.fen,DEFAULT_POSITION); assert.ok(w.history.moves.length+1 <= 20);
  const c = legalPosition(w.history.fen); let last = null;
  for (const move of w.history.moves) { assert.equal(c.isGameOver(),false); const before = c.fen(),m = c.move(move); last = {before,move:m}; }
  assert.equal(c.fen(),legalPosition(input.fen).fen()); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.equal(c.isGameOver(),false);
  const m = c.move(input.move); assert.deepEqual(w.played,rec(m)); assert.equal(w.after,c.fen()); assert.equal(result.after,w.after); assert.equal(c.isGameOver(),false);
  if (quietPawn(m)) verifyPanel(w.current,c,rec(m),w.before); else assert.equal(w.current,null);
  c.undo();
  if (last && quietPawn(last.move)) verifyPanel(w.incoming,c,rec(last.move),last.before); else assert.equal(w.incoming,null);
  const accepted = w.incoming ? w.incoming.eligible.filter(i => w.incoming.rows[i].capture.move === code(m)) : [];
  const untaken = !!w.incoming?.eligible.length && !accepted.length;
  assert.deepEqual(w.accepted,accepted); assert.equal(w.untaken,untaken); let pair = null;
  if (untaken && w.current?.eligible.length) {
    const fields = w.after.split(' '); fields[1] = w.actor; fields[3] = '-'; let fresh;
    try { fresh = legalPosition(fields.join(' ')); } catch { /* unavailable */ }
    if (fresh && !fresh.isGameOver()) {
      verifyPanel(w.preserved,fresh,w.incoming.offer,w.incoming.beforeOffer);
      for (const i of w.incoming.eligible) { const j = w.preserved.eligible.find(j => w.preserved.rows[j].capture.move === w.incoming.rows[i].capture.move); if (j !== undefined) { pair = {incoming:i,preserved:j,current:w.current.eligible[0]}; break; } }
    } else assert.equal(w.preserved,null);
  } else assert.equal(w.preserved,null);
  assert.deepEqual(w.pair,pair);
  const ids = [...(w.current?.eligible.length ? ['opening-pawn-concession'] : []),...(accepted.length ? ['accepted-pawn-concession'] : []),...(untaken ? ['untaken-pawn-concession'] : []),...(pair ? ['retained-pawn-counteroffer'] : [])];
  assert.ok(ids.length); assert.deepEqual(w.ids,ids); const events = result.events.filter(e => e.evidence?.experiment === 'E131'); assert.deepEqual(events.map(e => e.id),ids);
  const offered = w.current?.rows[w.current.eligible[0]],inc = w.incoming?.rows[w.incoming.eligible[0]];
  const texts = {
    'opening-pawn-concession':`Opening pawn offer: ${m.san} permits ${offered?.capture.move}; after that capture, no legal immediate reply captures the accepting pawn.`,
    'accepted-pawn-concession':`Pawn offer accepted: ${m.san} takes the recorded ${w.incoming?.offer.to} concession; no legal immediate reply captures your accepting pawn.`,
    'untaken-pawn-concession':`Pawn offer untaken: ${m.san} leaves the recorded ${inc?.capture.move} acceptance unplayed.`,
    'retained-pawn-counteroffer':`Pawn counteroffer: ${m.san} leaves ${w.incoming?.rows[pair?.incoming]?.capture.move} available and offers ${m.to} to ${offered?.capture.move}; both acceptances avoid immediate recapture.`,
  };
  for (const e of events) { assert.equal(e.text,texts[e.id]); assert.equal(e.qualityClaim,false); assert.equal(e.evidence.before,w.before); assert.equal(e.evidence.after,w.after); assert.deepEqual(e.evidence.detail,{source:'pawnOfferAnalysis.witness'}); }
  assert.equal(result.pawnOfferAnalysis.status,'proven');
}

import assert from 'node:assert/strict';
import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {replayQuery} from '../../E029-forced-mates/code/replay.mjs';
const score = (c,color) => c.board().flat().filter(Boolean).reduce((sum,p) => sum+VALUES[p.type]*(p.color === color ? 1 : -1),0);
const rec = m => ({move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
export function checkWitness(w,result,input) {
  const a = result.openingMateOfferAnalysis,H = a.plies;
  assert.equal(H,input.openingOfferMatePlies ?? 3); assert.equal(a.limit,input.maxOpeningMateOfferNodes ?? 50000);
  assert.ok(a.nodes >= 1 && a.nodes <= a.limit); assert.equal(w.experiment,'E115');
  assert.deepEqual(w.history,input.history); assert.equal(w.history.fen,new Chess().fen()); assert.ok(w.history.moves.length+1 <= 20);
  const c = legalPosition(w.history.fen);
  for (const code of w.history.moves) { assert.match(code,/^[a-h][1-8][a-h][1-8][qrbn]?$/); assert.ok(!c.isGameOver()); c.move(code); }
  assert.equal(c.fen(),input.fen); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver());
  const last = c.history({verbose:true}).at(-1),m = c.move(input.move);
  assert.equal(w.after,c.fen()); assert.equal(result.after,c.fen()); assert.deepEqual(w.played,rec(m)); assert.ok(!c.isGameOver());
  const checkPanel = (p,board,baselineFen,offerer) => {
    assert.equal(p.root,board.fen()); assert.equal(p.baselineFen,baselineFen); assert.equal(p.offerer,offerer);
    const capturer = board.turn(); assert.equal(p.capturer,capturer);
    const baseline = score(legalPosition(baselineFen),capturer); assert.equal(p.baseline,baseline);
    const offset = score(board,capturer)-baseline; assert.equal(p.offset,offset);
    const captures = board.moves({verbose:true}).filter(m => m.captured).sort((a,b) => uci(a).localeCompare(uci(b)));
    assert.deepEqual(p.captures,captures.map(uci)); assert.equal(p.rows.length,captures.length);
    for (const [index,row] of p.rows.entries()) {
      const move = captures[index],start = score(board,capturer); assert.deepEqual(row.capture,rec(move)); board.move(move);
      try {
        assert.equal(row.after,board.fen()); const terminal = board.isGameOver(); assert.equal(row.terminal,terminal);
        const replies = board.moves({verbose:true}),witnesses = [];
        let minimum = score(board,capturer)-start,valid = !terminal && minimum > 0;
        if (!terminal) for (const reply of replies) {
          board.move(reply);
          try {
            const gain = score(board,capturer)-start;
            if (board.isCheckmate() || board.isDraw() || gain <= 0) valid = false;
            minimum = Math.min(minimum,gain); witnesses.push({reply:uci(reply),gain});
          } finally { board.undo(); }
        }
        if (valid) assert.deepEqual(row.certificate,{horizonPliesAfterCapture:1,materialValues:VALUES,minimumGain:minimum,witnesses});
        else assert.equal(row.certificate,null);
        assert.equal(row.minimum,valid ? minimum+offset : null);
        if (valid && minimum+offset > 0) {
          assert.ok(row.mate); assert.equal(row.mate.winner,offerer); assert.equal(row.mate.plies,H);
          replayQuery(board,row.mate); assert.equal(row.eligible,row.mate.tree.win);
        } else { assert.equal(row.mate,null); assert.equal(row.eligible,false); }
      } finally { board.undo(); }
    }
  };
  checkPanel(w.current,c,w.before,w.actor);
  if (last) { c.undo(); checkPanel(w.incoming,c,last.before,last.color); c.move(input.move); }
  else assert.equal(w.incoming,null);
  const offer = w.current.rows.findIndex(r => r.eligible);
  const accepted = w.incoming ? w.incoming.rows.findIndex(r => r.eligible && r.capture.move === uci(m)) : -1;
  const declined = w.incoming && accepted === -1 ? w.incoming.rows.findIndex(r => r.eligible) : -1;
  assert.deepEqual(w.selected,{offer,accepted,declined});
  const expected = [],add = (id,text,panel,index) => expected.push({id,text,qualityClaim:false,
    evidence:{experiment:'E115',before:w.before,after:w.after,detail:{panel,index}}});
  if (offer !== -1) {
    const row = w.current.rows[offer]; add('opening-mating-compensation-offer',
      `Opening offer: after ${m.san}, ${row.capture.move} gains at least ${row.minimum} nominal points immediately but permits your complete ${H}-ply mating policy.`, 'current',offer);
  }
  if (accepted !== -1) {
    const row = w.incoming.rows[accepted]; assert.equal(row.after,w.after);
    add('accepted-opening-mate-offer',`Offer accepted: ${m.san} takes the recorded concession, gaining at least ${row.minimum} nominal points immediately; the opponent retains a complete ${H}-ply mating policy.`, 'incoming',accepted);
  }
  if (declined !== -1) {
    const row = w.incoming.rows[declined]; add('untaken-opening-mate-offer',
      `Offer untaken: ${m.san} leaves the recorded ${row.capture.move} concession untaken; that capture would allow the opponent's complete ${H}-ply mating policy.`, 'incoming',declined);
  }
  assert.deepEqual(result.events.filter(e => e.evidence?.experiment === 'E115'),expected);
  assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact');
  for (const e of expected) assert.ok(e.text.split(/\s+/).length <= 24);
}

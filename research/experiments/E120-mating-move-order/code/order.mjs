import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E119-recorded-piece-storm/code/storm.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const quiet = m => m && !m.captured && !m.promotion && m.piece !== 'p';
export const priority = e => e.evidence?.experiment === 'E120' ? 176 : inherited(e);
export function explainMove(input) {
  const enabled = input.moveOrderTags === undefined ? false : input.moveOrderTags;
  if (typeof enabled !== 'boolean') throw Error('moveOrderTags must be boolean');
  if (!enabled) return parent(input);
  if (typeof input.orderFollowup !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(input.orderFollowup)) throw Error('orderFollowup must be UCI');
  const H = input.orderTailPlies === undefined ? 0 : input.orderTailPlies,limit = input.maxMoveOrderNodes === undefined ? 50000 : input.maxMoveOrderNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 2) throw Error('orderTailPlies must be integer0..2');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxMoveOrderNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('move-order-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E120-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    moveOrderAnalysis:{plies:H,limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (units(c).length > 10) { status = 'not-applicable'; return done(); }
    const before = c.fen(),actor = c.turn(),root = ordered(c),b = root.find(x => uci(x) === input.orderFollowup),a = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent move order differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (!quiet(a) || !quiet(b) || a.from === b.from) { status = 'not-comparable-order'; return done(); }
    tick(); const replies = ordered(c);
    witness = {experiment:'E120',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(a),from:a.from,to:a.to,piece:a.piece,san:a.san},followup:{move:uci(b),from:b.from,to:b.to,piece:b.piece,san:b.san},
      inventory:units(c),rootMoves:root.map(uci),check:c.isCheck(),replies:replies.map(uci),branches:[],success:true,reverse:null};
    for (const reply of replies) {
      tick(); c.move(reply);
      try {
        const terminal = c.isGameOver(),next = terminal ? null : ordered(c).find(x => uci(x) === input.orderFollowup),valid = !!quiet(next);
        const row = {reply:uci(reply),fen:c.fen(),terminal,followup:next ? {move:uci(next),san:next.san,captured:next.captured || null,promotion:next.promotion || null} : null,post:null,proof:null}; witness.branches.push(row);
        if (valid) { c.move(next); try { row.post = c.fen(); row.proof = query(c,actor,H,budget); } finally { c.undo(); } }
        if (!valid || !row.proof.tree.win) { witness.success = false; break; }
      } finally { c.undo(); }
    }
    if (!witness.success) return done();
    const reversed = legalPosition(h?.start || input.fen); for (const code of h?.moves || []) { tick(); reversed.move(code); }
    tick(); reversed.move(b);
    witness.reverse = {move:uci(b),fen:reversed.fen(),proof:query(reversed,actor,H+2,budget)};
    if (witness.reverse.proof.tree.win) return done();
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E120',before,after,detail:{source:'moveOrderAnalysis.witness'}}}); };
    add('proved-mating-move-order',`Move order: ${a.san} then ${b.san} permits mate after every defense; playing ${b.san} first cannot force mate within the same ${H+2}-ply continuation.`);
    if (witness.check) add('forcing-check-move-order',`Forcing order: ${a.san} checks; every legal evasion allows ${b.san} and mate within ${H} further plies. Reversing the order loses that bound.`);
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) {
    if (e.message !== 'move-order-budget') throw e;
    witness = null; events = base.events; status = 'exhausted';
  }
  return done();
}

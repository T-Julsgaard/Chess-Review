import {Chess} from '../../../../lib/chess.js';
import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E114-position-history-invariants/code/invariants.mjs';
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+VALUES[p.type]*(p.color === color ? 1 : -1),0);
const rec = m => ({move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
function panel(c,baselineFen,offerer,H,budget) {
  const root = c.fen(),capturer = c.turn(),baseline = balance(legalPosition(baselineFen),capturer);
  const offset = balance(c,capturer)-baseline;
  const captures = c.moves({verbose:true}).filter(m => m.captured).sort((a,b) => uci(a).localeCompare(uci(b))),rows = [];
  for (const m of captures) {
    budget.tick(); const before = legalPosition(root); c.move(m);
    try {
      const terminal = c.isGameOver(),certificate = terminal ? null : certifyCapture(before,c,m,budget);
      const minimum = certificate ? certificate.minimumGain+offset : null;
      const mate = minimum > 0 ? query(c,offerer,H,budget) : null;
      rows.push({capture:rec(m),after:c.fen(),terminal,certificate,minimum,mate,eligible:!!mate?.tree.win});
    } finally { c.undo(); }
  }
  return {root,baselineFen,offerer,capturer,baseline,offset,captures:captures.map(uci),rows};
}
export const priority = e => e.evidence?.experiment === 'E115' ? 174 : inherited(e);
export function explainMove(input) {
  const enabled = input.openingMateOfferTags === undefined ? false : input.openingMateOfferTags;
  if (typeof enabled !== 'boolean') throw Error('openingMateOfferTags must be boolean');
  if (!enabled) return parent(input);
  const H = input.openingOfferMatePlies === undefined ? 3 : input.openingOfferMatePlies;
  const limit = input.maxOpeningMateOfferNodes === undefined ? 50000 : input.maxOpeningMateOfferNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 4) throw Error('openingOfferMatePlies must be integer0..4');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxOpeningMateOfferNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const budget = {tick() { if (++nodes > limit) throw Error('opening-mate-offer-budget'); }};
  const done = () => ({...base,schema:'coach-concepts-E115-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    openingMateOfferAnalysis:{plies:H,limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    budget.tick(); const h = validateHistory(input);
    if (!h || h.start !== new Chess().fen() || h.moves.length+1 > 20) { status = 'history-unavailable'; return done(); }
    const c = legalPosition(h.start);
    for (const code of h.moves) { budget.tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent opening offer differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const current = panel(c,before,actor,H,budget);
    let incoming = null;
    if (h.records.length) {
      const last = h.records.at(-1),previous = legalPosition(h.start);
      for (const code of h.moves) { budget.tick(); previous.move(code); }
      incoming = panel(previous,last.before,last.move.color,H,budget);
    }
    const currentIndex = current.rows.findIndex(r => r.eligible);
    const acceptedIndex = incoming ? incoming.rows.findIndex(r => r.eligible && r.capture.move === uci(m)) : -1;
    const declinedIndex = incoming && acceptedIndex === -1 ? incoming.rows.findIndex(r => r.eligible) : -1;
    witness = {experiment:'E115',before,after,actor,history:{fen:h.start,moves:h.moves},played:rec(m),
      current,incoming,selected:{offer:currentIndex,accepted:acceptedIndex,declined:declinedIndex}};
    const extra = [],add = (id,text,panel,index) => {
      budget.tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
      extra.push({id,text,qualityClaim:false,evidence:{experiment:'E115',before,after,detail:{panel,index}}});
    };
    if (currentIndex !== -1) {
      const row = current.rows[currentIndex];
      add('opening-mating-compensation-offer',`Opening offer: after ${m.san}, ${row.capture.move} gains at least ${row.minimum} nominal points immediately but permits your complete ${H}-ply mating policy.`, 'current',currentIndex);
    }
    if (acceptedIndex !== -1) {
      const row = incoming.rows[acceptedIndex];
      add('accepted-opening-mate-offer',`Offer accepted: ${m.san} takes the recorded concession, gaining at least ${row.minimum} nominal points immediately; the opponent retains a complete ${H}-ply mating policy.`, 'incoming',acceptedIndex);
    }
    if (declinedIndex !== -1) {
      const row = incoming.rows[declinedIndex];
      add('untaken-opening-mate-offer',`Offer untaken: ${m.san} leaves the recorded ${row.capture.move} concession untaken; that capture would allow the opponent's complete ${H}-ply mating policy.`, 'incoming',declinedIndex);
    }
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'opening-mate-offer-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {buildGraph,vertex} from './graph.mjs';
import {explainMove as parent,priority as inherited} from '../../E126-reserve-tempo-trebuchet/code/tempo.mjs';
const units = c => c.board().flat().filter(Boolean);
const kings = c => Object.fromEntries(units(c).filter(p => p.type === 'k').map(p => [p.color,p.square]));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const key = c => c.fen().split(' ').slice(0,4).join(' ');
const uniqueHistory = c => { const h = c.history({verbose:true}); if (!h.length) return true; const positions = [h[0].before,...h.map(m => m.after)].map(f => f.split(' ').slice(0,4).join(' ')); return new Set(positions).size === positions.length; };
export const priority = e => e.evidence?.experiment === 'E127' ? 182 : inherited(e);
export function explainMove(input) {
  const enabled = input.correspondenceTags === undefined ? false : input.correspondenceTags;
  if (typeof enabled !== 'boolean') throw Error('correspondenceTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxCorrespondenceNodes === undefined ? 250000 : input.maxCorrespondenceNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 250000) throw Error('maxCorrespondenceNodes must be integer0..250000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('correspondence-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E127-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    correspondenceAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen),seen = new Set([key(c)]); let repeated = false;
    for (const move of h?.moves || []) { tick(); c.move(move); if (seen.has(key(c))) repeated = true; seen.add(key(c)); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = units(c),wp = old.filter(p => p.type === 'p' && p.color === 'w'),bp = old.filter(p => p.type === 'p' && p.color === 'b');
    if (old.length !== 4 || wp.length !== 1 || bp.length !== 1 || wp[0].square[0] !== bp[0].square[0] || Number(bp[0].square[1])-Number(wp[0].square[1]) !== 1 || before.split(' ')[2] !== '-' || before.split(' ')[3] !== '-') { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent correspondence differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.piece !== 'k' || m.captured) { status = 'not-quiet-king'; return done(); }
    if (seen.has(key(c))) repeated = true;
    if (repeated) { status = 'history-unavailable'; return done(); }
    const pair = {w:wp[0].square,b:bp[0].square},defender = c.turn(),graph = buildGraph(pair,defender,{tick});
    const responses = () => {
      tick(); const replies = ordered(c),row = {fen:c.fen(),actorSquare:kings(c)[actor],moves:replies.map(uci),replies:[],safe:[],unknown:[],unique:null};
      for (const reply of replies) {
        tick(); c.move(reply);
        try {
          const terminal = c.isGameOver(),loc = kings(c),rank = reply.captured ? null : graph.ranks[vertex(loc.w,loc.b,c.turn())],clock = Number(c.fen().split(' ')[4]);
          if (rank === -2) throw Error('Actual reply absent from graph');
          const outcome = terminal || reply.captured || rank === -1 ? 'safe' : clock+rank <= 100 && uniqueHistory(c) ? 'losing' : 'unknown';
          const item = {move:uci(reply),to:reply.to,captured:reply.captured || null,fen:c.fen(),terminal,rank,outcome}; row.replies.push(item);
          if (outcome === 'safe') row.safe.push(uci(reply)); if (outcome === 'unknown') row.unknown.push(uci(reply));
        } finally { c.undo(); }
      }
      if (!row.unknown.length && row.safe.length === 1 && row.replies.some(t => t.outcome === 'losing') && !row.replies.find(t => t.move === row.safe[0]).captured && !row.replies.find(t => t.move === row.safe[0]).terminal) row.unique = row.safe[0];
      return row;
    };
    witness = {experiment:'E127',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),graph,actual:responses(),followMoves:[],follow:[],linked:null};
    if (!witness.actual.unique) return done();
    c.move(witness.actual.unique);
    try {
      const choices = ordered(c); witness.followMoves = choices.map(uci);
      for (const choice of choices) {
        tick(); c.move(choice);
        try {
          const row = {move:uci(choice),terminal:c.isGameOver(),captured:choice.captured || null,responses:null}; witness.follow.push(row);
          if (!row.terminal && !choice.captured) row.responses = responses();
          if (row.responses?.unique && row.responses.actorSquare !== witness.actual.actorSquare && row.responses.unique.slice(2,4) !== witness.actual.unique.slice(2,4) && witness.linked === null) witness.linked = witness.follow.length-1;
        } finally { c.undo(); }
      }
    } finally { c.undo(); }
    if (witness.linked !== null) {
      tick(); const text = `Corresponding squares: ${m.san} requires ${witness.actual.unique.slice(2,4)}; a linked king-response system avoids losing the first pawn in this locked-pawn model.`;
      if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
      events = [...base.events,{id:'locked-pawn-corresponding-square-system',text,qualityClaim:false,evidence:{experiment:'E127',before,after,detail:{source:'correspondenceAnalysis.witness'}}}]; status = 'proven';
    }
  } catch (e) { if (e.message !== 'correspondence-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

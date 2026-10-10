import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E131-pawn-counteroffers/code/offers.mjs';
const rec = m => ({move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
const quietKnight = m => m.piece === 'n' && !m.captured && !m.promotion;
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const balance = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+VALUES[p.type]*(p.color === color ? 1 : -1),0);
function profile(c,target,enemy) {
  const relative = enemy === 'w' ? +target[1] : 9-+target[1],pawns = c.board().flat().filter(p => p?.type === 'p').map(({square,color}) => ({square,color})).sort((a,b) => a.square.localeCompare(b.square));
  const supporters = pawns.filter(p => p.color === enemy && c.attackers(target,enemy).includes(p.square)).map(p => p.square);
  const challengers = pawns.filter(p => p.color !== enemy && Math.abs(p.square.charCodeAt(0)-target.charCodeAt(0)) === 1 && (+p.square[1]-+target[1])*(enemy === 'w' ? 1 : -1) > 0).map(p => p.square);
  return {target,relative,pawns,supporters,challengers,eligible:'cdef'.includes(target[0]) && relative >= 4 && relative <= 6 && supporters.length > 0 && !challengers.length};
}
function priorPanel(c,tick) {
  tick(); const fen = c.fen(),enemy = c.turn(),moves = ordered(c),entries = [];
  for (const m of moves.filter(quietKnight)) {
    tick(); c.move(uci(m)); const terminal = c.isGameOver(),p = profile(c,m.to,enemy),replies = ordered(c).map(r => ({move:rec(r),victim:victim(r)}));
    entries.push({entry:rec(m),after:c.fen(),terminal,profile:p,replies,secure:!terminal && p.eligible && replies.every(r => r.victim !== m.to)}); c.undo();
  }
  return {fen,moves:moves.map(rec),entries};
}
function entryPolicy(c,entry,actor,tick) {
  tick(); c.move(uci(entry));
  const after = c.fen(),terminal = c.isGameOver(),baseline = balance(c,actor),moves = ordered(c),captures = [];
  if (!terminal) for (const m of moves.filter(m => m.captured === 'n' && victim(m) === entry.to)) {
    tick(); c.move(uci(m)); const captureAfter = c.fen(),captureTerminal = c.isGameOver(),gain = balance(c,actor)-baseline,replies = [];
    if (!captureTerminal) for (const r of ordered(c)) {
      tick(); c.move(uci(r)); replies.push({reply:rec(r),victim:victim(r),after:c.fen(),gain:balance(c,actor)-baseline,terminal:c.isGameOver(),mate:c.isCheckmate(),draw:c.isDraw()}); c.undo();
    }
    captures.push({capture:rec(m),after:captureAfter,terminal:captureTerminal,gain,replies,eligible:!captureTerminal && replies.every(r => !r.terminal && r.gain >= 0)}); c.undo();
  }
  const selected = captures.findIndex(r => r.eligible); c.undo();
  return {entry:rec(entry),after,terminal,baseline,moves:moves.map(rec),captures,selected,success:!terminal && selected !== -1};
}
export const priority = e => e.evidence?.experiment === 'E132' ? 180 : inherited(e);
export function explainMove(input) {
  const enabled = input.outpostChallengeTags === undefined ? false : input.outpostChallengeTags;
  if (typeof enabled !== 'boolean') throw Error('outpostChallengeTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxOutpostChallengeNodes === undefined ? 50000 : input.maxOutpostChallengeNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxOutpostChallengeNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('outpost-challenge-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E132-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    outpostChallengeAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen); for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent outpost challenge differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (['p','k'].includes(m.piece) || m.promotion) { status = 'not-piece-challenge'; return done(); }
    const fields = before.split(' '); fields[1] = c.turn(); fields[3] = '-'; let fresh;
    try { fresh = legalPosition(fields.join(' ')); } catch { status = 'illegal-prior-frame'; return done(); }
    if (fresh.isGameOver()) { status = 'not-live-prior'; return done(); }
    const prior = priorPanel(fresh,tick),targets = [...new Set(prior.entries.filter(r => r.secure).map(r => r.entry.to))].sort();
    if (!targets.length) { status = 'no-prior-secure-outpost'; return done(); }
    tick(); const actualMoves = ordered(c),trials = []; let selected = -1;
    for (const target of targets) {
      tick(); const entries = actualMoves.filter(m => quietKnight(m) && m.to === target).map(m => entryPolicy(c,m,actor,tick));
      const success = entries.length > 0 && entries.every(r => r.success); trials.push({target,entries,success});
      if (success) { selected = trials.length-1; break; }
    }
    if (selected === -1) return done();
    witness = {experiment:'E132',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:rec(m),prior,targets,actualMoves:actualMoves.map(rec),trials,selected};
    tick(); const text = `Outpost challenged: after ${m.san}, every immediate knight entry on ${trials[selected].target} permits capture without nominal material loss through the next enemy reply.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
    events = [...base.events,{id:'stops-secure-supported-knight-outpost',text,qualityClaim:false,evidence:{experiment:'E132',before,after,detail:{source:'outpostChallengeAnalysis.witness'}}}]; status = 'proven';
  } catch (e) { if (e.message !== 'outpost-challenge-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

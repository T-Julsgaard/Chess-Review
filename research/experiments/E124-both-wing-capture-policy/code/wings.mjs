import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E123-temporary-vulnerability/code/temporary.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const points = (c,actor) => units(c).reduce((sum,p) => sum+VALUES[p.type]*(p.color === actor ? 1 : -1),0);
const victim = m => m.isEnPassant() ? m.to[0]+m.from[1] : m.to;
const wing = s => 'abc'.includes(s[0]) ? 'queenside' : 'fgh'.includes(s[0]) ? 'kingside' : null;
export const priority = e => e.evidence?.experiment === 'E124' ? 179 : inherited(e);
export function explainMove(input) {
  const enabled = input.bothWingTags === undefined ? false : input.bothWingTags;
  if (typeof enabled !== 'boolean') throw Error('bothWingTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxBothWingNodes === undefined ? 50000 : input.maxBothWingNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxBothWingNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('both-wing-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E124-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    bothWingAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),baseline = points(c,actor);
    if (units(c).length > 10 || before.split(' ')[2] !== '-') { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent both-wing differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.captured || m.promotion || ['k','p'].includes(m.piece)) { status = 'not-quiet-piece'; return done(); }
    const policy = p => {
      tick(); const replies = ordered(p),out = {fen:p.fen(),moves:replies.map(uci),branches:[],coverage:!!replies.length,queensideOnly:null,kingsideOnly:null};
      for (const reply of replies) {
        tick(); p.move(reply);
        try {
          const terminal = p.isGameOver(),offset = points(p,actor)-baseline,captures = terminal ? [] : ordered(p).filter(x => x.captured && wing(victim(x)));
          const row = {reply:uci(reply),fen:p.fen(),terminal,offset,captures:[],wings:[]}; out.branches.push(row);
          for (const capture of captures) {
            tick(); const pre = legalPosition(p.fen()); p.move(capture);
            try { const proof = certifyCapture(pre,p,capture,budget); row.captures.push({move:uci(capture),victim:victim(capture),wing:wing(victim(capture)),post:p.fen(),proof,net:proof ? proof.minimumGain+offset : null}); }
            finally { p.undo(); }
          }
          row.wings = ['queenside','kingside'].filter(side => row.captures.some(x => x.wing === side && x.proof && x.net > 0));
          if (row.wings.length === 1) { if (row.wings[0] === 'queenside' && out.queensideOnly === null) out.queensideOnly = out.branches.length-1; if (row.wings[0] === 'kingside' && out.kingsideOnly === null) out.kingsideOnly = out.branches.length-1; }
          if (!row.wings.length) { out.coverage = false; break; }
        } finally { p.undo(); }
      }
      return out;
    };
    witness = {experiment:'E124',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,baseline,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san},inventory:units(c),actual:policy(c),restored:null};
    if (!witness.actual.coverage || witness.actual.queensideOnly === null || witness.actual.kingsideOnly === null) return done();
    tick(); const changed = legalPosition(after); changed.remove(m.to); changed.put({type:m.piece,color:actor},m.from);
    const fields = changed.fen().split(' '); fields[3] = '-'; let restored;
    try { restored = legalPosition(fields.join(' ')); } catch { /* Illegal comparison supplies no causal claim. */ }
    witness.restored = {fen:fields.join(' '),legal:!!restored,terminal:restored ? restored.isGameOver() : null,policy:restored && !restored.isGameOver() ? policy(restored) : null};
    if (!witness.restored.policy || witness.restored.policy.coverage) return done();
    tick(); const text = `Both-wing attack: ${m.san} guarantees a certified net material capture after every defense; some require each wing. Restoring only that piece breaks this policy.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
    events = [...base.events,{id:'necessary-both-wing-capture-policy',text,qualityClaim:false,evidence:{experiment:'E124',before,after,detail:{source:'bothWingAnalysis.witness'}}}]; status = 'proven';
  } catch (e) {
    if (e.message !== 'both-wing-budget') throw e;
    witness = null; events = base.events; status = 'exhausted';
  }
  return done();
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E118-causal-attack-entry/code/entry.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const near = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1])) <= 2;
export const priority = e => e.evidence?.experiment === 'E119' ? 175 : inherited(e);
export function explainMove(input) {
  const enabled = input.pieceStormTags === undefined ? false : input.pieceStormTags;
  if (typeof enabled !== 'boolean') throw Error('pieceStormTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxPieceStormNodes === undefined ? 50000 : input.maxPieceStormNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPieceStormNodes must be integer0..50000');
  if (input.attackEntryTags !== undefined && input.attackEntryTags !== true) throw Error('pieceStormTags requires attackEntryTags true or omitted');
  const base = parent({...input,attackEntryTags:true}); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('piece-storm-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E119-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    pieceStormAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input);
    if (!h || h.records.length < 2) { status = 'history-unavailable'; return done(); }
    if (base.attackEntryAnalysis.status !== 'proven') { status = 'no-joint-entry'; return done(); }
    const entry = base.attackEntryAnalysis.witness,actor = entry.actor,king = entry.king,H = base.attackEntryAnalysis.plies;
    const [first,reply] = h.records.slice(-2),m = first.move,r = reply.move;
    const quiet = x => !x.captured && !x.promotion && !['k','p'].includes(x.piece);
    const before = legalPosition(first.before),middle = legalPosition(first.after),post = legalPosition(entry.after);
    const enemyKing = c => units(c).find(p => p.type === 'k' && p.color !== actor).square;
    if (!quiet(m) || r.captured || r.promotion || r.piece === 'k' || m.color !== actor || r.color === actor || m.to === entry.played.from || !entry.partners.some(p => p.square === m.to && p.type === m.piece) || near(m.from,king) || !near(m.to,king) || post.get(m.from) || [before,middle,legalPosition(reply.after),post].some(c => enemyKing(c) !== king)) { status = 'no-recorded-arrivals'; return done(); }
    const inventory = units(post),local = c => units(c).filter(p => !['p','k'].includes(p.type) && near(p.square,king));
    const oldLocal = local(before),newLocal = local(post),counts = {beforeOwn:oldLocal.filter(p => p.color === actor).length,beforeEnemy:oldLocal.filter(p => p.color !== actor).length,afterOwn:newLocal.filter(p => p.color === actor).length,afterEnemy:newLocal.filter(p => p.color !== actor).length};
    const frame = restore => {
      tick(); const c = legalPosition(entry.after); c.remove(m.to); if (restore) c.put({type:m.piece,color:actor},m.from);
      const fields = c.fen().split(' '); fields[3] = '-'; let p;
      try { p = legalPosition(fields.join(' ')); } catch { /* Illegal comparison proves no joint contribution. */ }
      return {fen:fields.join(' '),legal:!!p,proof:p ? query(p,actor,H,budget) : null};
    };
    witness = {experiment:'E119',before:entry.before,after:entry.after,actor,history:{fen:h.start,moves:h.moves},king,
      first:{before:first.before,move:uci(m),after:first.after,from:m.from,to:m.to,piece:m.piece,san:m.san},
      reply:{before:reply.before,move:uci(r),after:reply.after},inventory,oldLocal,newLocal,counts,restored:frame(true),removed:frame(false)};
    if (![witness.restored,witness.removed].every(x => x.legal && !x.proof.tree.win)) return done();
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E119',before:entry.before,after:entry.after,detail:{source:'pieceStormAnalysis.witness'}}}); };
    add('recorded-joint-piece-storm',`Piece storm: recorded ${m.san} then ${entry.played.san} bring distinct pieces near the king; restoring or removing either arrival stops this ${H}-ply mate.`);
    if (counts.afterOwn-counts.beforeOwn >= 2 && counts.beforeOwn <= counts.beforeEnemy && counts.afterOwn > counts.afterEnemy) add('causal-local-numerical-superiority',`Local superiority: nearby nonpawn attackers increase ${counts.beforeOwn}→${counts.afterOwn}, against ${counts.afterEnemy} defenders; both recorded arrivals are independently necessary for this ${H}-ply mate.`);
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) {
    if (e.message !== 'piece-storm-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

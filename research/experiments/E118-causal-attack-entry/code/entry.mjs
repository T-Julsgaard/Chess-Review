import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E117-pawn-defense-policies/code/defense.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const distance = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1]));
const wing = s => 'abc'.includes(s[0]) ? 'queenside' : 'fgh'.includes(s[0]) ? 'kingside' : null;
export const priority = e => e.evidence?.experiment === 'E118' ? 174 : inherited(e);
export function explainMove(input) {
  const enabled = input.attackEntryTags === undefined ? false : input.attackEntryTags;
  if (typeof enabled !== 'boolean') throw Error('attackEntryTags must be boolean');
  if (!enabled) return parent(input);
  const H = input.attackEntryPlies === undefined ? 2 : input.attackEntryPlies,limit = input.maxAttackEntryNodes === undefined ? 50000 : input.maxAttackEntryNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 4) throw Error('attackEntryPlies must be integer0..4');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxAttackEntryNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('attack-entry-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E118-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    attackEntryAnalysis:{plies:H,limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = legalPosition(before);
    if (units(c).length > 10 || before.split(' ')[2] !== '-') { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent attack entry differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (['k','p'].includes(m.piece) || m.captured || m.promotion) { status = 'not-piece-entry'; return done(); }
    const army = units(c),king = army.find(p => p.type === 'k' && p.color !== actor).square;
    const partners = army.filter(p => p.color === actor && !['k','p'].includes(p.type) && p.square !== m.to && distance(p.square,king) <= 2);
    if (distance(m.from,king) <= 2 || distance(m.to,king) > 2 || !partners.length) { status = 'no-reinforcement-entry'; return done(); }
    tick(); const run = p => query(p,actor,H,budget);
    const contacts = units(old).filter(p => p.color !== actor && p.type !== 'k' && wing(p.square) === wing(m.from) && old.attackers(p.square,actor).includes(m.from));
    witness = {experiment:'E118',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san},inventory:army,king,partners,contacts,
      actual:run(c),fresh:null,restored:null,removed:null};
    if (!witness.actual.tree.win) return done();
    witness.fresh = run(legalPosition(after)); if (!witness.fresh.tree.win) return done();
    const frame = restore => {
      tick(); const changed = legalPosition(after); changed.remove(m.to);
      if (restore) changed.put({type:m.piece,color:actor},m.from);
      const fields = changed.fen().split(' '); fields[3] = '-'; let p;
      try { p = legalPosition(fields.join(' ')); } catch { /* Illegal controls prove nothing. */ }
      return {fen:fields.join(' '),legal:!!p,proof:p ? run(p) : null};
    };
    witness.restored = frame(true); witness.removed = frame(false);
    if (![witness.restored,witness.removed].every(x => x.legal && !x.proof.tree.win)) return done();
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E118',before,after,detail:{source:'attackEntryAnalysis.witness'}}}); };
    add('causal-mating-reinforcement',`Reinforcement: ${m.san} joins ${partners.map(p => p.square).join('/')} near the enemy king; restoring or removing the arrival separately stops this ${H}-ply mate.`);
    const relative = s => actor === 'w' ? +s[1] : 9-+s[1];
    if (m.piece === 'q' && relative(m.from) <= 4 && relative(m.to) >= 5) add('causal-queen-infiltration',`Queen infiltration: ${m.san} enters the enemy half near its king; restoring or removing only your queen separately stops this ${H}-ply mate.`);
    if (wing(m.from) && wing(m.to) && wing(m.from) !== wing(m.to)) {
      add('causal-mating-wing-switch',`Wing switch: ${m.san} crosses from ${wing(m.from)} to ${wing(m.to)}; restoring or removing only that piece separately stops this ${H}-ply mate.`);
      if (contacts.length) add('causal-attack-switch-with-prior-contact',`Attack switch: ${m.san} leaves geometric contact with ${contacts.map(p => p.square).join('/')} on the other wing and becomes necessary for this ${H}-ply mate.`);
    }
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) {
    if (e.message !== 'attack-entry-budget') throw e;
    witness = null; events = base.events; status = 'exhausted';
  }
  return done();
}

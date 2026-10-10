import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {resourceQuery} from './race-query.mjs';
import {explainMove as parent,priority as inherited} from '../../E133-central-position-types/code/center.mjs';
const distance = (a,b) => Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1]));
export const priority = e => e.evidence?.experiment === 'E134' ? 179 : inherited(e);
export function explainMove(input) {
  const enabled = input.kingRaceTags === undefined ? false : input.kingRaceTags;
  if (typeof enabled !== 'boolean') throw Error('kingRaceTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxKingRaceNodes === undefined ? 50000 : input.maxKingRaceNodes,H = input.kingRacePlies === undefined ? 10 : input.kingRacePlies;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxKingRaceNodes must be integer0..50000');
  if (!Number.isSafeInteger(H) || H < 0 || H > 10) throw Error('kingRacePlies must be integer0..10');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',stage = 'profile',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('king-race-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E134-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    kingRaceAnalysis:{limit,plies:H,nodes,status,stage,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen); for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),army = c.board().flat().filter(Boolean),own = army.filter(p => p.color === actor && p.type === 'p'),enemy = army.filter(p => p.color !== actor && p.type === 'p'),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent king race differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (army.length !== 4 || own.length !== 1 || enemy.length !== 1 || army.some(p => !['k','p'].includes(p.type)) || [before,after].some(f => f.split(' ')[2] !== '-' || f.split(' ')[3] !== '-')) { status = 'not-pawn-race-profile'; return done(); }
    if (m.piece !== 'k' || m.captured || Math.abs(m.from.charCodeAt(0)-m.to.charCodeAt(0)) !== 1 || Math.abs(+m.from[1]-+m.to[1]) !== 1) { status = 'not-quiet-diagonal-king'; return done(); }
    const distances = {own:{before:distance(m.from,own[0].square),after:distance(m.to,own[0].square)},enemy:{before:distance(m.from,enemy[0].square),after:distance(m.to,enemy[0].square)}};
    if (distances.own.after >= distances.own.before || distances.enemy.after >= distances.enemy.before) { status = 'not-dual-approach'; return done(); }
    stage = 'combined'; const combined = resourceQuery(c,actor,own[0].square,enemy[0].square,H,'combined',{tick},before);
    witness = {experiment:'E134',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),san:m.san,ownPawn:own[0].square,enemyPawn:enemy[0].square,distances,combined,capture:null,queen:null};
    if (!combined.win) { status = 'no-combined-policy'; return done(); }
    stage = 'capture'; const capture = resourceQuery(c,actor,own[0].square,enemy[0].square,H,'capture',{tick},before);
    witness.capture = capture;
    if (capture.win) { status = 'single-resource-suffices'; return done(); }
    stage = 'queen'; const queen = resourceQuery(c,actor,own[0].square,enemy[0].square,H,'queen',{tick},before);
    witness.queen = queen;
    if (queen.win) { status = 'single-resource-suffices'; return done(); }
    tick(); const text = `Dual-purpose king race: ${m.san} guarantees stopping the enemy pawn or a surviving promoted queen within ${H} plies; neither resource alone is guaranteed.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
    events = [...base.events,{id:'adaptive-dual-purpose-king-race',text,qualityClaim:false,evidence:{experiment:'E134',before,after,detail:{source:'kingRaceAnalysis.witness'}}}]; status = 'proven'; stage = 'complete';
  } catch (e) { if (e.message !== 'king-race-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E128-locked-structure-guards/code/structure.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const colorOf = s => (s.charCodeAt(0)-97+Number(s[1])-1)%2;
const knightSet = (c,actor) => units(c).filter(p => p.type === 'n' && p.color === actor).map(p => p.square);
const counts = set => ({squares:set,dark:set.filter(s => colorOf(s) === 0).length,parity:set.filter(s => colorOf(s) === 0).length%2});
const record = (before,m,after) => ({before,after,move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
function knightGraph(tick) {
  const rows = []; let edges = 0;
  for (let i = 0; i < 64; i++) {
    tick(); const from = 'abcdefgh'[i%8]+(Math.floor(i/8)+1),destinations = [];
    for (let j = 0; j < 64; j++) { const to = 'abcdefgh'[j%8]+(Math.floor(j/8)+1),dx = Math.abs(i%8-j%8),dy = Math.abs(Math.floor(i/8)-Math.floor(j/8)); if (dx > 0 && dy > 0 && dx+dy === 3) { tick(); destinations.push(to); edges++; } }
    rows.push({square:from,color:colorOf(from),destinations:destinations.sort()});
  }
  if (edges !== 336) throw Error('Incomplete knight graph');
  return {schema:'knight-bipartite-v1',rows,edges,dark:rows.filter(r => r.color === 0).length,light:rows.filter(r => r.color === 1).length};
}
export const priority = e => e.evidence?.experiment === 'E129' ? 184 : inherited(e);
export function explainMove(input) {
  const enabled = input.knightTempoTags === undefined ? false : input.knightTempoTags;
  if (typeof enabled !== 'boolean') throw Error('knightTempoTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxKnightTempoNodes === undefined ? 50000 : input.maxKnightTempoNodes,N = input.knightTempoMoves === undefined ? 3 : input.knightTempoMoves;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxKnightTempoNodes must be integer0..50000');
  if (!Number.isSafeInteger(N) || N < 3 || N > 9 || N%2 !== 1) throw Error('knightTempoMoves must be odd integer3..9');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('knight-tempo-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E129-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    knightTempoAnalysis:{limit,moves:N,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen); for (const move of h?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent knight tempo differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.piece !== 'n' || m.captured || m.promotion) { status = 'not-quiet-knight'; return done(); }
    if (!h || h.records.length < 2*N-2) { status = 'history-unavailable'; return done(); }
    const segmentIndex = h.records.length-(2*N-2),segment = [...h.records.slice(segmentIndex).map(r => record(r.before,r.move,r.after)),record(before,m,after)],root = legalPosition(segment[0].before),start = units(root),finish = units(c);
    if (start.some(p => !['k','p','n'].includes(p.type)) || finish.some(p => !['k','p','n'].includes(p.type)) || !start.some(p => p.color === actor && p.type === 'n') || [root.fen(),after].some(f => f.split(' ')[2] !== '-' || f.split(' ')[3] !== '-')) { status = 'not-applicable'; return done(); }
    if (segment.some((r,i) => r.captured || r.promotion || r.color !== (i%2 === 0 ? actor : actor === 'w' ? 'b' : 'w') || (i%2 === 0 ? r.piece !== 'n' : r.piece === 'p'))) return done();
    const enemyBefore = start.filter(p => p.color !== actor),enemyAfter = finish.filter(p => p.color !== actor),fixedBefore = start.filter(p => p.color === actor && p.type !== 'n'),fixedAfter = finish.filter(p => p.color === actor && p.type !== 'n');
    if (JSON.stringify(enemyBefore) !== JSON.stringify(enemyAfter) || JSON.stringify(fixedBefore) !== JSON.stringify(fixedAfter)) return done();
    const graph = knightGraph(tick),transitions = [];
    for (const r of segment.filter(r => r.color === actor)) {
      tick(); const beforeSet = counts(knightSet(legalPosition(r.before),actor)),afterSet = counts(knightSet(legalPosition(r.after),actor));
      if (beforeSet.parity === afterSet.parity || beforeSet.squares.length !== afterSet.squares.length || colorOf(r.from) === colorOf(r.to)) throw Error('Knight parity invariant failed');
      transitions.push({move:r.move,fromColor:colorOf(r.from),toColor:colorOf(r.to),before:beforeSet,after:afterSet});
    }
    const initial = counts(knightSet(root,actor)),final = counts(knightSet(c,actor));
    if (initial.parity === final.parity || JSON.stringify(initial.squares) === JSON.stringify(final.squares)) throw Error('Odd knight return contradiction');
    witness = {experiment:'E129',before,after,actor,history:{fen:h.start,moves:h.moves},played:uci(m),moves:N,segmentIndex,segment,root:root.fen(),graph,transitions,initial,final,enemyBefore,enemyAfter,fixedBefore,fixedAfter,
      state:{before:root.fen().split(' ').slice(1),after:after.split(' ').slice(1)}};
    tick(); const text = `Knight tempo constraint: your opponent returned, but ${N} knight moves cannot restore your knights' squares; a knight-only return requires an even count.`;
    if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
    events = [...base.events,{id:'knight-only-odd-tempo-impossibility',text,qualityClaim:false,evidence:{experiment:'E129',before,after,detail:{source:'knightTempoAnalysis.witness'}}}]; status = 'proven';
  } catch (e) { if (e.message !== 'knight-tempo-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

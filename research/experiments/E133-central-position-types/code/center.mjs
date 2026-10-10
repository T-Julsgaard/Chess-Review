import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {explainMove as parent,priority as inherited} from '../../E132-supported-outpost-challenges/code/outpost.mjs';
const rec = m => ({move:uci(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
const central = square => !!square && 'de'.includes(square[0]);
function taxonomy(c,tick) {
  const pawns = c.board().flat().filter(p => p?.type === 'p').map(({square,color}) => ({square,color})).sort((a,b) => a.square.localeCompare(b.square));
  const files = [];
  for (const file of 'abcdefgh') { tick(); files.push({file,w:pawns.filter(p => p.square[0] === file && p.color === 'w').map(p => p.square),b:pawns.filter(p => p.square[0] === file && p.color === 'b').map(p => p.square)}); }
  const fronts = pawns.filter(p => central(p.square)).map(p => {
    tick(); const square = p.square[0]+(+p.square[1]+(p.color === 'w' ? 1 : -1)),occupant = c.get(square);
    return {pawn:p,square,occupant:occupant ? {type:occupant.type,color:occupant.color} : null,blockedByEnemyPawn:occupant?.type === 'p' && occupant.color !== p.color};
  });
  const locks = fronts.filter(r => r.pawn.color === 'w' && r.blockedByEnemyPawn).map(r => ({file:r.pawn.square[0],w:r.pawn.square,b:r.square}));
  const d = files[3],e = files[4],colors = f => ['w','b'].filter(color => f[color].length),dc = colors(d),ec = colors(e);
  let type = 'other',semiFiles = null;
  if (!fronts.length) type = 'open';
  else if (locks.some(r => r.file === 'd') && locks.some(r => r.file === 'e') && fronts.every(r => r.blockedByEnemyPawn)) type = 'closed';
  else if (dc.length === 1 && ec.length === 1 && dc[0] !== ec[0]) { type = 'split-semi-open'; semiFiles = {w:dc[0] === 'b' ? 'd' : 'e',b:dc[0] === 'w' ? 'd' : 'e'}; }
  return {schema:'central-pawn-taxonomy-v1',pawns,files,fronts,locks,type,semiFiles};
}
function path(m) {
  const dx = Math.sign(m.to.charCodeAt(0)-m.from.charCodeAt(0)),dy = Math.sign(+m.to[1]-+m.from[1]),squares = [];
  let x = m.from.charCodeAt(0)-97,y = +m.from[1];
  do { x += dx; y += dy; squares.push(String.fromCharCode(97+x)+y); } while (squares.at(-1) !== m.to);
  return squares;
}
export const priority = e => e.evidence?.experiment === 'E133' ? e.id === 'fluid-central-structure-choice' ? 105 : 45 : inherited(e);
export function explainMove(input) {
  const enabled = input.centralPositionTags === undefined ? false : input.centralPositionTags;
  if (typeof enabled !== 'boolean') throw Error('centralPositionTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxCentralPositionNodes === undefined ? 50000 : input.maxCentralPositionNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxCentralPositionNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('central-position-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E133-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    centralPositionAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen); for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent central position differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const structure = taxonomy(c,tick),side = c.turn(),moves = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b))),routes = [],successors = [];
    for (const move of moves.filter(m => ['b','r','q'].includes(m.piece))) { tick(); const squares = path(move); routes.push({move:rec(move),path:squares,center:squares.filter(s => ['d4','e4','d5','e5'].includes(s))}); }
    for (const move of moves.filter(m => m.piece === 'p' && (central(m.from) || central(m.to) || central(victim(m))))) {
      tick(); const capturedSquare = victim(move); c.move(uci(move)); const terminal = c.isGameOver(),next = taxonomy(c,tick);
      successors.push({move:rec(move),victim:capturedSquare,after:c.fen(),terminal,structure:next,
        closing:!terminal && !move.captured && !move.promotion && central(move.from) && next.type === 'closed',
        opening:!terminal && !!move.captured && !move.promotion && ['open','split-semi-open'].includes(next.type)}); c.undo();
    }
    const closing = successors.findIndex(r => r.closing),opening = successors.findIndex(r => r.opening),fluid = closing !== -1 && opening !== -1;
    const names = {open:'open-pawn-center',closed:'closed-pawn-center','split-semi-open':'split-semi-open-pawn-center'},ids = [...(names[structure.type] ? [names[structure.type]] : []),...(fluid ? ['fluid-central-structure-choice'] : [])];
    if (!ids.length) return done();
    witness = {experiment:'E133',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:rec(m),side,structure,moves:moves.map(rec),routes,successors,closing,opening,fluid,ids};
    const sideName = side === 'w' ? 'White' : 'Black',openingName = successors[opening]?.structure.type === 'open' ? 'open' : 'split semi-open';
    const texts = {
      'open-pawn-center':'Open pawn center: the d- and e-files contain no pawns.',
      'closed-pawn-center':"Closed pawn center: opposing pawns block every d- and e-pawn's forward advance; captures can still change this structure.",
      'split-semi-open-pawn-center':"Split semi-open center: each side has a different central file free of its own pawns but containing enemy pawns.",
      'fluid-central-structure-choice':`Fluid central choice: ${sideName} can choose ${successors[opening]?.move.san} for a ${openingName} center or ${successors[closing]?.move.san} for a closed pawn center.`,
    };
    const extra = ids.map(id => { tick(); const text = texts[id]; if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); return {id,text,qualityClaim:false,evidence:{experiment:'E133',before,after,detail:{source:'centralPositionAnalysis.witness'}}}; });
    events = [...base.events,...extra]; status = 'proven';
  } catch (e) { if (e.message !== 'central-position-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

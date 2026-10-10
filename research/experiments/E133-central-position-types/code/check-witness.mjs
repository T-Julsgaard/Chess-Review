import assert from 'node:assert/strict';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const code = m => m.from+m.to+(m.promotion || '');
const rec = m => ({move:code(m),from:m.from,to:m.to,piece:m.piece,color:m.color,captured:m.captured || null,promotion:m.promotion || null,san:m.san});
const victim = m => !m.captured ? null : m.flags.includes('e') ? m.to[0]+m.from[1] : m.to;
const central = s => !!s && ['d','e'].includes(s[0]);
// Independent FEN parsing and pawn geometry; no detector/taxonomy/path imports.
function reconstruct(c) {
  const board = {},pawns = [];
  c.fen().split(' ')[0].split('/').forEach((row,index) => {
    let x = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) { x += +ch; continue; }
      const square = 'abcdefgh'[x++]+(8-index),p = {type:ch.toLowerCase(),color:ch === ch.toUpperCase() ? 'w' : 'b'};
      board[square] = p; if (p.type === 'p') pawns.push({square,color:p.color});
    }
  });
  pawns.sort((a,b) => a.square.localeCompare(b.square));
  const files = [...'abcdefgh'].map(file => ({file,w:[],b:[]})); for (const p of pawns) files[p.square.charCodeAt(0)-97][p.color].push(p.square);
  const fronts = pawns.filter(p => central(p.square)).map(p => {
    const square = p.square[0]+(+p.square[1]+(p.color === 'w' ? 1 : -1)),occupant = board[square] || null;
    return {pawn:p,square,occupant,blockedByEnemyPawn:occupant?.type === 'p' && occupant.color !== p.color};
  });
  const locks = fronts.filter(x => x.pawn.color === 'w' && x.blockedByEnemyPawn).map(x => ({file:x.pawn.square[0],w:x.pawn.square,b:x.square}));
  const d = files[3],e = files[4],single = f => f.w.length && !f.b.length ? 'w' : f.b.length && !f.w.length ? 'b' : null;
  let type = 'other',semiFiles = null;
  if (!fronts.length) type = 'open';
  else if (new Set(locks.map(x => x.file)).size === 2 && fronts.filter(x => x.blockedByEnemyPawn).length === fronts.length) type = 'closed';
  else if (single(d) && single(e) && single(d) !== single(e)) { type = 'split-semi-open'; semiFiles = single(d) === 'b' ? {w:'d',b:'e'} : {w:'e',b:'d'}; }
  return {schema:'central-pawn-taxonomy-v1',pawns,files,fronts,locks,type,semiFiles};
}
function route(m) {
  const dx = m.to.charCodeAt(0)-m.from.charCodeAt(0),dy = +m.to[1]-+m.from[1],steps = Math.max(Math.abs(dx),Math.abs(dy));
  return Array.from({length:steps},(_,i) => String.fromCharCode(m.from.charCodeAt(0)+(i+1)*dx/steps)+(+m.from[1]+(i+1)*dy/steps));
}
export function checkWitness(w,result,input) {
  assert.equal(w.experiment,'E133'); assert.deepEqual(w.history,input.history ?? null);
  const c = legalPosition(w.history?.fen || input.fen);
  for (const move of w.history?.moves || []) { assert.equal(c.isGameOver(),false); c.move(move); }
  assert.equal(c.fen(),legalPosition(input.fen).fen()); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.equal(c.isGameOver(),false);
  const m = c.move(input.move); assert.deepEqual(w.played,rec(m)); assert.equal(w.after,c.fen()); assert.equal(result.after,w.after); assert.equal(c.isGameOver(),false); assert.equal(w.side,c.turn());
  assert.deepEqual(w.structure,reconstruct(c)); const moves = c.moves({verbose:true}).sort((a,b) => code(a).localeCompare(code(b))); assert.deepEqual(w.moves,moves.map(rec));
  const routes = moves.filter(x => ['b','r','q'].includes(x.piece)).map(x => { const path = route(x); return {move:rec(x),path,center:path.filter(s => ['d4','e4','d5','e5'].includes(s))}; }); assert.deepEqual(w.routes,routes);
  const relevant = moves.filter(x => x.piece === 'p' && (central(x.from) || central(x.to) || central(victim(x)))); assert.deepEqual(w.successors.map(x => x.move),relevant.map(rec));
  for (const [i,next] of relevant.entries()) {
    const capturedSquare = victim(next); c.move(code(next)); const terminal = c.isGameOver(),structure = reconstruct(c);
    assert.deepEqual(w.successors[i],{move:rec(next),victim:capturedSquare,after:c.fen(),terminal,structure,
      closing:!terminal && !next.captured && !next.promotion && central(next.from) && structure.type === 'closed',
      opening:!terminal && !!next.captured && !next.promotion && ['open','split-semi-open'].includes(structure.type)}); c.undo();
  }
  const closing = w.successors.findIndex(x => x.closing),opening = w.successors.findIndex(x => x.opening),fluid = closing >= 0 && opening >= 0;
  assert.equal(w.closing,closing); assert.equal(w.opening,opening); assert.equal(w.fluid,fluid);
  const names = {open:'open-pawn-center',closed:'closed-pawn-center','split-semi-open':'split-semi-open-pawn-center'};
  const ids = [...(names[w.structure.type] ? [names[w.structure.type]] : []),...(fluid ? ['fluid-central-structure-choice'] : [])]; assert.ok(ids.length); assert.deepEqual(w.ids,ids);
  const sideName = w.side === 'w' ? 'White' : 'Black',openingName = w.successors[opening]?.structure.type === 'open' ? 'open' : 'split semi-open';
  const texts = {
    'open-pawn-center':'Open pawn center: the d- and e-files contain no pawns.',
    'closed-pawn-center':"Closed pawn center: opposing pawns block every d- and e-pawn's forward advance; captures can still change this structure.",
    'split-semi-open-pawn-center':"Split semi-open center: each side has a different central file free of its own pawns but containing enemy pawns.",
    'fluid-central-structure-choice':`Fluid central choice: ${sideName} can choose ${w.successors[opening]?.move.san} for a ${openingName} center or ${w.successors[closing]?.move.san} for a closed pawn center.`,
  };
  const events = result.events.filter(e => e.evidence?.experiment === 'E133'); assert.deepEqual(events.map(e => e.id),ids);
  for (const e of events) { assert.equal(e.text,texts[e.id]); assert.equal(e.qualityClaim,false); assert.equal(e.evidence.before,w.before); assert.equal(e.evidence.after,w.after); assert.deepEqual(e.evidence.detail,{source:'centralPositionAnalysis.witness'}); }
  assert.equal(result.centralPositionAnalysis.status,'proven');
}

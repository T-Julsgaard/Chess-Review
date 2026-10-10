import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {buildGraph,vertex} from '../../E127-locked-pawn-correspondence/code/graph.mjs';
import {explainMove as parent,priority as inherited} from '../../E127-locked-pawn-correspondence/code/correspondence.mjs';
const units = c => c.board().flat().filter(Boolean);
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const node = c => { const k = Object.fromEntries(units(c).filter(p => p.type === 'k').map(p => [p.color,p.square])); return vertex(k.w,k.b,c.turn()); };
const uniqueHistory = c => { const h = c.history({verbose:true}); if (!h.length) return true; const keys = [h[0].before,...h.map(m => m.after)].map(f => f.split(' ').slice(0,4).join(' ')); return new Set(keys).size === keys.length; };
const outcome = (c,g,irreversible=false) => { const id = node(c),rank = g.ranks[id],clock = Number(c.fen().split(' ')[4]); if (rank === -2) throw Error('Actual structure absent from graph'); return {id,rank,outcome:c.isGameOver() || rank === -1 ? 'safe' : clock+rank <= 100 && (irreversible || uniqueHistory(c)) ? 'losing' : 'unknown'}; };
export const priority = e => e.evidence?.experiment === 'E128' ? 183 : inherited(e);
export function explainMove(input) {
  const enabled = input.lockedStructureTags === undefined ? false : input.lockedStructureTags;
  if (typeof enabled !== 'boolean') throw Error('lockedStructureTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxLockedStructureNodes === undefined ? 500000 : input.maxLockedStructureNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 500000) throw Error('maxLockedStructureNodes must be integer0..500000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('locked-structure-budget'); };
  const done = () => ({...base,schema:'coach-concepts-E128-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    lockedStructureAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen); for (const move of h?.moves || []) { tick(); c.move(move); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),old = units(c),wp = old.filter(p => p.type === 'p' && p.color === 'w'),bp = old.filter(p => p.type === 'p' && p.color === 'b');
    if (old.length !== 4 || wp.length !== 1 || bp.length !== 1 || wp[0].square[0] !== bp[0].square[0] || before.split(' ')[2] !== '-' || before.split(' ')[3] !== '-') { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen(); if (after !== base.after) throw Error('Parent locked structure differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    if (m.captured || m.promotion) { status = 'not-quiet'; return done(); }
    const now = units(c),pair = Object.fromEntries(now.filter(p => p.type === 'p').map(p => [p.color,p.square]));
    if (Number(pair.b[1])-Number(pair.w[1]) !== 1) { status = 'not-locked'; return done(); }
    const additions = [],add = (id,text) => additions.push({id,text,qualityClaim:false,evidence:{experiment:'E128',before,after,detail:{source:'lockedStructureAnalysis.witness'}}});
    if (m.piece === 'p' && Math.abs(Number(m.to[1])-Number(m.from[1])) === 1) {
      const defender = c.turn(),graph = buildGraph(pair,defender,{tick}),actual = outcome(c,graph,true);
      witness = {experiment:'E128',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),kind:'fixation',graph,actual,opposite:null,escape:null};
      if (actual.outcome !== 'losing') return done();
      tick(); const fields = before.split(' '); fields[1] = defender; fields[3] = '-'; let fresh;
      try { fresh = legalPosition(fields.join(' ')); } catch { /* No escape comparison from an illegal frame. */ }
      const target = actor === 'w' ? bp[0].square : wp[0].square,escapeCode = target+target[0]+(Number(target[1])+(defender === 'w' ? 1 : -1));
      const escape = {fen:fields.join(' '),legal:!!fresh,terminal:fresh ? fresh.isGameOver() : null,moves:[],move:null,after:null,graph:null,result:null}; witness.escape = escape;
      if (fresh && !fresh.isGameOver()) {
        escape.moves = ordered(fresh).map(uci); const e = ordered(fresh).find(x => uci(x) === escapeCode && x.piece === 'p' && !x.captured && !x.promotion);
        if (e) { tick(); fresh.move(e); escape.move = uci(e); escape.after = fresh.fen();
          if (!fresh.isGameOver()) { const p = Object.fromEntries(units(fresh).filter(x => x.type === 'p').map(x => [x.color,x.square])); escape.graph = buildGraph(p,defender,{tick}); escape.result = outcome(fresh,escape.graph,true); }
        }
      }
      if (escape.result?.outcome !== 'safe') return done();
      add('causal-blocked-pawn-fixation',`Pawn fixation: ${m.san} removes an escape; the blocked pawn is forced to be captured first, whereas its prior advance was graph-safe.`);
      const flip = after.split(' '); flip[1] = actor; flip[3] = '-'; let other;
      try { other = legalPosition(flip.join(' ')); } catch { /* A checking push cannot prove turn-independent weakness. */ }
      witness.opposite = {fen:flip.join(' '),legal:!!other,terminal:other ? other.isGameOver() : null,result:other && !other.isGameOver() ? outcome(other,graph,true) : null};
      if (witness.opposite.result?.outcome === 'losing') {
        add('locked-static-pawn-weakness',`Static weakness: the pawn locked by ${m.san} is forcibly captured first with either side to move; its earlier escape was graph-safe.`);
        add('locked-structural-pawn-weakness',`Structural weakness: ${m.san} creates an immobile pawn target whose first capture is forced with either turn; the earlier pawn escape was graph-safe.`);
      }
    } else if (m.piece === 'k') {
      const graph = buildGraph(pair,actor,{tick}),actual = outcome(c,graph); c.undo(); const options = ordered(c),alternatives = [];
      witness = {experiment:'E128',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,played:uci(m),kind:'guard',graph,actual,moves:options.map(uci),alternatives,unique:null};
      for (const choice of options) {
        tick(); c.move(choice);
        try { alternatives.push({move:uci(choice),fen:c.fen(),captured:choice.captured || null,terminal:c.isGameOver(),result:choice.captured ? {id:null,rank:null,outcome:'safe'} : outcome(c,graph)}); }
        finally { c.undo(); }
      }
      c.move(input.move); const safe = alternatives.filter(x => x.result.outcome === 'safe');
      if (actual.outcome === 'safe' && safe.length === 1 && safe[0].move === uci(m) && alternatives.length > 1 && alternatives.every(x => x.move === uci(m) || x.result.outcome === 'losing')) {
        witness.unique = uci(m); add('unique-locked-pawn-penetration-guard',`Penetration guard: ${m.san} is the only legal move preventing your blocked pawn from being captured first in this locked-pawn model.`);
      }
    } else { status = 'not-applicable'; return done(); }
    if (additions.length) { tick(); if (additions.some(e => e.text.split(/\s+/).length > 24)) throw Error('Comment exceeds24words'); events = [...base.events,...additions]; status = 'proven'; }
  } catch (e) { if (e.message !== 'locked-structure-budget') throw e; witness = null; events = base.events; status = 'exhausted'; }
  return done();
}

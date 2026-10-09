import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {explainMove as parent,priority as inherited} from '../../E115-opening-mate-offers/code/offers.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const codeOrder = (a,b) => uci(a).localeCompare(uci(b));
const central = s => 'cdef'.includes(s[0]) && +s[1] >= 3 && +s[1] <= 6;
const profile = c => units(c).filter(p => p.type === 'p' && central(p.square));
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
function frame(c,remove,put,tick) {
  tick(); const changed = legalPosition(c.fen()); for (const s of remove) changed.remove(s);
  if (put) changed.put({type:put.type,color:put.color},put.square);
  const fields = changed.fen().split(' '); fields[3] = '-';
  let p; try { p = legalPosition(fields.join(' ')); } catch { return {legal:false,fen:fields.join(' '),moves:[]}; }
  tick(); return {legal:true,fen:p.fen(),moves:p.moves({verbose:true}).sort(codeOrder).map(uci)};
}
export const priority = e => e.evidence?.experiment === 'E116' ? 108 : inherited(e);
export function explainMove(input) {
  const enabled = input.centerRestraintTags === undefined ? false : input.centerRestraintTags;
  if (typeof enabled !== 'boolean') throw Error('centerRestraintTags must be boolean');
  if (!enabled) return parent(input);
  const limit = input.maxCenterRestraintNodes === undefined ? 50000 : input.maxCenterRestraintNodes;
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxCenterRestraintNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('center-restraint-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E116-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    centerRestraintAnalysis:{limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent center restraint differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    tick(); const rootMoves = c.moves({verbose:true}).sort(codeOrder),inventory = units(c);
    witness = {experiment:'E116',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san,captured:m.captured || null,promotion:m.promotion || null},
      inventory,rootMoves:rootMoves.map(uci),control:null,fluid:[],selectedFluid:null,restraint:null,entries:[],selectedEntry:null};
    if (!m.captured && !m.promotion && m.piece !== 'k' && before.split(' ')[2] === '-' && after.split(' ')[2] === '-') {
      const targets = ['d4','e4','d5','e5'].filter(s => c.attackers(s,actor).includes(m.to));
      if (targets.length) {
        const removed = frame(c,[m.to],null,tick),restored = frame(c,[m.to],{square:m.from,type:m.piece,color:actor},tick),king = inventory.find(p => p.type === 'k' && p.color !== actor).square;
        const denied = targets.map(square => ({square,move:king+square})).filter(x => !witness.rootMoves.includes(x.move) && removed.legal && restored.legal && removed.moves.includes(x.move) && restored.moves.includes(x.move));
        witness.control = {targets,removed,restored,king,denied};
      }
    }
    const oldProfile = profile(c);
    for (const reply of rootMoves.filter(m => m.piece === 'p')) {
      tick(); c.move(reply); let next; try { next = profile(c); } finally { c.undo(); }
      if ((central(reply.from) || central(reply.to)) && JSON.stringify(next) !== JSON.stringify(oldProfile)) witness.fluid.push({move:uci(reply),from:reply.from,profile:next});
    }
    for (let i = 0; i < witness.fluid.length && witness.selectedFluid === null; i++) for (let j = i+1; j < witness.fluid.length; j++) {
      tick(); if (witness.fluid[i].from !== witness.fluid[j].from && JSON.stringify(witness.fluid[i].profile) !== JSON.stringify(witness.fluid[j].profile)) { witness.selectedFluid = [i,j]; break; }
    }
    const advance = m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0];
    if (advance) {
      const target = m.to[0]+(+m.to[1]+(actor === 'w' ? 1 : -1)),p = c.get(target);
      if (p?.type === 'p' && p.color !== actor && !rootMoves.some(x => x.from === target)) {
        const removed = frame(c,[m.to],null,tick),released = removed.legal ? removed.moves.filter(x => x.slice(0,2) === target) : [];
        const rows = [];
        for (const reply of rootMoves) {
          tick(); c.move(reply);
          try { rows.push({move:uci(reply),fen:c.fen(),retained:c.get(target)?.type === 'p' && c.get(target)?.color !== actor && c.get(m.to)?.type === 'p' && c.get(m.to)?.color === actor}); }
          finally { c.undo(); }
        }
        const fixed = released.length > 0 && rows.every(r => r.retained),bishops = [];
        if (fixed) for (const bishop of inventory.filter(p => p.color === actor && p.type === 'b' && (p.square.charCodeAt(0)+ +p.square[1])%2 === (target.charCodeAt(0)+ +target[1])%2)) {
          const branches = []; let success = true;
          for (const reply of rootMoves) {
            tick(); c.move(reply);
            try {
              const terminal = c.isGameOver(),capture = terminal ? null : c.moves({verbose:true}).find(x => x.from === bishop.square && x.to === target && x.captured === 'p');
              let proof = null,post = null;
              if (capture) { const pre = legalPosition(c.fen()); c.move(capture); try { post = c.fen(); proof = certifyCapture(pre,c,capture,budget); } finally { c.undo(); } }
              branches.push({reply:uci(reply),terminal,capture:capture ? uci(capture) : null,post,proof});
              if (!proof) { success = false; break; }
            } finally { c.undo(); }
          }
          bishops.push({square:bishop.square,branches,success}); if (success) break;
        }
        witness.restraint = {target,removed,released,rows,fixed,bishops};
      }
      if (central(m.from)) for (const entrant of inventory.filter(p => p.color === actor && !['k','p'].includes(p.type))) {
        const branches = []; let success = true;
        for (const reply of rootMoves) {
          tick(); c.move(reply);
          try {
            const terminal = c.isGameOver(),entry = terminal ? null : c.moves({verbose:true}).find(x => x.from === entrant.square && x.to === m.from && !x.captured);
            let post = null,responses = [],safe = false;
            if (entry) { c.move(entry); try { post = c.fen(); tick(); responses = c.moves({verbose:true}).sort(codeOrder).map(x => ({move:uci(x),victim:victim(x)})); safe = !c.isGameOver() && responses.every(x => x.victim !== m.from); } finally { c.undo(); } }
            branches.push({reply:uci(reply),terminal,entry:entry ? uci(entry) : null,post,responses,safe});
            if (!safe) { success = false; break; }
          } finally { c.undo(); }
        }
        witness.entries.push({square:entrant.square,type:entrant.type,target:m.from,branches,success});
        if (success) { witness.selectedEntry = witness.entries.length-1; break; }
      }
    }
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E116',before,after,detail:{source:'centerRestraintAnalysis.witness'}}}); };
    if (witness.control?.denied.length) add('causal-central-king-flight-control',`Central control: ${m.san} denies king entry to ${witness.control.denied.map(x => x.square).join('/')}; removing or restoring only the moved piece permits those entries.`);
    if (witness.selectedFluid) add('fluid-legal-central-pawn-choices',`Fluid center: ${witness.fluid[witness.selectedFluid[0]].move} and ${witness.fluid[witness.selectedFluid[1]].move} are legal choices leaving different central pawn placements; their strategic quality remains unassessed.`);
    if (witness.restraint?.fixed) add('causal-enemy-pawn-restraint',`Pawn restraint: ${m.san} blocks ${witness.restraint.target} for the opponent's current turn; every reply preserves the lock, while removing your blocker releases that pawn.`);
    if (witness.restraint?.bishops.some(x => x.success)) add('bishop-color-pawn-fixation',`Bishop-color fixation: ${m.san} restrains ${witness.restraint.target}; after every opponent reply, your same-color bishop can capture that pawn with positive immediate net material gain.`);
    if (witness.selectedEntry !== null) add('new-all-reply-piece-entry',`Entry square: ${m.san} vacates ${m.from}; after every opponent reply, the recorded piece can enter there without any immediate legal enemy capture of it.`);
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'center-restraint-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

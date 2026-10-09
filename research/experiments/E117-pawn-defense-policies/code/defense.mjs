import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E116-center-restraint-entry/code/center.mjs';
const units = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
export const priority = e => e.evidence?.experiment === 'E117' ? 172 : inherited(e);
export function explainMove(input) {
  const enabled = input.pawnDefenseTags === undefined ? false : input.pawnDefenseTags;
  if (typeof enabled !== 'boolean') throw Error('pawnDefenseTags must be boolean');
  if (!enabled) return parent(input);
  const H = input.pawnCoverPlies === undefined ? 1 : input.pawnCoverPlies;
  const limit = input.maxPawnDefenseNodes === undefined ? 50000 : input.maxPawnDefenseNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 4) throw Error('pawnCoverPlies must be integer0..4');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPawnDefenseNodes must be integer0..50000');
  const base = parent(input); let nodes = 0,status = 'no-new-fact',witness = null,events = base.events;
  const tick = () => { if (++nodes > limit) throw Error('pawn-defense-budget'); },budget = {tick};
  const done = () => ({...base,schema:'coach-concepts-E117-prototype',events,
    comment:events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    pawnDefenseAnalysis:{plies:H,limit,nodes,status,witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') { status = 'not-applicable'; return done(); }
  try {
    tick(); const h = validateHistory(input),c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { tick(); c.move(code); }
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    const before = c.fen(),actor = c.turn(),kingBefore = units(c).find(p => p.color === actor && p.type === 'k').square;
    if (units(c).length > 10) { status = 'not-applicable'; return done(); }
    const m = c.move(input.move),after = c.fen();
    if (after !== base.after) throw Error('Parent pawn defense differs');
    if (c.isGameOver()) { status = 'not-live'; return done(); }
    tick(); const army = units(c),replies = ordered(c);
    witness = {experiment:'E117',before,after,actor,history:h ? {fen:h.start,moves:h.moves} : null,
      played:{move:uci(m),from:m.from,to:m.to,piece:m.piece,san:m.san,captured:m.captured || null,promotion:m.promotion || null},
      inventory:army,rootMoves:replies.map(uci),pawns:[],selectedPawn:null,cover:null};
    for (const pawn of army.filter(p => p.color !== actor && p.type === 'p')) {
      const trial = {square:pawn.square,branches:[],success:true}; witness.pawns.push(trial);
      for (const reply of replies) {
        tick(); c.move(reply);
        try {
          const terminal = c.isGameOver(),retained = c.get(pawn.square)?.type === 'p' && c.get(pawn.square)?.color !== actor;
          const captures = terminal || !retained ? [] : ordered(c).filter(x => x.to === pawn.square && x.captured === 'p' && !x.isEnPassant());
          const row = {reply:uci(reply),fen:c.fen(),terminal,retained,captures:captures.map(uci),trials:[],selected:null}; trial.branches.push(row);
          for (const capture of captures) {
            tick(); const pre = legalPosition(c.fen()); c.move(capture);
            try { row.trials.push({move:uci(capture),post:c.fen(),proof:certifyCapture(pre,c,capture,budget)}); }
            finally { c.undo(); }
            if (row.trials.at(-1).proof) { row.selected = row.trials.length-1; break; }
          }
          if (row.selected === null) { trial.success = false; break; }
        } finally { c.undo(); }
      }
      if (trial.success) { witness.selectedPawn = witness.pawns.length-1; break; }
    }
    const king = army.find(p => p.color === actor && p.type === 'k').square,dir = actor === 'w' ? 1 : -1;
    const cover = army.filter(p => p.color === actor && p.type === 'p' && Math.abs(p.square.charCodeAt(0)-king.charCodeAt(0)) <= 1 && [1,2].includes((+p.square[1]-+king[1])*dir)).map(p => p.square);
    if (m.piece === 'p' && !m.captured && !m.promotion && m.from[0] === m.to[0] && king === kingBefore && king === king[0]+(actor === 'w' ? '1' : '8') && 'ceg'.includes(king[0]) && before.split(' ')[2] === '-' && after.split(' ')[2] === '-' && !c.isCheck() && cover.includes(m.to)) {
      const enemy = c.turn(),run = p => query(p,enemy,H,budget);
      const x = {king,members:cover,actual:run(c),fresh:null,removed:null}; witness.cover = x;
      if (!x.actual.tree.win) {
        x.fresh = run(legalPosition(after));
        if (!x.fresh.tree.win) {
          const changed = legalPosition(after); for (const square of cover) changed.remove(square);
          const fields = changed.fen().split(' '); fields[3] = '-'; let removed;
          try { removed = legalPosition(fields.join(' ')); } catch { /* Illegal frames supply no causal claim. */ }
          x.removed = {fen:fields.join(' '),legal:!!removed,proof:removed ? run(removed) : null};
        }
      }
    }
    const extra = [],add = (id,text) => { tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words'); extra.push({id,text,qualityClaim:false,evidence:{experiment:'E117',before,after,detail:{source:'pawnDefenseAnalysis.witness'}}}); };
    if (witness.selectedPawn !== null) add('all-defense-profitable-pawn-capture',`Pawn weakness: after every legal defense, the pawn on ${witness.pawns[witness.selectedPawn].square} remains capturable with positive net material through every immediate reply.`);
    if (witness.cover?.removed?.proof?.tree.win) add('causal-bounded-pawn-cover',`Pawn cover: ${cover.join('/')} prevents this ${H}-ply enemy mate; removing only those cover pawns permits it. Broader king safety remains unassessed.`);
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'pawn-defense-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

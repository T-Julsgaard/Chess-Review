import {legalPosition, uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {conversionQuery} from '../../E106-ending-conversion-policies/code/policy.mjs';
import {explainMove as parent, priority as inherited} from '../../E111-pawn-chain-mating-constraints/code/constraints.mjs';

const units = c => c.board().flat().filter(Boolean);
export const priority = e => e.evidence?.experiment === 'E112' ? 172 : inherited(e);
const moveRecord = m => ({move: uci(m), piece: m.piece, from: m.from, to: m.to,
  captured: m.captured || null, promotion: m.promotion || null, san: m.san});

function fresh(fen, removed, baseline, run, baselineRemoved = removed) {
  const c = legalPosition(fen), b = legalPosition(baseline);
  for (const square of removed) c.remove(square);
  // Removed-square correspondence is supplied explicitly for before/after.
  for (const square of baselineRemoved) b.remove(square);
  const fields = c.fen().split(' '); fields[3] = '-';
  let frame;
  try { frame = legalPosition(fields.join(' ')); }
  catch { return {legal: false, fen: fields.join(' '), baselineFen: b.fen(), proof: null}; }
  return {legal: true, fen: frame.fen(), baselineFen: b.fen(), proof: run(frame, b.fen())};
}

export function explainMove(input) {
  const enabled = input.pawnTempoTags === undefined ? false : input.pawnTempoTags;
  if (typeof enabled !== 'boolean') throw Error('pawnTempoTags must be boolean');
  if (!enabled) return parent(input);
  const H = input.pawnTempoPlies === undefined ? 4 : input.pawnTempoPlies;
  const limit = input.maxPawnTempoNodes === undefined ? 50000 : input.maxPawnTempoNodes;
  if (!Number.isSafeInteger(H) || H < 0 || H > 6) throw Error('pawnTempoPlies must be integer0..6');
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50000) throw Error('maxPawnTempoNodes must be integer0..50000');
  const base = parent(input);
  let nodes = 0, status = 'no-new-fact', witness = null, events = base.events;
  const budget = {tick() { if (++nodes > limit) throw Error('pawn-tempo-budget'); }};
  const done = () => ({...base, schema: 'coach-concepts-E112-prototype', events,
    comment: events === base.events ? base.comment : [...events].sort((a,b) => priority(b)-priority(a))[0]?.text || null,
    pawnTempoAnalysis: {plies: H, limit, nodes, status, witness}});
  if (base.error || base.foundationAnalysis && base.foundationAnalysis.status !== 'accepted') {
    status = 'not-applicable'; return done();
  }
  try {
    budget.tick();
    const h = validateHistory(input), c = legalPosition(h?.start || input.fen);
    for (const code of h?.moves || []) { budget.tick(); c.move(code); }
    if (c.isGameOver() || c.isCheck()) { status = 'not-live'; return done(); }
    const before = c.fen(), actor = c.turn(), men = units(c);
    const pawns = men.filter(p => p.type === 'p' && p.color === actor).map(p => p.square).sort();
    if (men.length < 4 || men.length > 6 || pawns.length < 2 || men.some(p => !['k','p'].includes(p.type)) || before.split(' ')[2] !== '-') {
      status = 'not-applicable'; return done();
    }
    const legal = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
    const kingMoves = legal.filter(m => m.piece === 'k');
    const captures = legal.filter(m => m.piece === 'p' && m.captured === 'p');
    const played = c.move(input.move), after = c.fen();
    if (after !== base.after) throw Error('Parent pawn tempo differs');
    if (played.captured || played.promotion || c.isGameOver() || c.isCheck()) {
      status = 'not-quiet'; return done();
    }
    const pairs = captures.filter(m => !m.isEnPassant() && c.get(m.from)?.type === 'p' && c.get(m.from)?.color === actor &&
      c.get(m.to)?.type === 'p' && c.get(m.to)?.color !== actor).map(m => ({from:m.from,to:m.to}));
    witness = {experiment:'E112', before, after, actor, played:moveRecord(played),
      history:h ? {fen:h.start,moves:h.moves} : null, pawns, rootMoves:legal.map(uci),
      kingMoves:kingMoves.map(uci), captures:captures.map(uci), preservedPairs:pairs, trials:[], selected:{spare:null,tension:null}};
    for (const pawn of pawns) {
      budget.tick();
      const tracked = pawn === played.from ? played.to : pawn;
      const trial = {pawn,tracked,actual:conversionQuery(c,actor,tracked,H,budget,before),
        pass:null,strippedPass:null,strippedActual:null,kings:[],exchanges:[],spare:false,tension:false};
      witness.trials.push(trial);
      if (!trial.actual.win) continue;
      const alt = code => {
        c.undo(); const m = c.move(code); let proof;
        try { proof = conversionQuery(c,actor,m.from === pawn ? m.to : pawn,H,budget,before); }
        finally { c.undo(); c.move(input.move); }
        return {move:code,proof};
      };
      if (played.piece === 'p' && pawn !== played.from && kingMoves.length && witness.selected.spare === null) {
        const fields = before.split(' '); fields[1] = actor === 'w' ? 'b' : 'w'; fields[3] = '-';
        const run = (position, baseline) => conversionQuery(position,actor,pawn,H,budget,baseline);
        trial.pass = fresh(fields.join(' '),[],before,run);
        if (trial.pass.legal && trial.pass.proof.win) {
          trial.strippedPass = fresh(fields.join(' '),[played.from],before,run);
          trial.strippedActual = fresh(after,[played.to],before,run,[played.from]);
          if (trial.strippedPass.legal && trial.strippedPass.proof.win && trial.strippedActual.legal && trial.strippedActual.proof.win) {
            for (const m of kingMoves) { budget.tick(); const q = alt(uci(m)); trial.kings.push(q); if (!q.proof.win) break; }
            trial.spare = trial.kings.some(q => !q.proof.win);
          }
        }
      }
      if (pairs.length && witness.selected.tension === null) {
        for (const m of captures) { budget.tick(); trial.exchanges.push(alt(uci(m))); }
        trial.tension = trial.exchanges.length > 0 && trial.exchanges.every(q => !q.proof.win);
      }
      if (trial.spare) witness.selected.spare = witness.trials.length-1;
      if (trial.tension) witness.selected.tension = witness.trials.length-1;
      if (witness.selected.spare !== null && witness.selected.tension !== null) break;
    }
    const extra = [], add = (id,text,trial) => {
      budget.tick(); if (text.split(/\s+/).length > 24) throw Error('Comment exceeds24words');
      extra.push({id,text,qualityClaim:false,evidence:{experiment:'E112',before,after,detail:{trial}}});
    };
    if (witness.selected.spare !== null) {
      add('conversion-spare-pawn-tempo',`Spare pawn move: ${played.san} preserves this ${H}-ply conversion without needing that pawn; a recorded king alternative fails the same goal.`,witness.selected.spare);
      add('conversion-passing-move',`Passing move: ${played.san} preserves the demonstrated ${H}-ply conversion available with the opponent to move; the moved pawn is dispensable.`,witness.selected.spare);
    }
    if (witness.selected.tension !== null) add('conversion-maintained-pawn-tension',
      `Maintaining tension: ${played.san} retains an available pawn exchange and achieves this ${H}-ply conversion; every available pawn capture fails that same goal.`,witness.selected.tension);
    if (extra.length) { events = [...base.events,...extra]; status = 'proven'; }
  } catch (e) {
    if (e.message !== 'pawn-tempo-budget') throw e;
    events = base.events; witness = null; status = 'exhausted';
  }
  return done();
}

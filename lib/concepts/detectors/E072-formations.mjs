import {Chess} from '../../chess.js';
import {legalPosition} from './E020-concepts.mjs';
import {explainMove as parent, priority as prior} from './E071-octopus.mjs';

const uci = m => m.from + m.to + (m.promotion || '');
function play(c, move) {
  const before = c.fen(), m = c.move(move);
  return {move: uci(m), san: m.san, from: m.from, to: m.to, piece: m.piece,
    color: m.color, captured: m.captured || null, promotion: m.promotion || null,
    before, after: c.fen()};
}
const reverse = (s, color) => s[0] + (color === 'w' ? s[1] : 9 - Number(s[1]));
const pawn = (c, s, color) => c.get(s)?.type === 'p' && c.get(s)?.color === color;
function flags(c, cells, color) {
  return {present: cells.filter(s => pawn(c, s, color)), check: c.isCheck(),
    checkmate: c.isCheckmate(), stalemate: c.isStalemate(), draw: c.isDraw(),
    gameOver: c.isGameOver()};
}
function counter(c, target, sources, color, tick) {
  tick();
  const frame = new Chess(c.fen()), removed = frame.get(target);
  frame.remove(target); frame.put({type: 'n', color: color === 'w' ? 'b' : 'w'}, target);
  const fields = frame.fen().split(' '); fields[1] = color; fields[3] = '-';
  let legal;
  try { legal = legalPosition(fields.join(' ')); if (legal.isGameOver()) return null; }
  catch { return null; }
  const counterFen = legal.fen(), captures = [];
  for (const m of legal.moves({verbose: true}).filter(m => m.piece === 'p' && m.to === target && m.captured === 'n')) {
    tick(); captures.push(play(legal, uci(m))); legal.undo();
  }
  if (!sources.every(s => captures.some(m => m.from === s))) return null;
  return {target, sources, removed: removed ? {type: removed.type, color: removed.color} : null, counterFen, captures};
}
// Identifiers survive movement and promotion; en-passant removes the actual victim.
function reconstruct(input, color, tick) {
  const c = new Chess(input.history?.fen || input.fen), history = [], ids = new Map();
  for (const p of c.board().flat().filter(Boolean)) ids.set(p.square, p.color + p.type + p.square);
  const d = reverse('d2', color), enemy = color === 'w' ? 'b' : 'w', cs = reverse('c7', color);
  const dId = pawn(c, d, color) ? ids.get(d) : null, cId = pawn(c, cs, enemy) ? ids.get(cs) : null;
  let pending = null, exchange = null;
  if (input.history) for (let ply = 0; ply < input.history.moves.length; ply++) {
    tick();
    const move = input.history.moves[ply], from = move.slice(0, 2), id = ids.get(from), actor = c.get(from);
    const record = play(c, move), victim = record.captured ? (record.piece === 'p' && record.from[0] !== record.to[0] && !ids.has(record.to) ? record.to[0] + record.from[1] : record.to) : null;
    const capturedId = victim ? ids.get(victim) : null;
    if (pending && capturedId === pending.actorId && record.to === pending.capture.to && actor.type !== 'p' && actor.color !== pending.capture.color)
      exchange = {firstPly: pending.ply, capture: pending.capture, recapturePly: ply, recapture: record, order: pending.actorId === dId ? 'own-d-takes-enemy-c' : 'enemy-c-takes-own-d'};
    pending = dId && cId && record.piece === 'p' && ((id === dId && capturedId === cId) || (id === cId && capturedId === dId)) ? {actorId: id, capture: record, ply} : null;
    if (victim) ids.delete(victim); ids.delete(from); ids.set(record.to, id);
    history.push(record);
  }
  if (!dId || !cId || [...ids.values()].includes(dId) || [...ids.values()].includes(cId)) exchange = null;
  return {c, history, exchange};
}
export const priority = e => e.id === 'stonewall-structure' ? 101.008 : e.id === 'maroczy-bind' ? 101.009 : prior(e);
export function explainMove(input) {
  const enabled = input.formationTags ?? false, limit = input.maxFormationNodes ?? 50000;
  if (typeof enabled !== 'boolean') throw Error('formationTags must be boolean');
  if (!Number.isInteger(limit) || limit < 0 || limit > 50000) throw Error('maxFormationNodes must be an integer from 0 to 50000');
  const base = parent(input); if (!enabled) return base;
  let nodes = 0, status = 'ineligible'; const extra = [], tick = () => { if (++nodes > limit) throw Error('formation-budget'); };
  try {
    tick(); const color = new Chess(input.fen).turn(), {c, history, exchange} = reconstruct(input, color, tick);
    const before = new Chess(c.fen()), played = play(c, input.move); tick();
    if (played.piece === 'p' && !c.isGameOver()) {
      for (const kind of ['stonewall-structure', 'maroczy-bind']) {
        const cells = (kind === 'stonewall-structure' ? ['c3','d4','e3','f4'] : ['c4','e4']).map(s => reverse(s, color));
        if (!cells.includes(played.to) || !cells.every(s => pawn(c, s, color)) || cells.every(s => pawn(before, s, color))) continue;
        const target = reverse('d5', color);
        if (kind === 'maroczy-bind' && (!exchange || c.get(target) || c.board().flat().some(p => p?.type === 'p' && ((p.color === color && p.square[0] === 'd') || (p.color !== color && p.square[0] === 'c'))))) continue;
        const specs = kind === 'stonewall-structure' ? [['d4',['c3','e3']],['f4',['e3']]] : [['d5',['c4','e4']]];
        const frames = specs.map(([t, ss]) => counter(c, reverse(t, color), ss.map(s => reverse(s, color)), color, tick));
        if (frames.some(f => !f)) { status = 'no-legal-support-control'; continue; }
        const replies = [];
        for (const m of c.moves({verbose: true})) { tick(); const response = play(c, uci(m)); replies.push({response, ...flags(c, cells, color)}); c.undo(); }
        const evidence = {history, played, cells, counterframes: frames, exchange: kind === 'maroczy-bind' ? exchange : null, replies};
        const text = kind === 'stonewall-structure'
          ? `Stonewall structure: ${cells.join('/')}; ${cells[0]} and ${cells[2]} support ${cells[1]}, while ${cells[2]} supports ${cells[3]}.`
          : `${color === 'w' ? 'Maroczy bind' : 'Reversed Maroczy bind'}: ${cells[0]} and ${cells[1]} control ${target} after the recorded d-pawn/c-pawn exchange.`;
        extra.push({id: kind, qualityClaim: false, text, evidence}); status = 'proven';
      }
    }
  } catch (error) { if (error.message !== 'formation-budget') throw error; extra.length = 0; status = 'exhausted'; }
  const events = [...base.events, ...extra], comment = [...events].sort((a,b) => priority(b) - priority(a))[0]?.text || null;
  if (comment && comment.split(/\s+/).length > 24) throw Error('Comment exceeds 24 words');
  return {...base, schema: 'coach-concepts-v53', events, comment, formationAnalysis: {limit, nodes, status}};
}

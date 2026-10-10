import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
const units = c => c.board().flat().filter(Boolean);
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const square = i => 'abcdefgh'[i%8]+(Math.floor(i/8)+1);
const idOf = c => { const k = Object.fromEntries(units(c).filter(p => p.type === 'k').map(p => [p.color,p.square])),n = s => 'abcdefgh'.indexOf(s[0])+8*(Number(s[1])-1); return (c.turn() === 'b' ? 4096 : 0)+64*n(k.w)+n(k.b); };
const edgesCache = new Map(),checked = new Set();
function reconstruct(pair,defender) {
  const key = JSON.stringify([pair,defender]); if (edgesCache.has(key)) return edgesCache.get(key);
  const all = Array(8192).fill(null);
  for (let id = 0; id < 8192; id++) {
    const turn = id < 4096 ? 'w' : 'b',w = square(Math.floor((id%4096)/64)),b = square(id%64);
    if (w === b || [pair.w,pair.b].includes(w) || [pair.w,pair.b].includes(b)) continue;
    let c; try { c = legalPosition(boardFen({[w]:'K',[b]:'k',[pair.w]:'P',[pair.b]:'p'},turn)); } catch { continue; }
    all[id] = [];
    for (const m of ordered(c)) {
      assert.equal(m.piece,'k'); assert.equal(m.from,turn === 'w' ? w : b);
      const to = 'abcdefgh'.indexOf(m.to[0])+8*(Number(m.to[1])-1),wi = Math.floor((id%4096)/64),bi = id%64;
      all[id].push(m.captured ? m.color === defender ? -2 : -1 : turn === 'w' ? 4096+64*to+bi : 64*wi+to);
    }
  }
  edgesCache.set(key,all); return all;
}
export function checkGraph(g) {
  const hash = createHash('sha256').update(JSON.stringify(g)).digest('hex'); if (checked.has(hash)) return true;
  assert.equal(g.schema,'locked-first-capture-v1'); assert.ok(['w','b'].includes(g.defender));
  assert.match(g.pair.w,/^[a-h][2-6]$/); assert.equal(g.pair.b,g.pair.w[0]+(Number(g.pair.w[1])+1));
  assert.equal(g.ranks.length,8192); assert.ok(g.ranks.every(n => Number.isSafeInteger(n) && (n === -2 || n === -1 || n > 0 && n <= 8192)));
  const all = reconstruct(g.pair,g.defender); let states = 0,edges = 0,winning = 0,safe = 0,maxRank = -1;
  for (const [id,out] of all.entries()) {
    const rank = g.ranks[id]; if (!out) { assert.equal(rank,-2); continue; }
    states++; edges += out.length; assert.notEqual(rank,-2); const turn = id < 4096 ? 'w' : 'b',own = turn !== g.defender;
    for (const child of out) if (child >= 0) assert.notEqual(g.ranks[child],-2);
    if (rank > 0) {
      winning++; maxRank = Math.max(maxRank,rank); assert.ok(out.length);
      if (own) { const bounds = out.filter(child => child === -1 || child >= 0 && g.ranks[child] > 0).map(child => child === -1 ? 1 : g.ranks[child]+1); assert.ok(bounds.length); assert.equal(rank,Math.min(...bounds)); }
      else { assert.ok(out.every(child => child >= 0 && g.ranks[child] > 0)); assert.equal(rank,1+Math.max(...out.map(child => g.ranks[child]))); }
    } else {
      safe++; assert.equal(rank,-1);
      if (own) assert.ok(out.every(child => child === -2 || child >= 0 && g.ranks[child] === -1));
      else assert.ok(!out.length || out.some(child => child === -2 || child >= 0 && g.ranks[child] === -1));
    }
  }
  assert.deepEqual(g.counts,{states,edges,winning,safe,maxRank}); checked.add(hash); return true;
}
export function checkWitness(w,r,f) {
  const a = r.correspondenceAnalysis; assert.equal(a.limit,f.maxCorrespondenceNodes ?? 250000); assert.ok(a.nodes > 0 && a.nodes <= a.limit);
  const h = validateHistory(f),c = legalPosition(h?.start || f.fen),position = () => c.fen().split(' ').slice(0,4).join(' '),seen = new Set([position()]);
  for (const move of h?.moves || []) { c.move(move); assert.ok(!seen.has(position())); seen.add(position()); }
  assert.equal(w.experiment,'E127'); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.deepEqual(w.history,h ? {fen:h.start,moves:h.moves} : null); assert.ok(!c.isGameOver());
  const old = units(c),wp = old.filter(p => p.type === 'p' && p.color === 'w'),bp = old.filter(p => p.type === 'p' && p.color === 'b');
  assert.equal(old.length,4); assert.equal(wp.length,1); assert.equal(bp.length,1); assert.equal(bp[0].square,wp[0].square[0]+(Number(wp[0].square[1])+1)); assert.equal(c.fen().split(' ')[2],'-'); assert.equal(c.fen().split(' ')[3],'-');
  const m = c.move(f.move); assert.equal(w.played,uci(m)); assert.equal(w.after,c.fen()); assert.equal(r.after,c.fen()); assert.ok(!seen.has(position())); assert.ok(!c.isGameOver() && m.piece === 'k' && !m.captured);
  const g = w.graph; assert.deepEqual(g.pair,{w:wp[0].square,b:bp[0].square}); assert.equal(g.defender,c.turn()); checkGraph(g);
  function responses(row) {
    assert.equal(row.fen,c.fen()); assert.equal(row.actorSquare,units(c).find(p => p.type === 'k' && p.color === w.actor).square);
    const moves = ordered(c); assert.deepEqual(row.moves,moves.map(uci)); assert.equal(row.replies.length,moves.length); const safe = [],unknown = [];
    for (const [i,reply] of moves.entries()) {
      c.move(reply);
      try {
        const terminal = c.isGameOver(),rank = reply.captured ? null : g.ranks[idOf(c)],clock = Number(c.fen().split(' ')[4]); assert.notEqual(rank,-2);
        const history = c.history({verbose:true}),positions = [history[0].before,...history.map(m => m.after)].map(fen => fen.split(' ').slice(0,4).join(' '));
        const outcome = terminal || reply.captured || rank === -1 ? 'safe' : clock+rank <= 100 && new Set(positions).size === positions.length ? 'losing' : 'unknown';
        assert.deepEqual(row.replies[i],{move:uci(reply),to:reply.to,captured:reply.captured || null,fen:c.fen(),terminal,rank,outcome});
        if (outcome === 'safe') safe.push(uci(reply)); if (outcome === 'unknown') unknown.push(uci(reply));
      } finally { c.undo(); }
    }
    assert.deepEqual(row.safe,safe); assert.deepEqual(row.unknown,unknown);
    const unique = !unknown.length && safe.length === 1 && row.replies.some(t => t.outcome === 'losing') && !row.replies.find(t => t.move === safe[0]).captured && !row.replies.find(t => t.move === safe[0]).terminal ? safe[0] : null;
    assert.equal(row.unique,unique); return unique;
  }
  const unique = responses(w.actual); let linked = null;
  if (!unique) { assert.deepEqual(w.followMoves,[]); assert.deepEqual(w.follow,[]); }
  else {
    c.move(unique);
    try {
      const choices = ordered(c); assert.deepEqual(w.followMoves,choices.map(uci)); assert.equal(w.follow.length,choices.length);
      for (const [i,choice] of choices.entries()) { const row = w.follow[i]; assert.equal(row.move,uci(choice)); c.move(choice);
        try { assert.equal(row.terminal,c.isGameOver()); assert.equal(row.captured,choice.captured || null);
          if (row.terminal || choice.captured) assert.equal(row.responses,null);
          else { const next = responses(row.responses); if (next && row.responses.actorSquare !== w.actual.actorSquare && next.slice(2,4) !== unique.slice(2,4) && linked === null) linked = i; }
        } finally { c.undo(); }
      }
    } finally { c.undo(); }
  }
  assert.equal(w.linked,linked); const expected = [];
  if (linked !== null) { const text = `Corresponding squares: ${m.san} requires ${unique.slice(2,4)}; a linked king-response system avoids losing the first pawn in this locked-pawn model.`; assert.ok(text.split(/\s+/).length <= 24); expected.push({id:'locked-pawn-corresponding-square-system',text,qualityClaim:false,evidence:{experiment:'E127',before:w.before,after:w.after,detail:{source:'correspondenceAnalysis.witness'}}}); }
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E127'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); return true;
}

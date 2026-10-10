import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {checkGraph} from '../../E127-locked-pawn-correspondence/code/check-witness.mjs';
const units = c => c.board().flat().filter(Boolean);
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const idOf = c => { const k = Object.fromEntries(units(c).filter(p => p.type === 'k').map(p => [p.color,p.square])),n = s => 'abcdefgh'.indexOf(s[0])+8*(Number(s[1])-1); return (c.turn() === 'b' ? 4096 : 0)+64*n(k.w)+n(k.b); };
function classify(c,g,irreversible=false) {
  const id = idOf(c),rank = g.ranks[id]; assert.notEqual(rank,-2);
  const h = c.history({verbose:true}),positions = h.length ? [h[0].before,...h.map(m => m.after)].map(f => f.split(' ').slice(0,4).join(' ')) : [];
  const available = irreversible || new Set(positions).size === positions.length;
  return {id,rank,outcome:c.isGameOver() || rank === -1 ? 'safe' : Number(c.fen().split(' ')[4])+rank <= 100 && available ? 'losing' : 'unknown'};
}
export function checkWitness(w,r,f) {
  const a = r.lockedStructureAnalysis; assert.equal(a.limit,f.maxLockedStructureNodes ?? 500000); assert.ok(a.nodes > 0 && a.nodes <= a.limit);
  const h = validateHistory(f),c = legalPosition(h?.start || f.fen); for (const move of h?.moves || []) c.move(move);
  assert.equal(w.experiment,'E128'); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.deepEqual(w.history,h ? {fen:h.start,moves:h.moves} : null); assert.ok(!c.isGameOver());
  const old = units(c),wp = old.filter(p => p.type === 'p' && p.color === 'w'),bp = old.filter(p => p.type === 'p' && p.color === 'b');
  assert.equal(old.length,4); assert.equal(wp.length,1); assert.equal(bp.length,1); assert.equal(wp[0].square[0],bp[0].square[0]); assert.equal(c.fen().split(' ')[2],'-'); assert.equal(c.fen().split(' ')[3],'-');
  const m = c.move(f.move); assert.equal(w.played,uci(m)); assert.equal(w.after,c.fen()); assert.equal(r.after,c.fen()); assert.ok(!m.captured && !m.promotion && !c.isGameOver());
  const pair = Object.fromEntries(units(c).filter(p => p.type === 'p').map(p => [p.color,p.square])); assert.equal(Number(pair.b[1])-Number(pair.w[1]),1);
  assert.deepEqual(w.graph.pair,pair); checkGraph(w.graph); const expected = [],add = (id,text) => expected.push({id,text,qualityClaim:false,evidence:{experiment:'E128',before:w.before,after:w.after,detail:{source:'lockedStructureAnalysis.witness'}}});
  if (m.piece === 'p') {
    assert.equal(w.kind,'fixation'); assert.equal(Math.abs(Number(m.to[1])-Number(m.from[1])),1); const defender = c.turn(); assert.equal(w.graph.defender,defender); assert.deepEqual(w.actual,classify(c,w.graph,true));
    if (w.actual.outcome !== 'losing') { assert.equal(w.escape,null); assert.equal(w.opposite,null); }
    else {
      const e = w.escape; assert.ok(e); const fields = w.before.split(' '); fields[1] = defender; fields[3] = '-'; assert.equal(e.fen,fields.join(' ')); let fresh;
      try { fresh = legalPosition(fields.join(' ')); } catch { /* Independently enforce frame legality. */ }
      assert.equal(e.legal,!!fresh); assert.equal(e.terminal,fresh ? fresh.isGameOver() : null);
      const target = w.actor === 'w' ? bp[0].square : wp[0].square,code = target+target[0]+(Number(target[1])+(defender === 'w' ? 1 : -1));
      const moves = fresh && !fresh.isGameOver() ? ordered(fresh) : []; assert.deepEqual(e.moves,moves.map(uci)); const escape = moves.find(x => uci(x) === code && x.piece === 'p' && !x.captured && !x.promotion);
      if (!escape) { assert.equal(e.move,null); assert.equal(e.after,null); assert.equal(e.graph,null); assert.equal(e.result,null); }
      else { assert.equal(e.move,uci(escape)); fresh.move(escape); assert.equal(e.after,fresh.fen());
        if (fresh.isGameOver()) { assert.equal(e.graph,null); assert.equal(e.result,null); }
        else { assert.ok(e.graph); assert.equal(e.graph.defender,defender); assert.deepEqual(e.graph.pair,Object.fromEntries(units(fresh).filter(p => p.type === 'p').map(p => [p.color,p.square]))); checkGraph(e.graph); assert.deepEqual(e.result,classify(fresh,e.graph,true)); }
      }
      if (e.result?.outcome !== 'safe') assert.equal(w.opposite,null);
      else {
        add('causal-blocked-pawn-fixation',`Pawn fixation: ${m.san} removes an escape; the blocked pawn is forced to be captured first, whereas its prior advance was graph-safe.`);
        const opposite = w.opposite; assert.ok(opposite); const flip = w.after.split(' '); flip[1] = w.actor; flip[3] = '-'; assert.equal(opposite.fen,flip.join(' ')); let frame;
        try { frame = legalPosition(flip.join(' ')); } catch { /* Checking pushes need not have a legal opposite turn. */ }
        assert.equal(opposite.legal,!!frame); assert.equal(opposite.terminal,frame ? frame.isGameOver() : null);
        assert.deepEqual(opposite.result,frame && !frame.isGameOver() ? classify(frame,w.graph,true) : null);
        if (opposite.result?.outcome === 'losing') {
          add('locked-static-pawn-weakness',`Static weakness: the pawn locked by ${m.san} is forcibly captured first with either side to move; its earlier escape was graph-safe.`);
          add('locked-structural-pawn-weakness',`Structural weakness: ${m.san} creates an immobile pawn target whose first capture is forced with either turn; the earlier pawn escape was graph-safe.`);
        }
      }
    }
  } else {
    assert.equal(m.piece,'k'); assert.equal(w.kind,'guard'); assert.equal(w.graph.defender,w.actor); assert.deepEqual(w.actual,classify(c,w.graph)); c.undo();
    const options = ordered(c); assert.deepEqual(w.moves,options.map(uci)); assert.equal(w.alternatives.length,options.length);
    for (const [i,choice] of options.entries()) { c.move(choice); try { assert.deepEqual(w.alternatives[i],{move:uci(choice),fen:c.fen(),captured:choice.captured || null,terminal:c.isGameOver(),result:choice.captured ? {id:null,rank:null,outcome:'safe'} : classify(c,w.graph)}); } finally { c.undo(); } }
    c.move(f.move); const others = w.alternatives.filter(x => x.move !== w.played),unique = w.actual.outcome === 'safe' && others.length > 0 && others.every(x => x.result.outcome === 'losing') ? w.played : null;
    assert.equal(w.unique,unique); if (unique) add('unique-locked-pawn-penetration-guard',`Penetration guard: ${m.san} is the only legal move preventing your blocked pawn from being captured first in this locked-pawn model.`);
  }
  assert.ok(expected.every(e => e.text.split(/\s+/).length <= 24)); assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E128'),expected); assert.equal(a.status,expected.length ? 'proven' : 'no-new-fact'); return true;
}

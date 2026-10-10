import assert from 'node:assert/strict';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
const pieces = c => c.board().flat().filter(Boolean).map(({square,type,color}) => ({square,type,color})).sort((a,b) => a.square.localeCompare(b.square));
const shade = s => ('abcdefgh'.indexOf(s[0])+Number(s[1]))%2 === 1 ? 0 : 1;
const summary = (c,actor) => { const squares = pieces(c).filter(p => p.color === actor && p.type === 'n').map(p => p.square),dark = squares.filter(s => shade(s) === 0).length; return {squares,dark,parity:dark%2}; };
export function checkWitness(w,r,f) {
  const a = r.knightTempoAnalysis,N = f.knightTempoMoves ?? 3; assert.equal(a.moves,N); assert.equal(a.limit,f.maxKnightTempoNodes ?? 50000); assert.ok(a.nodes > 0 && a.nodes <= a.limit); assert.ok(Number.isSafeInteger(N) && N >= 3 && N <= 9 && N%2 === 1);
  const h = validateHistory(f); assert.ok(h && h.records.length >= 2*N-2); const c = legalPosition(h.start); for (const move of h.moves) c.move(move);
  assert.equal(w.experiment,'E129'); assert.equal(w.before,c.fen()); assert.equal(w.actor,c.turn()); assert.ok(!c.isGameOver()); assert.deepEqual(w.history,{fen:h.start,moves:h.moves});
  const m = c.move(f.move); assert.equal(w.played,uci(m)); assert.equal(w.after,c.fen()); assert.equal(r.after,c.fen()); assert.ok(!c.isGameOver() && m.piece === 'n' && !m.captured && !m.promotion);
  const graph = w.graph,offsets = [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]]; assert.equal(graph.schema,'knight-bipartite-v1'); assert.equal(graph.rows.length,64); let edges = 0,dark = 0,light = 0;
  for (let i = 0; i < 64; i++) {
    const x = i%8,y = Math.floor(i/8),s = 'abcdefgh'[x]+(y+1),destinations = offsets.map(([dx,dy]) => [x+dx,y+dy]).filter(([a,b]) => a >= 0 && a < 8 && b >= 0 && b < 8).map(([a,b]) => 'abcdefgh'[a]+(b+1)).sort();
    assert.deepEqual(graph.rows[i],{square:s,color:shade(s),destinations}); assert.ok(destinations.every(to => shade(to) !== shade(s))); edges += destinations.length; if (shade(s) === 0) dark++; else light++;
  }
  assert.equal(edges,336); assert.deepEqual({edges:graph.edges,dark:graph.dark,light:graph.light},{edges,dark,light});
  const segmentIndex = h.records.length-(2*N-2),expectedSegment = [...h.records.slice(segmentIndex).map(x => ({before:x.before,after:x.after,m:x.move})),{before:w.before,after:w.after,m}].map(x => ({before:x.before,after:x.after,move:uci(x.m),from:x.m.from,to:x.m.to,piece:x.m.piece,color:x.m.color,captured:x.m.captured || null,promotion:x.m.promotion || null,san:x.m.san}));
  assert.equal(w.moves,N); assert.equal(w.segmentIndex,segmentIndex); assert.deepEqual(w.segment,expectedSegment); const root = legalPosition(expectedSegment[0].before),start = pieces(root),finish = pieces(c);
  assert.equal(w.root,root.fen()); assert.ok([...start,...finish].every(p => ['k','p','n'].includes(p.type))); assert.ok(start.some(p => p.color === w.actor && p.type === 'n'));
  assert.ok([w.root,w.after].every(fen => fen.split(' ')[2] === '-' && fen.split(' ')[3] === '-'));
  const enemyBefore = start.filter(p => p.color !== w.actor),enemyAfter = finish.filter(p => p.color !== w.actor),fixedBefore = start.filter(p => p.color === w.actor && p.type !== 'n'),fixedAfter = finish.filter(p => p.color === w.actor && p.type !== 'n');
  assert.deepEqual(enemyBefore,enemyAfter); assert.deepEqual(fixedBefore,fixedAfter); assert.deepEqual(w.enemyBefore,enemyBefore); assert.deepEqual(w.enemyAfter,enemyAfter); assert.deepEqual(w.fixedBefore,fixedBefore); assert.deepEqual(w.fixedAfter,fixedAfter);
  const transitions = [];
  for (const [i,step] of expectedSegment.entries()) {
    assert.ok(!step.captured && !step.promotion); assert.equal(step.color,i%2 === 0 ? w.actor : w.actor === 'w' ? 'b' : 'w');
    if (i%2 === 1) { assert.notEqual(step.piece,'p'); continue; }
    assert.equal(step.piece,'n'); const before = summary(legalPosition(step.before),w.actor),after = summary(legalPosition(step.after),w.actor);
    assert.equal(before.squares.length,after.squares.length); assert.equal(before.parity,1-after.parity); assert.notEqual(shade(step.from),shade(step.to)); assert.ok(graph.rows.some(row => row.square === step.from && row.destinations.includes(step.to)));
    transitions.push({move:step.move,fromColor:shade(step.from),toColor:shade(step.to),before,after});
  }
  assert.equal(transitions.length,N); assert.deepEqual(w.transitions,transitions); const initial = summary(root,w.actor),final = summary(c,w.actor);
  assert.deepEqual(w.initial,initial); assert.deepEqual(w.final,final); assert.equal(initial.squares.length,final.squares.length); assert.equal(initial.parity,1-final.parity); assert.notDeepEqual(initial.squares,final.squares);
  assert.deepEqual(w.state,{before:w.root.split(' ').slice(1),after:w.after.split(' ').slice(1)});
  const text = `Knight tempo constraint: your opponent returned, but ${N} knight moves cannot restore your knights' squares; a knight-only return requires an even count.`; assert.ok(text.split(/\s+/).length <= 24);
  assert.deepEqual(r.events.filter(e => e.evidence?.experiment === 'E129'),[{id:'knight-only-odd-tempo-impossibility',text,qualityClaim:false,evidence:{experiment:'E129',before:w.before,after:w.after,detail:{source:'knightTempoAnalysis.witness'}}}]); assert.equal(a.status,'proven'); return true;
}

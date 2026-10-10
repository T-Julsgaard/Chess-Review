// Deterministic authored development family; no external positions or game input.
import {openResearchData} from '../../../data-policy.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {buildGraph,vertex} from './graph.mjs';
const data = await openResearchData(['D001'],{purpose:'test'}),pair = {w:'d4',b:'d5'};
let nodes = 0; const graph = buildGraph(pair,'b',{tick(){nodes++; if (nodes > 250000) throw Error('Discovery budget');}});
const square = i => 'abcdefgh'[i%8]+(Math.floor(i/8)+1),candidates = [];
function row(c) {
  const all = c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b))),safe = [];
  for (const m of all) { c.move(m); try { const men = c.board().flat().filter(Boolean),w = men.find(p => p.type === 'k' && p.color === 'w').square,b = men.find(p => p.type === 'k' && p.color === 'b').square; if (m.captured || c.isGameOver() || graph.ranks[vertex(w,b,c.turn())] === -1) safe.push(m); } finally { c.undo(); } }
  return safe.length === 1 && !safe[0].captured && all.length > 1 ? safe[0] : null;
}
for (let id = 4096; id < 8192 && candidates.length < 3; id++) {
  if (graph.ranks[id] !== -1) continue;
  const w = square(Math.floor((id%4096)/64)),b = square(id%64); let c;
  try { c = legalPosition(boardFen({[w]:'K',[b]:'k',d4:'P',d5:'p'},'b')); } catch { continue; }
  const first = row(c); if (!first) continue;
  c.move(first); let linked = null;
  for (const m of c.moves({verbose:true})) { if (m.captured) continue; c.move(m); try { const next = row(c); if (next && m.to !== w && next.to !== first.to) { linked = {move:uci(m),reply:uci(next)}; break; } } finally { c.undo(); } }
  c.undo(); if (!linked) continue;
  // Find a distinct legal actor king origin for the actual entry.
  for (let origin = 0; origin < 64; origin++) {
    const from = square(origin); if ([w,b,'d4','d5'].includes(from)) continue; let pre;
    try { pre = legalPosition(boardFen({[from]:'K',[b]:'k',d4:'P',d5:'p'})); } catch { continue; }
    if (pre.moves({verbose:true}).some(m => m.from === from && m.to === w && !m.captured)) { candidates.push({fen:pre.fen(),move:from+w,reply:uci(first),linked}); break; }
  }
}
await mkdir('research/runs/E127',{recursive:true});
await writeFile('research/runs/E127/discovery.json',JSON.stringify({family:pair,eligibilityReceipt:data.receipt,graphNodes:nodes,counts:graph.counts,candidates})+'\n');
console.log(JSON.stringify({family:pair,graphNodes:nodes,counts:graph.counts,candidates}));

import {mkdir,writeFile} from 'node:fs/promises';
import {openResearchData} from '../../../data-policy.mjs';
import {boardFen} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {buildGraph,vertex} from '../../E127-locked-pawn-correspondence/code/graph.mjs';
const data = await openResearchData(['D001'],{purpose:'test'}); let nodes = 0;
const budget = {tick(){ if (++nodes > 500000) throw Error('Discovery budget'); }};
const actual = buildGraph({w:'d4',b:'d5'},'b',budget),escape = buildGraph({w:'d3',b:'d4'},'b',budget),candidates = [],partial = [];
const square = i => 'abcdefgh'[i%8]+(Math.floor(i/8)+1);
for (let wi = 0; wi < 64; wi++) for (let bi = 0; bi < 64; bi++) {
  const w = square(wi),b = square(bi),a = vertex(w,b,'b'),opposite = vertex(w,b,'w');
  if (actual.ranks[a] <= 0 || escape.ranks[opposite] !== -1) continue;
  if ([w,b].some(s => ['d3','d4','d5'].includes(s)) || w === b) continue;
  let pre,fresh;
  try { pre = legalPosition(boardFen({[w]:'K',[b]:'k',d3:'P',d5:'p'})); fresh = legalPosition(boardFen({[w]:'K',[b]:'k',d3:'P',d5:'p'},'b')); pre.move('d3d4'); fresh.move('d5d4'); } catch { continue; }
  if (pre.isGameOver() || fresh.isGameOver()) continue;
  const row = {fen:boardFen({[w]:'K',[b]:'k',d3:'P',d5:'p'}),move:'d3d4',actualRank:actual.ranks[a],oppositeRank:actual.ranks[opposite],escapeRank:escape.ranks[opposite]};
  if (row.oppositeRank > 0 && candidates.length < 4) candidates.push(row); else if (row.oppositeRank <= 0 && partial.length < 2) partial.push(row);
}
await mkdir('research/runs/E128',{recursive:true});
await writeFile('research/runs/E128/discovery.json',JSON.stringify({eligibilityReceipt:data.receipt,nodes,actual:actual.counts,escape:escape.counts,candidates,partial})+'\n');
console.log(JSON.stringify({nodes,actual:actual.counts,escape:escape.counts,candidates,partial}));

const square = i => 'abcdefgh'[i%8]+(Math.floor(i/8)+1);
const index = s => s.charCodeAt(0)-97+8*(Number(s[1])-1);
const distance = (a,b) => Math.max(Math.abs(a%8-b%8),Math.abs(Math.floor(a/8)-Math.floor(b/8)));
const pawnAttack = (pawn,target,color) => Math.abs(pawn%8-target%8) === 1 && Math.floor(target/8)-Math.floor(pawn/8) === (color === 'w' ? 1 : -1);
export const vertex = (w,b,turn) => (turn === 'b' ? 4096 : 0)+index(w)*64+index(b);
export function buildGraph(pair,defender,budget) {
  const wp = index(pair.w),bp = index(pair.b),ranks = Array(8192).fill(-2),edges = Array(8192),parents = Array.from({length:8192},() => []),remaining = Array(8192).fill(0),highest = Array(8192).fill(0),queue = [];
  let states = 0,edgeCount = 0;
  for (let id = 0; id < 8192; id++) {
    budget.tick(); const turn = id < 4096 ? 'w' : 'b',w = Math.floor((id%4096)/64),b = id%64;
    if (w === wp || w === bp || b === wp || b === bp || distance(w,b) <= 1 || pawnAttack(turn === 'w' ? wp : bp,turn === 'w' ? b : w,turn)) continue;
    states++; ranks[id] = -1; const from = turn === 'w' ? w : b,enemy = turn === 'w' ? b : w,ownPawn = turn === 'w' ? wp : bp,enemyPawn = turn === 'w' ? bp : wp,enemyColor = turn === 'w' ? 'b' : 'w',out = [];
    for (let to = 0; to < 64; to++) {
      if (distance(from,to) !== 1 || to === ownPawn || distance(to,enemy) <= 1 || pawnAttack(enemyPawn,to,enemyColor)) continue;
      budget.tick(); const child = to === enemyPawn ? turn === defender ? -2 : -1 : (turn === 'w' ? vertex(square(to),square(b),'b') : vertex(square(w),square(to),'w'));
      out.push(child); edgeCount++; if (child >= 0) parents[child].push(id);
    }
    edges[id] = out; remaining[id] = out.length;
    // Negative edge -1 is attacker first capture, -2 defender first capture.
    if (turn !== defender && out.includes(-1)) { ranks[id] = 1; queue.push(id); }
  }
  for (let head = 0; head < queue.length; head++) {
    const child = queue[head];
    for (const id of parents[child]) {
      budget.tick(); if (ranks[id] > 0) continue;
      const turn = id < 4096 ? 'w' : 'b';
      if (turn !== defender) { ranks[id] = ranks[child]+1; queue.push(id); }
      else { remaining[id]--; highest[id] = Math.max(highest[id],ranks[child]); if (!remaining[id] && edges[id].length) { ranks[id] = highest[id]+1; queue.push(id); } }
    }
  }
  for (let id = 0; id < 8192; id++) if (edges[id]) for (const child of edges[id]) if (child >= 0 && ranks[child] === -2) throw Error('Graph edge enters invalid state');
  return {schema:'locked-first-capture-v1',pair,defender,ranks,counts:{states,edges:edgeCount,winning:ranks.filter(n => n > 0).length,safe:ranks.filter(n => n === -1).length,maxRank:Math.max(...ranks)}};
}

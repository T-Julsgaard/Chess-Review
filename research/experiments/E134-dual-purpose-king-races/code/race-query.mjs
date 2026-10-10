import {uci,VALUES,legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const position = fen => fen.split(' ').slice(0,4).join(' ');
const distance = (a,b) => a && b ? Math.max(Math.abs(a.charCodeAt(0)-b.charCodeAt(0)),Math.abs(+a[1]-+b[1])) : 20;
const balance = (c,actor) => c.board().flat().filter(Boolean).reduce((n,p) => n+VALUES[p.type]*(p.color === actor ? 1 : -1),0);
const victim = m => m.captured ? m.isEnPassant() ? m.to[0]+m.from[1] : m.to : null;
function initialLedger(c) {
  const history = c.history({verbose:true}); let counts = new Map([[position(history[0]?.before || c.fen()),1]]);
  for (const m of history) { if (m.piece === 'p' || m.captured) counts = new Map(); const key = position(m.after); counts.set(key,(counts.get(key) || 0)+1); }
  return counts;
}
export function resourceQuery(c,actor,ownPawn,enemyPawn,plies,mode,budget,baselineFen) {
  if (!['combined','capture','queen'].includes(mode) || !Number.isSafeInteger(plies) || plies < 0 || plies > 10) throw Error('Invalid race query');
  const rootFen = c.fen(),initialBalance = balance(legalPosition(baselineFen),actor),nodes = {},memo = new Map(); let ledger = initialLedger(c),nextId = 0;
  const signature = () => JSON.stringify([...ledger].sort((a,b) => a[0].localeCompare(b[0])));
  function solve(ours,enemy,left) {
    budget.tick(); const fen = c.fen(),historySignature = signature(),key = JSON.stringify([fen,ours,enemy,left,mode,historySignature]);
    if (memo.has(key)) return memo.get(key);
    const id = nextId++,n = {fen,ours,enemy,left,historySignature},finish = extra => { nodes[id] = {...n,...extra}; memo.set(key,id); return id; };
    if (mode !== 'queen' && enemy === null && c.board().flat().filter(Boolean).every(p => p.color === actor || p.type === 'k')) return finish({kind:'stopped',win:true});
    if (c.isGameOver()) return finish({kind:'terminal',win:false,mate:c.isCheckmate(),draw:c.isDraw()});
    let probe = null; const p = ours && c.get(ours);
    if (mode !== 'capture' && p?.type === 'q' && p.color === actor && c.turn() !== actor) {
      probe = {gain:balance(c,actor)-initialBalance,replies:[],win:true};
      for (const m of c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)))) {
        budget.tick(); c.move(uci(m));
        try { const q = c.get(ours),good = q?.type === 'q' && q.color === actor && !c.isGameOver(); probe.replies.push({move:uci(m),after:c.fen(),gain:balance(c,actor)-initialBalance,good:!!good}); if (!good) probe.win = false; }
        finally { c.undo(); }
      }
      if (probe.win) return finish({kind:'queen',win:true,probe});
    }
    if (!left) return finish({kind:'limit',win:false,probe});
    const own = c.turn() === actor,moves = c.moves({verbose:true}),inventory = moves.map(uci).sort(),king = c.board().flat().find(p => p?.type === 'k' && p.color === actor).square;
    const score = m => {
      if (m.promotion === 'q') return -50;
      if (m.captured) return -40;
      if (!own) return m.piece === 'p' ? -20 : distance(m.to,ours);
      const nextKing = m.piece === 'k' ? m.to : king,nextPawn = m.from === ours ? m.to : ours;
      return mode === 'capture' ? distance(nextKing,enemy) : mode === 'queen' ? (m.from === ours ? -10 : distance(nextKing,nextPawn)) : distance(nextKing,enemy)+distance(nextKing,nextPawn);
    };
    moves.sort((a,b) => score(a)-score(b) || uci(a).localeCompare(uci(b))); const branches = [];
    for (const m of moves) {
      budget.tick(); const capturedSquare = victim(m); let a = ours,b = enemy;
      if (m.color === actor && m.from === ours) a = m.to; else if (m.color !== actor && capturedSquare === ours) a = null;
      if (m.color !== actor && m.from === enemy) b = m.to; else if (m.color === actor && capturedSquare === enemy) b = null;
      const previous = ledger; c.move(uci(m)); ledger = m.piece === 'p' || m.captured ? new Map() : new Map(ledger); const repetition = position(c.fen()); ledger.set(repetition,(ledger.get(repetition) || 0)+1);
      let child; try { child = solve(a,b,left-1); } finally { c.undo(); ledger = previous; }
      if (nodes[child].win === own) return finish({kind:own ? 'choice' : 'counterchoice',win:own,moves:inventory,probe,move:uci(m),child});
      branches.push({move:uci(m),child});
    }
    return finish({kind:own ? 'all-fail' : 'all',win:!own,moves:inventory,probe,branches:branches.sort((a,b) => a.move.localeCompare(b.move))});
  }
  const root = solve(ownPawn,enemyPawn,plies),used = new Set();
  const visit = id => { if (used.has(id)) return; used.add(id); const n = nodes[id]; if (n.child !== undefined) visit(n.child); for (const b of n.branches || []) visit(b.child); }; visit(root);
  return {rootFen,baselineFen,actor,ownPawn,enemyPawn,plies,mode,initialBalance,win:nodes[root].win,root,nodes:Object.fromEntries([...used].sort((a,b) => a-b).map(id => [id,nodes[id]]))};
}

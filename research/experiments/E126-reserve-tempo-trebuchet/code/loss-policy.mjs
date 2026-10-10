import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {certifyCapture} from '../../E022-move-tactics/code/tactics.mjs';
const ordered = c => c.moves({verbose:true}).sort((a,b) => uci(a).localeCompare(uci(b)));
const material = (c,color) => c.board().flat().filter(Boolean).reduce((n,p) => n+VALUES[p.type]*(p.color === color ? 1 : -1),0);
export function lossQuery(c,target,mode,budget) {
  if (!['all','king'].includes(mode)) throw Error('Invalid loss mode');
  budget.tick(); const loser = c.turn(),winner = loser === 'w' ? 'b' : 'w',baseline = material(c,winner),moves = ordered(c),options = moves.filter(m => mode === 'all' || m.piece === 'k');
  const out = {fen:c.fen(),loser,winner,target,mode,baseline,legalMoves:moves.map(uci),options:options.map(uci),rows:[],success:!!options.length};
  for (const m of options) {
    budget.tick(); c.move(m);
    try {
      const terminal = c.isGameOver(),offset = material(c,winner)-baseline,pawn = c.get(target),captures = terminal || pawn?.type !== 'p' || pawn.color !== loser ? [] : ordered(c).filter(x => x.piece === 'k' && x.captured === 'p' && x.to === target);
      const row = {move:uci(m),fen:c.fen(),terminal,offset,captures:[],success:false}; out.rows.push(row);
      for (const capture of captures) {
        budget.tick(); const before = legalPosition(c.fen()); c.move(capture);
        try { const proof = certifyCapture(before,c,capture,budget); row.captures.push({move:uci(capture),post:c.fen(),proof,net:proof ? proof.minimumGain+offset : null}); }
        finally { c.undo(); }
      }
      row.success = row.captures.some(t => t.proof && t.net > 0);
      if (!row.success) { out.success = false; break; }
    } finally { c.undo(); }
  }
  return out;
}

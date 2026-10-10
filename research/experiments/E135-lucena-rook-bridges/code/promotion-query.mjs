import {uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
const balance = (c,a) => c.board().flat().filter(Boolean).reduce((s,p)=>s+VALUES[p.type]*(p.color===a?1:-1),0);
export function promotionQuery(c,actor,pawn,plies,budget,baseline) {
  const rootFen=c.fen();
  function solve(unit,left) {
    budget.tick(); const n={fen:c.fen(),unit,left,probe:null};
    if(c.isGameOver()) return {...n,kind:'terminal',win:false,mate:c.isCheckmate(),draw:c.isDraw()};
    if(unit && c.get(unit)?.type==='q' && c.get(unit)?.color===actor && c.turn()!==actor) {
      const probe={gain:balance(c,actor)-baseline,replies:[],win:true};
      for(const m of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))) {
        budget.tick(); c.move(uci(m)); try {
          const q=c.get(unit),gain=balance(c,actor)-baseline,good=q?.type==='q' && q.color===actor && gain>=8 && !c.isGameOver();
          probe.replies.push({move:uci(m),after:c.fen(),gain,good:!!good}); if(!good)probe.win=false;
        } finally {c.undo();}
      }
      n.probe=probe; if(probe.gain>=8 && probe.win) return {...n,kind:'queen',win:true};
    }
    if(!left) return {...n,kind:'limit',win:false};
    const own=c.turn()===actor,moves=c.moves({verbose:true}),inventory=moves.map(uci).sort(),branches=[];
    const score=m=>m.promotion==='q'?-30:m.captured?-20:m.from===unit?-10:0;
    moves.sort((a,b)=>score(a)-score(b)||uci(a).localeCompare(uci(b)));
    for(const m of moves) {
      budget.tick(); let next=unit;
      if(m.color===actor && m.from===unit)next=m.to;
      else if(m.color!==actor && m.captured && m.to===unit)next=null;
      c.move(uci(m)); let child;try{child=solve(next,left-1);}finally{c.undo();}
      if(child.win===own)return {...n,kind:own?'choice':'counterchoice',win:own,moves:inventory,move:uci(m),child};
      branches.push({move:uci(m),child});
    }
    return {...n,kind:own?'all-fail':'all',win:!own,moves:inventory,branches:branches.sort((a,b)=>a.move.localeCompare(b.move))};
  }
  return {rootFen,actor,pawn,plies,baseline,tree:solve(pawn,plies)};
}

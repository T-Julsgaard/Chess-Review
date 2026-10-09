import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
const material=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0);
// One OR-goal minimax: losing the tracked pawn never rules out mate by another unit.
export function conversionQuery(c,actor,pawn,plies,budget,baselineFen=c.fen()){
 if(!['w','b'].includes(actor)||!Number.isSafeInteger(plies)||plies<0||plies>6)throw Error('Invalid conversion query');
 const unit=c.get(pawn);if(!unit||unit.type==='k'||unit.color!==actor)throw Error('Expected actor tracked pawn or promoted unit');
 const rootFen=c.fen(),initialBalance=material(legalPosition(baselineFen),actor);
 function solve(square,left){
  budget.tick();const fen=c.fen();
  if(c.isCheckmate())return{fen,kind:'mate',win:c.turn()!==actor,square};
  if(c.isDraw())return{fen,kind:'draw',win:false,square};
  let probe=null;const p=square&&c.get(square);
  if(p?.type==='q'&&p.color===actor&&c.turn()!==actor){
   const gain=material(c,actor)-initialBalance;probe={gain,responses:[],win:false};
   if(gain>0){let safe=true;for(const m of c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){
    budget.tick();c.move(m);try{const q=c.get(square),replyGain=material(c,actor)-initialBalance,good=q?.type==='q'&&q.color===actor&&replyGain>0&&!c.isGameOver();probe.responses.push({move:uci(m),fen:c.fen(),gain:replyGain,good:!!good});if(!good)safe=false;}finally{c.undo();}if(!safe)break;
   }probe.win=safe;}
   if(probe.win)return{fen,kind:'queen',win:true,square,probe};
  }
  if(!left)return{fen,kind:'limit',win:false,square,probe};
  const own=c.turn()===actor,moves=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),inventory=moves.map(uci),branches=[];
  for(const m of moves){budget.tick();let next=square;if(square&&m.color===actor&&m.from===square)next=m.to;else if(square&&m.color!==actor&&(m.to===square||(m.isEnPassant()&&m.to[0]+m.from[1]===square)))next=null;
   c.move(m);let child;try{child=solve(next,left-1);}finally{c.undo();}
   if(child.win===own)return{fen,square,probe,moves:inventory,kind:own?'choice':'counterchoice',win:own,move:uci(m),child};branches.push({move:uci(m),child});
  }
  if(!moves.length)throw Error('Unclassified conversion terminal');return{fen,square,probe,moves:inventory,kind:own?'all-fail':'all',win:!own,branches};
 }
 const tree=solve(pawn,plies);return{rootFen,baselineFen,actor,pawn,plies,initialBalance,win:tree.win,tree};
}

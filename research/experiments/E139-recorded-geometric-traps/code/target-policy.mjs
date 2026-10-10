import {uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
export const ordered=c=>c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
const material=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0);
// Complete finite target-loss panel, including all failed capture candidates.
export function targetPolicy(c,target,budget){
 budget.tick();const actor=c.turn()==='w'?'b':'w',baseline=material(c,actor),legal=ordered(c),live=!c.isGameOver(),rows=[];
 for(const defense of live?legal:[]){budget.tick();c.move(defense);try{
  const square=defense.from===target.square?defense.to:target.square,p=c.get(square),terminal=c.isGameOver(),captures=!terminal&&p?.color===target.color&&p.type===target.type?ordered(c).filter(m=>m.to===square&&m.captured===target.type):[];
  const row={move:uci(defense),fen:c.fen(),terminal,trackedSquare:square,captures:[],success:false,minimumGain:null};rows.push(row);
  for(const capture of captures){budget.tick();c.move(capture);try{
   const gain=material(c,actor)-baseline,draw=c.isDraw(),mate=c.isCheckmate(),counters=ordered(c),proof={move:uci(capture),fen:c.fen(),gain,draw,mate,legalCounters:counters.map(uci),counters:[],success:!draw&&gain>0,minimumGain:gain};row.captures.push(proof);
   for(const reply of counters){budget.tick();c.move(reply);try{const net=material(c,actor)-baseline,terminal=c.isGameOver();proof.counters.push({move:uci(reply),fen:c.fen(),gain:net,terminal});proof.minimumGain=Math.min(proof.minimumGain,net);if(terminal||net<=0)proof.success=false;}finally{c.undo();}}
  }finally{c.undo();}}
  row.success=row.captures.some(p=>p.success);if(row.success)row.minimumGain=Math.max(...row.captures.filter(p=>p.success).map(p=>p.minimumGain));
 }finally{c.undo();}}
 const success=live&&legal.length>0&&rows.every(r=>r.success);
 return {fen:c.fen(),actor,enemy:c.turn(),target,baseline,values:VALUES,live,legal:legal.map(uci),rows,success,minimumGain:success?Math.min(...rows.map(r=>r.minimumGain)):null};
}

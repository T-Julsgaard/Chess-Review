import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {tracedQuery} from './query.mjs';
const pieces=c=>c.board().flat().filter(Boolean).sort((a,b)=>a.square.localeCompare(b.square));
function edited(fen,fn){const c=legalPosition(fen);fn(c);return[c.fen().split(' ')[0],...fen.split(' ').slice(1)].join(' ');}
export const controlModel='fresh-board-frame-preserve-turn-clock; not played history';
export function collectCertificate(input,H,limit,reusedActual=null){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('coordination-budget');};tick();const h=validateHistory(input);if(!h)throw Error('history-prerequisite');const c=legalPosition(h.start);for(const m of h.moves){tick();c.move(m);}const before=c.fen(),actor=c.turn(),legal=c.moves({verbose:true}),played=c.move(input.move),after=c.fen();tick();
  const w={schema:'E144-coordination-certificate-v1',before,after,actor,history:input.history,played:uci(played),san:played.san,plies:H,controlModel,units:pieces(c).filter(p=>p.color===actor&&p.type!=='k').map(p=>({square:p.square,type:p.type})),actual:null,removals:[],relocations:[],core:null,claimContext:null,nodes:0};
  const finish=()=>{tick();w.nodes=nodes;return w;},assess=(board,context)=>{const q=tracedQuery(board,actor,H,tick);if(q.searchClaim)w.claimContext=context;return q;};
  if(reusedActual){for(const unused of reusedActual.searchTrace)tick();w.actual=reusedActual;if(reusedActual.searchClaim)w.claimContext={kind:'actual'};}else w.actual=assess(c,{kind:'actual'});
  if(w.claimContext||!w.actual.tree.win)return finish();
  for(const unit of w.units){
    tick();const row={...unit,fen:edited(after,c=>c.remove(unit.square)),status:'illegal-frame',query:null,necessary:null};w.removals.push(row);
    let board;try{board=legalPosition(row.fen);}catch{continue;}
    row.status='queried';row.query=assess(board,{kind:'removal',index:w.removals.length-1});row.necessary=!row.query.tree.win;if(w.claimContext)return finish();
  }
  for(const role of w.removals.filter(r=>r.necessary&&r.square!==played.to)){
    const options=legal.filter(m=>m.from===role.square&&!m.captured&&!m.promotion&&!/[+#]/.test(m.san)).sort((a,b)=>uci(a).localeCompare(uci(b)));
    for(const m of options){
      tick();const row={square:role.square,type:role.type,move:uci(m),destination:m.to,before:edited(before,c=>{const unit=c.remove(m.from);c.put(unit,m.to);}),after:null,status:'illegal-frame',query:null};w.relocations.push(row);
      let board;try{board=legalPosition(row.before);}catch{continue;}
      try{board.move(input.move);}catch{row.status='actual-move-unavailable';continue;}
      row.after=board.fen();row.status='queried';row.query=assess(legalPosition(row.after),{kind:'relocation',index:w.relocations.length-1});if(w.claimContext)return finish();
    }
  }
  tick();const kept=w.removals.filter(r=>r.necessary).map(r=>r.square),removed=w.units.filter(u=>!kept.includes(u.square)).map(u=>u.square),fen=edited(after,c=>{for(const sq of removed)c.remove(sq);});
  w.core={kept,removed,fen,status:'illegal-frame',query:null};let core;try{core=legalPosition(w.core.fen);}catch{return finish();}w.core.status='queried';w.core.query=assess(core,{kind:'core'});return finish();
}

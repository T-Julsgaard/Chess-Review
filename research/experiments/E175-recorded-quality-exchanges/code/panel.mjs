import {legalPosition,uci} from '../../E020-coach-concepts/code/concepts.mjs';import {describe,balance,flags} from '../../E153-second-target-defense/code/panel.mjs';
export function collectPanel(i,ctx,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('exchange-quality-budget');};tick();
  const p={schema:'E175-recorded-quality-exchange-panel-v1',config:{fen:i.fen,history:i.history,move:i.move,ownTarget:i.exchangeQualityOwnTarget,enemyTarget:i.exchangeQualityEnemyTarget,ownComparator:i.exchangeQualityOwnComparator,enemyComparator:i.exchangeQualityEnemyComparator},certificate:ctx.certificate,frames:[],nodes:0};
  for(const spec of ctx.frames){
    tick();const c=legalPosition(spec.history.fen);for(const m of spec.history.moves){tick();c.move(m);}const actor=c.turn(),state=()=>({fen:c.fen(),balance:balance(c,actor),flags:flags(c)}),legal=()=>c.isGameOver()?[]:c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),moves=legal(),frame={...spec,actor,baseline:balance(c,actor),pawns:c.board().flat().filter(p=>p?.type==='p').map(p=>({square:p.square,color:p.color})).sort((a,b)=>a.square.localeCompare(b.square)),legal:moves.map(describe),captures:[],claims:[]},claim=path=>{if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition())frame.claims.push(path.join('/')+'|'+c.fen());};
    for(const m of moves.filter(m=>describe(m).victim===spec.target)){
      tick();c.move(uci(m));claim([uci(m)]);const replies=legal(),capture={played:describe(m),state:state(),legal:replies.map(describe),counters:[]};
      for(const reply of replies){tick();c.move(uci(reply));claim([uci(m),uci(reply)]);capture.counters.push({played:describe(reply),state:state()});c.undo();}
      frame.captures.push(capture);c.undo();
    }
    p.frames.push(frame);
  }
  p.nodes=nodes;return p;
}

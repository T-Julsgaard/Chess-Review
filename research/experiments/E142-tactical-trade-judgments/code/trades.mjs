import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {query} from '../../E029-forced-mates/code/mates.mjs';
import {explainMove as parent,priority as inherited} from '../../E141-admitted-kqk-tablebases/code/tablebases.mjs';
export const priority=e=>e.evidence?.experiment==='E142'?187:inherited(e);
const balance=(c,actor)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===actor?1:-1),0);
function claim(c,n,tick){
  tick();if(n.kind==='draw')return c.isDrawByFiftyMoves()||c.isThreefoldRepetition();
  if(n.kind==='mate'||n.kind==='limit')return false;
  let found=false;
  for(const e of n.child?[{move:n.move,child:n.child}]:n.branches){tick();c.move(e.move);try{found=claim(c,e.child,tick)||found;}finally{c.undo();}}
  return found;
}
export function explainMove(input){
  const enabled=input.tacticalTradeTags===undefined?false:input.tacticalTradeTags;
  if(typeof enabled!=='boolean')throw Error('tacticalTradeTags must be boolean');
  if(!enabled)return parent(input);
  const limit=input.maxTradeNodes===undefined?50000:input.maxTradeNodes,H=input.tradeMatePlies===undefined?1:input.tradeMatePlies;
  if(!Number.isSafeInteger(limit)||limit<0||limit>50000)throw Error('maxTradeNodes must be integer0..50000');
  if(!Number.isSafeInteger(H)||H<0||H>2)throw Error('tradeMatePlies must be integer0..2');
  const base=parent(input);let nodes=0,status='no-exchange-context',witness=null,events=base.events;
  const tick=()=>{if(++nodes>limit)throw Error('trade-budget');};
  const done=()=>({...base,schema:'coach-concepts-E142-prototype',events,comment:events===base.events?base.comment:[...events].sort((a,b)=>priority(b)-priority(a))[0]?.text||null,tacticalTradeAnalysis:{limit,plies:H,nodes,status,witness}});
  if(base.error||base.foundationAnalysis&&base.foundationAnalysis.status!=='accepted'){status='not-applicable';return done();}
  try{
    tick();const h=validateHistory(input);if(!h?.records.length){status='history-prerequisite';return done();}
    const c=legalPosition(h.start);for(const move of h.moves){tick();c.move(move);}
    if(c.isGameOver()){status='not-live';return done();}
    const actor=c.turn(),opponent=actor==='w'?'b':'w',last=h.records.at(-1),v=last.move;
    if(v.color!==opponent||!['n','b','r','q'].includes(v.captured)||!['n','b','r','q'].includes(v.piece)||v.promotion||VALUES[v.captured]!==VALUES[v.piece])return done();
    const before=c.fen(),m=c.move(input.move),after=c.fen();c.undo();if(after!==base.after)throw Error('Parent trade differs');
    const legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
    witness={experiment:'E142',before,after,actor,history:{fen:h.start,moves:h.moves},played:uci(m),san:m.san,exchange:{prior:last.before,initiating:uci(v),square:v.to,lost:v.captured,capturer:v.piece,priorBalance:balance(legalPosition(last.before),actor)},moves:legal.map(uci),rows:[],claimContext:null};
    for(const option of legal){
      tick();const recapture=option.to===v.to&&option.captured===v.piece&&!option.promotion&&option.piece!=='p';c.move(uci(option));
      try{
        const row={move:uci(option),san:option.san,after:c.fen(),recapture,actor:query(c,actor,H,{tick}),opponent:query(c,opponent,H,{tick})};
        witness.rows.push(row);
        if(claim(c,row.actor.tree,tick)||claim(c,row.opponent.tree,tick)){witness.claimContext=row.move;status='claim-rule-prerequisite';return done();}
        if(row.actor.tree.win&&row.opponent.tree.win)throw Error('Contradictory mating proofs');
      }finally{c.undo();}
    }
    tick();const actual=witness.rows.find(r=>r.move===witness.played),keepWins=witness.rows.filter(r=>!r.recapture&&r.actor.tree.win),keepLosses=witness.rows.filter(r=>!r.recapture&&r.opponent.tree.win),tradeLosses=witness.rows.filter(r=>r.recapture&&r.opponent.tree.win),extra=[];
    const add=(id,text)=>{if(text.split(/\s+/).length>24)throw Error('Comment exceeds24words');extra.push({id,text,qualityClaim:false,evidence:{experiment:'E142',before,after,detail:{source:'tacticalTradeAnalysis.witness'}}});};
    if(actual.recapture&&actual.actor.tree.win&&keepLosses.length){
      add('tactical-good-trade',`Tactically good exchange: ${m.san} completes equal-value trades and forces mate within ${H} plies; ${keepLosses[0].san} instead allows forced mate.`);
      if(witness.exchange.priorBalance>0)add('tactical-trade-while-ahead',`Trading while nominally ahead: ${m.san} completes an equal-value exchange and forces mate; a recorded nonrecapture loses by force.`);
    }
    if(actual.recapture&&actual.opponent.tree.win&&keepWins.length)add('tactical-bad-trade',`Tactically bad exchange: ${m.san} allows forced mate within ${H} plies; ${keepWins[0].san} keeps the exchange incomplete and forces mate instead.`);
    if(!actual.recapture&&actual.actor.tree.win&&tradeLosses.length&&witness.exchange.priorBalance<0)add('tactical-keep-while-behind',`Keeping pieces while nominally behind: ${m.san} forces mate; ${tradeLosses[0].san} completes the equal-value exchange and allows forced mate instead.`);
    events=extra.length?[...base.events,...extra]:base.events;status=extra.length?'proven':'compared';
  }catch(e){if(e.message!=='trade-budget')throw e;witness=null;events=base.events;status='exhausted';}
  return done();
}

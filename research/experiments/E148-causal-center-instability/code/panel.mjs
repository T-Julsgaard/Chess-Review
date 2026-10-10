import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
export const zone=s=>'de'.includes(s[0])&&+s[1]>=3&&+s[1]<=6;
export const victim=m=>m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null;
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const flags=c=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()});
const support=(c,square,color)=>c.attackers(square,color).filter(s=>c.get(s).type==='p').sort();
const snapshot=c=>c.board().flat().filter(p=>p?.type==='p'&&zone(p.square)).sort((a,b)=>a.square.localeCompare(b.square)).map(p=>({square:p.square,color:p.color,support:support(c,p.square,p.color)}));
const describe=m=>({move:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:victim(m)});
export function collectPanel(input,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('center-instability-budget');};tick();const h=validateHistory(input);if(!h)throw Error('Full history required');const c=legalPosition(h.start);for(const move of h.moves){tick();c.move(move);}if(c.isGameOver())throw Error('History-terminal root');const from=input.move.slice(0,2),actor=c.turn(),source=c.get(from);tick();const beforeCenter=snapshot(c);tick();const legal=c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),choices=legal.filter(m=>m.from===from&&(source?.type==='p'&&'de'.includes(from[0])||m.captured==='p'&&zone(victim(m)))),panel={schema:'E148-complete-center-panel-v2',before:c.fen(),history:input.history,actor,from,sourceSupport:source?.type==='p'?support(c,from,actor):[],beforeCenter,legal:legal.map(describe),variants:[],claimContexts:[],nodes:0},seen=new Set();
  const record=(path)=>{if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition()){const key=path.join('/')+'|'+c.fen();if(!seen.has(key)){seen.add(key);panel.claimContexts.push(key);}}};
  function ledger(winner,baseline,path,moves=null){tick();const result={winner,baseline,afterGain:balance(c,winner)-baseline,afterFlags:flags(c),replies:[]};for(const m of Object.values(result.afterFlags).some(Boolean)?[]:moves||c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)))){tick();c.move(uci(m));try{record([...path,uci(m)]);result.replies.push({move:uci(m),san:m.san,fen:c.fen(),gain:balance(c,winner)-baseline,flags:flags(c)});}finally{c.undo();}}return result;}
  for(const m of choices){tick();const initial=balance(c,actor);c.move(uci(m));try{record([uci(m)]);tick();const center=snapshot(c),movedSupport=c.get(m.to)?.type==='p'?support(c,m.to,actor):[];tick();const replies=Object.values(flags(c)).some(Boolean)?[]:c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b))),row={...describe(m),after:c.fen(),flags:flags(c),center,movedSupport,legal:replies.map(describe),captureLedger:null,enemyCaptures:[]};
    if(m.captured==='p'&&zone(victim(m)))row.captureLedger=ledger(actor,initial,[uci(m)],replies);
    if(c.get(m.to)?.type==='p')for(const capture of replies.filter(r=>r.captured==='p'&&victim(r)===m.to)){tick();const winner=c.turn(),baseline=balance(c,winner);c.move(uci(capture));try{record([uci(m),uci(capture)]);row.enemyCaptures.push({...describe(capture),after:c.fen(),ledger:ledger(winner,baseline,[uci(m),uci(capture)])});}finally{c.undo();}}
    panel.variants.push(row);
  }finally{c.undo();}}
  panel.nodes=nodes;return panel;
}

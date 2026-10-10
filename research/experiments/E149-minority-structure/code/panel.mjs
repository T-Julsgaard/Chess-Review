import {legalPosition,uci,VALUES} from '../../E020-coach-concepts/code/concepts.mjs';
import {validateHistory} from '../../E024-transitions/code/transitions.mjs';
import {pawnFeatures} from '../../E021-structural-concepts/code/features.mjs';
export const victim=m=>m.captured?(m.isEnPassant()?m.to[0]+m.from[1]:m.to):null;
export const wing=s=>'abcd'.includes(s[0])?'abcd':'efgh';
export const structure=c=>Object.fromEntries(['w','b'].map(color=>{const f=pawnFeatures(c,color);return[color,{pawns:c.board().flat().filter(p=>p?.type==='p'&&p.color===color).map(p=>p.square).sort(),isolated:f.isolated,doubled:f.doubled}];}));
const balance=(c,color)=>c.board().flat().filter(Boolean).reduce((n,p)=>n+VALUES[p.type]*(p.color===color?1:-1),0);
const flags=c=>({mate:c.isCheckmate(),stalemate:c.isStalemate(),insufficient:c.isInsufficientMaterial(),fifty:c.isDrawByFiftyMoves(),threefold:c.isThreefoldRepetition()});
const describe=m=>({move:uci(m),san:m.san,from:m.from,to:m.to,piece:m.piece,captured:m.captured||null,promotion:m.promotion||null,enPassant:m.isEnPassant(),victim:victim(m)});
const sorted=c=>c.moves({verbose:true}).sort((a,b)=>uci(a).localeCompare(uci(b)));
export function collectPanel(input,limit){
  let nodes=0;const tick=()=>{if(++nodes>limit)throw Error('minority-structure-budget');};tick();const h=validateHistory(input);if(!h)throw Error('Full history required');const c=legalPosition(h.start);for(const move of h.moves){tick();c.move(move);}if(c.isGameOver())throw Error('History-terminal root');const actor=c.turn(),enemy=actor==='w'?'b':'w',from=input.move.slice(0,2),source=c.get(from);tick();const beforeStructure=structure(c);tick();const legal=sorted(c),choices=legal.filter(m=>m.from===from&&(source?.type==='p'||m.captured==='p'&&beforeStructure[enemy].isolated.includes(victim(m)))),p={schema:'E149-complete-structure-panel-v1',before:c.fen(),history:input.history,actor,from,beforeStructure,legal:legal.map(describe),variants:[],claimContexts:[],nodes:0},seen=new Set();
  const record=path=>{if(c.isDrawByFiftyMoves()||c.isThreefoldRepetition()){const k=path.join('/')+'|'+c.fen();if(!seen.has(k)){seen.add(k);p.claimContexts.push(k);}}};
  for(const m of choices){tick();const baseline=balance(c,actor);c.move(uci(m));try{record([uci(m)]);tick();const afterStructure=structure(c);tick();const terminal=flags(c),replies=Object.values(terminal).some(Boolean)?[]:sorted(c),row={...describe(m),after:c.fen(),flags:terminal,structure:afterStructure,legal:replies.map(describe),pawnCaptures:replies.filter(r=>r.piece==='p'&&r.captured==='p'&&victim(r)===m.to).map(describe),captureLedger:null};
    if(m.captured==='p'){tick();row.captureLedger={winner:actor,baseline,afterGain:balance(c,actor)-baseline,afterFlags:terminal,replies:[]};for(const reply of replies){tick();c.move(uci(reply));try{record([uci(m),uci(reply)]);row.captureLedger.replies.push({move:uci(reply),san:reply.san,fen:c.fen(),gain:balance(c,actor)-baseline,flags:flags(c)});}finally{c.undo();}}}p.variants.push(row);
  }finally{c.undo();}}
  p.nodes=nodes;return p;
}

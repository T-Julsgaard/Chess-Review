import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';import {Chess} from '../../../../lib/chess.js';
const ids=['causal-bishop-behind-pawn-chain','causal-passive-bishop','causal-color-mating-vulnerability','causal-dark-square-mate','attack-proven-chain-weakness'],make=(name,pieces,move='e2h2',expected=ids,extra={})=>({name,fen:boardFen(pieces),move,chainConstraintTags:true,chainMatePlies:2,expected,...extra}),p={h3:'K',e2:'Q',h1:'k',b8:'b',c7:'p',d6:'p'};
export const hypotheses=[make('terminal-chain',p,'e2h2',ids,{chainMatePlies:0}),make('two-ply-chain',p),make('long-chain',{...p,e5:'p'}),make('branched-chain',{...p,b6:'p'}),make('four-pawns',{...p,e5:'p',a7:'p'}),make('merged-components',{f1:'K',e2:'Q',h1:'k',b7:'b',c6:'p',d5:'p',a6:'p',b5:'p'},'e2g2',ids.map(id=>id.replace('dark-square','light-square')))];
hypotheses.push(make('second-component',{h3:'K',e2:'Q',h1:'k',d6:'b',c5:'p',b4:'p',e5:'p',f4:'p'}));
const hs=boardFen({...p,h3:null,h4:'K'}),hc=new Chess(hs);hc.move('h4h3');hc.move('d6d5');
const ps=boardFen({...p,h3:null,h4:'K',a7:'p'}),pc=new Chess(ps);pc.move('h4h3');pc.move('a7a6');
export const controls=[
 make('recorded-chain',p,'e2h2',ids,{fen:pc.fen(),history:{fen:ps,moves:['h4h3','a7a6']}}),
 make('pawn-captures-queen',{f3:'K',c2:'Q',f1:'k',c5:'b',b4:'p',a3:'p',d4:'p',e3:'p'},'c2f2',[]),
 make('extra-blocker',{...p,f4:'p'},'e2h2',[]),
 make('illegal-opening',{...p,h3:null,g3:'K'},'e2h2',[]),
 make('disconnected',{...p,d6:null,e6:'p'},'e2h2',[]),
 make('wrong-forward-direction',{h6:'K',e7:'Q',h8:'k',b1:'b',c2:'p',d3:'p'},'e7h7',[]),
 make('missing-bishop',{...p,b8:null},'e2h2',[]),
 make('extra-own-knight',{...p,a1:'N'},'e2h2',[]),
 make('wrong-king-entry',p,'h3g3',[]),
 make('capture-entry',{...p,h2:'p'},'e2h2',[]),
 make('nonterminal-alternative-mate',p,'e2f2',[]),
 make('nonmating-zero',p,'e2f2',[],{chainMatePlies:0}),
 make('fifty-draw',p,'e2f2',[],{fen:boardFen(p).replace(' 0 1',' 99 1')}),
 make('mate-before-draw',p,'e2h2',ids,{fen:boardFen(p).replace(' 0 1',' 99 1')}),
 make('atomic-budget',p,'e2h2',[],{maxChainMateNodes:24}),
 make('zero-budget',p,'e2h2',[],{maxChainMateNodes:0}),
 make('recorded-no-chain',p,'e2h2',[],{fen:hc.fen(),history:{fen:hs,moves:['h4h3','d6d5']}})
];
function mirror(f){const out=reflect(f);if(out.history){const c=new Chess(out.history.fen);for(const m of out.history.moves)c.move(m);out.fen=c.fen();}out.expected=f.expected.map(id=>id.includes('dark-square')?id.replace('dark-square','light-square'):id.includes('light-square')?id.replace('light-square','dark-square'):id);return out;}
export const fixtures=[...hypotheses,...controls].flatMap(f=>[f,{...mirror(f),name:f.name+'-black'}]);

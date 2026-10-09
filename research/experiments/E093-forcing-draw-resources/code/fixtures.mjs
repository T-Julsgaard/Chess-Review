import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[],extra={},absent=[])=>({id,fen:boardFen(men),move,expected,extra,absent});
const h=(f,start,moves)=>{const c=new Chess(start);for(const m of moves)c.move(m);return{...f,fen:c.fen(),history:{fen:start,moves}};};
const cycle={f6:'K',a7:'R',c4:'B',f5:'N',h8:'k',a1:'n',c1:'n',e1:'n',g1:'n'},moves=['a7a8','h8h7','a8a7','h7h8'];
export const fixtures=[
 h(f('forced-checking-claim',{},'a7a8',['forcing-check-repetition','checking-draw-fortress'],{drawModes:['repetition']}),boardFen(cycle),moves),
 f('from-fen-two-cycles',cycle,'a7a8',['forcing-check-repetition','checking-draw-fortress'],{drawModes:['repetition'],drawPlies:7}),
 f('from-fen-short-horizon',cycle,'a7a8',[],{drawModes:['repetition']},['forcing-check-repetition']),
 h(f('king-escape-refutes',{},'a7a8',[],{drawModes:['repetition']},['forcing-check-repetition']),boardFen({...cycle,f5:null}),moves),
 f('forced-sacrifice-stalemate',{h1:'K',a1:'Q',d2:'P',f2:'k',g3:'b',d3:'p',b8:'r',a6:'n'},'a1f1',['forced-own-stalemate-resource'],{drawModes:['stalemate']}),
 f('king-escape-refutes-stalemate',{h1:'K',a1:'Q',f2:'k',g3:'b',d3:'p',b8:'r',a6:'n'},'a1f1',[],{drawModes:['stalemate']},['forced-own-stalemate-resource']),
 f('conditional-ep-not-forced',{h1:'K',c2:'P',f2:'k',g3:'b',b4:'p'},'c2c4',[],{drawModes:['stalemate'],drawPlies:1},['forced-own-stalemate-resource']),
 f('quiet-no-offer',{a1:'K',h8:'k',b2:'P',b7:'p'},'b2b3',[]),
 f('actual-mate-guard',{f6:'K',g6:'Q',h8:'k'},'g6g7',[]),
];
export const bothColors=fixtures.flatMap(f=>{const mirrored=reflect(f);if(mirrored.history){const c=new Chess(mirrored.history.fen);for(const m of mirrored.history.moves)c.move(m);mirrored.fen=c.fen();}return[f,mirrored];});


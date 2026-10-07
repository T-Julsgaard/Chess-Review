import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
function f(id,extra,prior,move,expected=[],absent=[],options={}){const start=setup({a7:null,h2:null,...extra},'b'),c=new Chess(start);c.move(prior);return{id,fen:c.fen(),move,history:{fen:start,moves:[prior]},expected,absent,note:id.replaceAll('-',' '),...options};}
export const fixtures=[
 f('checking-before-recapture',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R'},'a8a4','e1e8',['intermediate-check']),
 f('capture-with-check',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R',e8:'b'},'a8a4','e1e8',['intermediate-check']),
 f('mate-instead-of-recapture',{a1:null,g6:'K',a8:'r',a4:'N',b3:'P',f7:'Q'},'a8a4','f7h7',['intermediate-mate']),
 f('ordinary-recapture',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R'},'a8a4','b3a4',[],['intermediate-check','intermediate-capture','intermediate-mate']),
 f('refutable-check',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R',f7:'b'},'a8a4','e1e8',[],['intermediate-check']),
 f('moved-capturer',{a1:null,h1:'K',h8:null,h7:'k',a8:'r',a4:'N',b3:'P',d3:'P',f3:'B'},'a8a4','f3e4',['intermediate-check']),
 f('capture-before-recapture',{a1:null,h1:'K',h8:null,g7:'k',d8:'r',d4:'N',b2:'B',e3:'P',f3:'N',g5:'p'},'d8d4','f3g5',['intermediate-capture']),
 f('exhausted',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R'},'a8a4','e1e8',[],['intermediate-check'],{maxIntermediateNodes:0}),
 f('no-direct-recapture',{a1:null,h1:'K',a8:'r',a4:'N',e1:'R'},'a8a4','e1e8',[],['intermediate-check']),
 f('countermate-after-recapture',{a1:null,h1:'K',a8:'r',a4:'N',b3:'P',e1:'R',h2:'P',g2:'P',g1:'N',h4:'q',c7:'b'},'a8a4','e1e8',[],['intermediate-check']),
 f('draw-after-recapture',{a1:null,b3:'K',h8:null,h5:'k',f1:'B',a4:'N',b6:'n'},'b6a4','f1e2',[],['intermediate-check']),
];

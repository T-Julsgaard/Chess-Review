import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[],options={})=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' '),...options});
export const fixtures=[
 f('trapped-queen',{b5:'N',b6:'N',a8:'q',a7:'p',b7:'p',b8:'b'},'b5c7',['trapped-piece']),
 f('trapped-knight',{a1:null,e5:'K',g3:'P',g1:'Q',g8:'R',h8:null,b7:'k',h5:'n'},'g3g4',['trapped-piece','dominated-piece']),
 f('restricted-bishop',{c5:'P',d4:'N',b7:'b',a6:'p',a8:'n',c8:'n'},'c5c6',['mobility-reduction','dominated-piece','trapped-piece']),
 f('dominated-knight',{a1:null,b5:'K',g1:'B',h3:'P',a8:'n'},'g1h2',['dominated-piece'],['trapped-piece']),
 f('queen-can-capture-attacker',{b5:'N',a8:'q',a7:'p',b7:'p',b8:'b'},'b5c7',[],['trapped-piece']),
 f('exhausted',{c5:'P',d4:'N',b7:'b',a6:'p',a8:'n',c8:'n'},'c5c6',['mobility-reduction'],['trapped-piece','dominated-piece'],{maxTrapNodes:0}),
 f('safe-knight-escape',{a1:null,b5:'K',g2:'P',a8:'n'},'g2g3',[],['trapped-piece','dominated-piece']),
 f('draw-after-knight-capture',{a1:null,b5:'K',g1:'B',a8:'n'},'g1h2',[],['trapped-piece','dominated-piece']),
 f('countermate-refutes-trap',{a1:null,h1:'K',h2:'P',g2:'P',g1:'N',b5:'N',b6:'N',a8:'q',a7:'p',b7:'p',b8:'b',h4:'q'},'b5c7',[],['trapped-piece']),
 f('checking-move-excluded',{a1:null,g6:'K',g5:'Q',a8:'n'},'g5e5',[],['trapped-piece','dominated-piece','mobility-reduction']),
 f('restricted-knight-pin',{a1:'R',h1:'K',h8:null,e8:'k',e7:'n'},'a1e1',['mobility-reduction'],['trapped-piece']),
 f('check-evasion-no-before-probe',{a1:null,e1:'K',e8:'r',a8:'n'},'e1d1',[],['mobility-reduction']),
];

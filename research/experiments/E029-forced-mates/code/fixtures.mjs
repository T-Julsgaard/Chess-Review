import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {fixtures as pinFixtures} from '../../E026-pin-proofs/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,mateDepth,expected=[],absent=[],options={})=>({id,fen:setup({a7:null,h2:null,...extra}),move,mateDepth,expected,absent,note:id.replaceAll('-',' '),...options});
export const fixtures=[
 f('quiet-forced-two',{a1:null,g6:'K',g5:'Q',d8:'N'},'g5e7',2,['forced-mate'],['missed-mate']),
 f('quiet-forced-three',{a1:null,f5:'K',g5:'Q',d8:'N'},'f5g6',3,['forced-mate'],[],{compareAlternatives:false}),
 f('shorter-two-available',{a1:null,f5:'K',g5:'Q',d8:'N'},'f5g6',3,['forced-mate','missed-mate']),
 f('missed-one',{a1:null,g6:'K',c5:'Q'},'c5e7',2,['forced-mate','missed-mate']),
 f('missed-two',{a1:null,g6:'K',g5:'Q',d8:'N'},'g5h5',2,['missed-mate']),
 f('stalemate-miss',{a1:null,c6:'K',b6:'Q',h8:null,a8:'k'},'b6c7',2,['stalemate','missed-mate']),
 f('insufficient-depth',{a1:null,f5:'K',g5:'Q',d8:'N'},'f5g6',2,[],['forced-mate','missed-mate'],{compareAlternatives:false}),
 f('exhausted',{a1:null,g6:'K',g5:'Q',d8:'N'},'g5e7',2,[],['forced-mate','missed-mate'],{maxMateNodes:0}),
 f('mate-already-played',{a1:null,g6:'K',f7:'Q'},'f7h7',3,['checkmate'],['forced-mate','missed-mate']),
 f('quiet-clock-draw',{a1:null,g6:'K',g5:'Q',d8:'N'},'g5e7',3,[],['forced-mate','missed-mate']),
];
fixtures.at(-1).fen=fixtures.at(-1).fen.replace(' 0 1',' 99 1');
fixtures.push(
 f('checking-multiple-defenses',{a1:null,f6:'K',c5:'Q',h8:null,g8:'k',e8:'r'},'c5g5',2,['forced-mate']),
 f('countermate-refutation',{a1:null,h1:'K',g2:'P',h2:'P',c2:'P',c5:'Q',a8:'r'},'c5c6',2,['allows-mate'],['forced-mate'],{compareAlternatives:false}),
 {...pinFixtures.find(f=>f.id==='known-history-repetition'),id:'known-repetition-deep',mateDepth:2,compareAlternatives:false,expected:[],absent:['forced-mate','missed-mate']},
 f('equivalent-fast-mate',{a1:null,g6:'K',g5:'Q',d8:'N'},'d8c6',2,['forced-mate'],['missed-mate'])
);

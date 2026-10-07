import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[],options={})=>({id,fen:setup({a1:null,a7:null,h2:null,h1:'K',...extra}),move,mateDepth:2,compareAlternatives:false,expected,absent,note:id.replaceAll('-',' '),...options});
export const fixtures=[
 f('queen-offer',{d5:'Q',h6:'N',f8:'r',g7:'p',h7:'p'},'d5g8',['forced-mate','mating-sacrifice']),
 f('rook-offer',{g1:'R',h6:'N',e6:'N',f8:'r',h7:'p'},'g1g8',['forced-mate','mating-sacrifice']),
 f('clearance-knight',{h1:null,d6:'K',c6:'N',f7:'N',c1:'R',e1:'R',h8:null,c8:'k',a8:'r',a7:'p',b7:'p'},'c6b8',['forced-mate','mating-sacrifice','clearance-sacrifice']),
 f('clearance-bishop',{h1:null,d6:'K',f6:'B',g5:'N',f1:'R',h5:'R',h8:'b',f8:'k',e8:'b',g8:'n',g6:'p'},'f6g7',['forced-mate','mating-sacrifice','clearance-sacrifice']),
 f('exchange-offer',{g1:'R',h6:'N',e6:'N',f8:'r',g8:'b',h7:'p'},'g1g8',['forced-mate','mating-sacrifice','exchange-sacrifice']),
 f('equal-queen-trade',{d5:'Q',h6:'N',f8:'r',g8:'q',g7:'p',h7:'p'},'d5g8',['forced-mate'],['mating-sacrifice','exchange-sacrifice']),
 f('no-legal-acceptance',{h1:null,g6:'K',g5:'Q',d8:'N'},'g5e7',['forced-mate'],['mating-sacrifice']),
 f('pawn-en-passant-offer',{h1:null,g6:'K',e7:'Q',f2:'P',e4:'p'},'f2f4',['forced-mate','mating-sacrifice']),
 f('queen-no-helper',{d5:'Q',f8:'r',g7:'p',h7:'p'},'d5g8',[],['mating-sacrifice','clearance-sacrifice']),
 f('exhausted',{d5:'Q',h6:'N',f8:'r',g7:'p',h7:'p'},'d5g8',[],['mating-sacrifice'],{maxMateNodes:0}),
 f('disabled',{d5:'Q',h6:'N',f8:'r',g7:'p',h7:'p'},'d5g8',[],['mating-sacrifice'],{mateDepth:0}),
];

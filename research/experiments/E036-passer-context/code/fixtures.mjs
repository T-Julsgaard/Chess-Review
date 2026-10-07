import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:'Authored passer context: '+id});
export const fixtures=[
 f('outside-passer',{a3:'P',e3:'P',e6:'p'},'a3a4',['outside-passer']),
 f('nearby-pawn-refutes-outside',{a3:'P',e3:'P',c6:'p'},'a3a4',[],['outside-passer']),
 f('sole-pawn-is-not-outside',{a3:'P'},'a3a4',[],['outside-passer']),
 f('central-passer',{d3:'P',g3:'P',h6:'p'},'d3d4',[],['outside-passer']),
 f('king-escorts',{a1:null,c3:'K',d5:'P'},'c3c4',['king-escort']),
 f('king-already-protects',{a1:null,c4:'K',d5:'P'},'c4c5',[],['king-escort']),
 f('king-near-nonpasser',{a1:null,c3:'K',d5:'P',e6:'p'},'c3c4',[],['king-escort']),
 f('clear-seventh-passer',{a6:'P'},'a6a7',['safe-promotion-tactic']),
 f('king-can-catch',{h8:null,c8:'k',a6:'P'},'a6a7',[],['safe-promotion-tactic']),
 f('rook-can-capture',{a6:'P',b8:'r'},'a6a7',[],['safe-promotion-tactic']),
 f('rook-can-block',{a6:'P',h7:'r',h8:null,g6:'k'},'a6a7',[],['safe-promotion-tactic']),
 f('promotion-can-stalemate',{a1:null,g5:'K',f6:'P'},'f6f7',[],['safe-promotion-tactic']),
 f('promotion-budget-zero',{a6:'P'},'a6a7',[],['safe-promotion-tactic']),
];fixtures.at(-1).maxPromotionNodes=0;

import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,depth,expected=[],absent=[])=>({id,fen:setup({a1:null,h8:null,a7:null,h2:null,...extra}),move,kingSupportDepth:depth,expected,absent,note:'Authored king support: '+id});
export const fixtures=[
 f('king-unblocks-with-opposition',{c6:'K',c5:'P',f7:'k'},'c6d7',3,['king-promotion-support']),
 f('king-unblocks-diagonal-opposition',{c6:'K',c5:'P',f5:'k'},'c6d7',3,['king-promotion-support']),
 f('distant-opposition-support',{a6:'K',c5:'P',f7:'k'},'a6b7',3,['king-promotion-support']),
 f('central-king-still-fails',{e3:'K',c4:'P',b4:'k'},'e3d4',4,[],['king-promotion-support']),
 f('centralization-unblocks-route',{c5:'K',c4:'P',a1:'k'},'c5d5',4,['king-promotion-support']),
 f('route-already-safe-before',{a1:'K',a6:'P',h8:'k'},'a1b1',2,[],['king-promotion-support']),
 f('king-does-not-secure-route',{a1:'K',a6:'P',c8:'k'},'a1b1',1,[],['king-promotion-support']),
 f('extra-material-is-outside-scope',{c6:'K',c5:'P',f7:'k',h2:'P'},'c6d7',3,[],['king-promotion-support']),
 f('short-support-profile',{c6:'K',c5:'P',f7:'k'},'c6d7',2,[],['king-promotion-support']),
 f('zero-support-budget',{c6:'K',c5:'P',f7:'k'},'c6d7',3,[],['king-promotion-support']),
];fixtures.at(-1).maxKingSupportNodes=0;

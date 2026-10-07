import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,depth,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,promotionDepth:depth,expected,absent,note:'Authored route: '+id});
export const fixtures=[
 f('two-push-outside-square',{a5:'P'},'a5a6',2,['promotion-route','rule-of-square']),
 f('three-push-outside-square',{a4:'P'},'a4a5',3,['promotion-route','rule-of-square']),
 f('short-profile-abstains',{a4:'P'},'a4a5',2,[],['promotion-route','rule-of-square']),
 f('king-enters-square',{a5:'P',h8:null,d8:'k'},'a5a6',2,[],['promotion-route','rule-of-square']),
 f('promotion-square-capture',{a6:'P',h8:null,c8:'k'},'a6a7',1,[],['promotion-route','rule-of-square']),
 f('own-king-blocks-route',{a1:null,a7:'K',a5:'P'},'a5a6',2,[],['promotion-route','rule-of-square']),
 f('own-king-protects-promotion',{a1:null,b6:'K',a6:'P',h8:null,c8:'k'},'a6a7',1,['promotion-route'],['rule-of-square']),
 f('enemy-rook-interferes',{a5:'P',b8:'r'},'a5a6',2,[],['promotion-route','rule-of-square']),
 f('promotion-stalemate-refutes-route',{a1:null,g5:'K',f6:'P'},'f6f7',1,[],['promotion-route','rule-of-square']),
 f('additional-army-not-square',{a5:'P',h2:'P'},'a5a6',2,['promotion-route'],['rule-of-square']),
 f('king-step-supports-route',{a1:null,b4:'K',a6:'P'},'b4b5',2,['promotion-route','rule-of-square']),
 f('zero-route-budget',{a5:'P'},'a5a6',2,[],['promotion-route','rule-of-square']),
];fixtures.at(-1).maxRouteNodes=0;

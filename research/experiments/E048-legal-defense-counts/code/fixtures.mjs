import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['legal-defense-count','pinned-recapture','xray-recapture-defense'],f=(id,pieces,move,expected=['legal-defense-count'],opts={})=>({id,fen:setup({a7:null,h2:null,...pieces}),move,expected,absent:ids.filter(x=>!expected.includes(x)),defenseCountTags:true,...opts,note:'Authored conditional legal capture and recapture mechanics: '+id});
const pin={a1:null,e1:'K',e2:'R',e8:'r',c3:'n',b1:'B'},xray={c3:'B',d2:'R',d1:'R',f5:'n',g7:'b'};
const cases=[
 f('two-attackers-two-recapturers',{h8:null,h7:'k',f3:'N',e4:'R',b2:'B',f5:'n',c5:'b'},'f3d4'),
 f('pinned-defender',pin,'b1a2',['legal-defense-count','pinned-recapture']),
 f('unpinned-defender',{...pin,e8:null},'b1a2'),
 f('pinned-attacker-excluded',{h8:null,f8:'k',f1:'R',f5:'n',b5:'n',c3:'B'},'c3d4'),
 f('only-pinned-attacker',{h8:null,f8:'k',f1:'R',f5:'n',c3:'B'},'c3d4',[]),
 f('king-can-recapture',{a1:null,c3:'K',a2:'P',f3:'N',f5:'n'},'f3d4'),
 f('king-cannot-recapture',{a1:null,c3:'K',a2:'P',f3:'N',f5:'n',c5:'b'},'f3d4'),
 f('en-passant-landing',{d2:'P',e4:'p',c2:'B'},'d2d4'),
 f('promotion-options-count-one',{h8:null,h6:'k',b3:'R',c1:'R',a2:'p'},'b3b1'),
 f('xray-rook',xray,'c3d4',['legal-defense-count','xray-recapture-defense']),
 f('xray-queen',{...xray,d1:'Q'},'c3d4',['legal-defense-count','xray-recapture-defense']),
 f('xray-two-blockers',{...xray,d3:'N'},'c3d4'),
 f('xray-wrong-slider',{...xray,d1:'B'},'c3d4'),
 f('xray-pinned-slider',{...xray,a1:null,e1:'K',d1:'R',a1:'r'},'c3d4'),
 f('checking-capture-unrelated-defender',{a1:null,e1:'K',e8:'r',e5:'n',c2:'B',d2:'R'},'c2d3'),
 f('terminal-mate-count-excluded',{a1:null,e6:'K',e8:'k',h8:null,a7:'R'},'a7a8',[]),
 f('count-disabled',pin,'b1a2',[],{defenseCountTags:false}),
 f('count-zero-budget',pin,'b1a2',[],{maxDefenseCountNodes:0}),
 f('defender-discovered-after-capture',{h8:null,h6:'k',c3:'B',d8:'R',d6:'r'},'c3d4')
];export const fixtures=cases.flatMap(f=>[f,mirror(f)]);



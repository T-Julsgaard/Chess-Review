import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const position={a1:null,h8:null,a7:null,h2:'R',h1:'K',f1:'k',f2:'q'},fen=setup(position),f=(id,extra,move,expected=[],absent=['unique-mate-defense'],options={})=>({id,fen:setup({...position,...extra}),move,uniqueDefense:true,expected,absent,note:id.replaceAll('-',' '),...options});
export const fixtures=[
 f('unique-rook-defense',{},'h2f2',['unique-mate-defense'],[]),
 f('unique-bishop-defense',{h2:null,g1:'B',f1:null,f3:'k',a2:'P'},'g1f2',['unique-mate-defense'],[]),
 f('wrong-rook-move-still-mates',{},'h2h3',['allows-mate']),
 f('queen-offers-other-safe-check',{a8:'Q'},'h2f2'),
 f('terminal-dead-material-not-defense',{h2:null,g1:'B',f1:null,f3:'k'},'g1f2',['insufficient-material']),
 f('only-legal-is-not-unique-safe',{h2:null,f2:null,f1:null,f3:'k',h3:'q'},'h1g1'),
 f('zero-unique-budget',{},'h2f2',[],['unique-mate-defense'],{maxUniqueDefenseNodes:0}),
 f('disabled-unique-profile',{},'h2f2',[],['unique-mate-defense'],{uniqueDefense:false}),
 {...f('alternative-clock-draw-not-unique',{},'h2f2'),fen:fen.replace(' 0 1',' 99 1')},
];

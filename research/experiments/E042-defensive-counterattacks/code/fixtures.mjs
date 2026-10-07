import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {fixtures as old} from '../../E041-unique-mate-defense/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const source=id=>old.find(f=>f.id===id),knight=setup({a1:null,h8:null,a7:null,h2:null,h1:'K',f1:'k',f2:'q',g2:'N',a2:'P'});
export const fixtures=[
 {...source('unique-rook-defense'),id:'checking-capture-counterattack',defensiveTags:true,expected:['unique-mate-defense','defensive-counterattack'],absent:[]},
 {id:'defensive-knight-sacrifice-offer',fen:knight,move:'g2e3',uniqueDefense:true,defensiveTags:true,expected:['unique-mate-defense','defensive-counterattack'],absent:[],note:'Ne3+ is unique; Qxe3 loses three nominal points through every immediate reply.'},
 {...source('unique-bishop-defense'),id:'nonchecking-defense-not-counterattack',defensiveTags:true,expected:['unique-mate-defense'],absent:['defensive-counterattack']},
 {...source('queen-offers-other-safe-check'),id:'another-safe-choice-not-counterattack',defensiveTags:true,expected:[],absent:['defensive-counterattack']},
 {id:'nonunique-move-in-knight-threat',fen:knight,move:'g2e1',uniqueDefense:true,defensiveTags:true,expected:['allows-mate'],absent:['defensive-counterattack'],note:'Ne1 permits Qg1#.'},
 {...source('unique-rook-defense'),id:'zero-tag-budget',defensiveTags:true,maxDefensiveTagNodes:0,expected:['unique-mate-defense'],absent:['defensive-counterattack']},
 {...source('unique-rook-defense'),id:'disabled-tags',defensiveTags:false,expected:['unique-mate-defense'],absent:['defensive-counterattack']},
 {...source('unique-rook-defense'),id:'disabled-defense-certificate',defensiveTags:true,uniqueDefense:false,expected:[],absent:['defensive-counterattack']},
 {id:'recapture-rook-also-offers-other-defense',fen:setup({a1:null,h8:null,a7:null,h2:null,h1:'K',f1:'k',f2:'q',g2:'N',a2:'P',h3:'R'}),move:'g2e3',uniqueDefense:true,defensiveTags:true,expected:[],absent:['unique-mate-defense','defensive-counterattack'],note:'The rook additionally offers Rf3, so the unique-defense prerequisite fails.'},
 {id:'recapturable-offer-not-sacrifice',fen:setup({a1:null,h8:null,a7:null,h2:null,h1:'K',f1:'k',f2:'q',g2:'N',a2:'P',h6:'B'}),move:'g2e3',uniqueDefense:true,defensiveTags:true,expected:['unique-mate-defense','defensive-counterattack'],absent:[],note:'Qxe3 permits Bxe3; offer must not count as sustained nominal sacrifice.'},
];

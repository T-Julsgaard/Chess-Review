import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {fixtures as old} from '../../E030-mating-sacrifices/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const source=id=>old.find(f=>f.id===id),copy=(id,name,options={})=>({...source(name),id,decoyTags:true,...options});
export const fixtures=[
 copy('deflection-rook-from-mate-square','queen-offer',{expected:['mating-decoy','mating-sacrifice'],absent:[]}),
 copy('rook-offer-deflection','rook-offer',{expected:['mating-decoy','mating-sacrifice'],absent:[]}),
 copy('king-attraction-bishop','clearance-bishop',{expected:['mating-decoy','mating-sacrifice'],absent:[]}),
 {id:'self-blocking-decoy-no-old-duty',fen:setup({a1:null,a7:null,h2:null,h1:'K',d5:'Q',h6:'N',d8:'r',g7:'p',h7:'p'}),move:'d5g8',mateDepth:2,compareAlternatives:false,decoyTags:true,expected:['mating-decoy','mating-sacrifice'],absent:[],note:'Rd8 is drawn onto g8; it could not previously capture Nf7.'},
 copy('equal-trade-not-decoy-sacrifice','equal-queen-trade',{expected:['forced-mate'],absent:['mating-decoy','mating-sacrifice']}),
 copy('failed-offer-no-decoy','queen-no-helper',{expected:[],absent:['mating-decoy','mating-sacrifice']}),
 copy('no-acceptance-no-decoy','no-legal-acceptance',{expected:['forced-mate'],absent:['mating-decoy']}),
 copy('disabled-decoy-tags','queen-offer',{decoyTags:false,expected:['mating-sacrifice'],absent:['mating-decoy']}),
 copy('zero-decoy-budget','queen-offer',{maxDecoyTagNodes:0,expected:['mating-sacrifice'],absent:['mating-decoy']}),
 copy('exhausted-mate-proof-no-decoy','exhausted',{expected:[],absent:['mating-decoy','mating-sacrifice']}),
];

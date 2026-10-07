import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {fixtures as old} from '../../E030-mating-sacrifices/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const source=id=>old.find(f=>f.id===id),castle=(id,pieces,moves,move)=>{const fen=setup({a7:null,h2:null,h8:null,...pieces},'b').replace(' b - - ',' b k - '),c=new Chess(fen);for(const m of moves){if(c.isGameOver())throw Error('Authored history terminal');c.move(m);}return{id,fen:c.fen(),history:{fen,moves},move,mateDepth:2,compareAlternatives:false,combinationTags:true,expected:['mating-sacrifice','coordinate-sacrifice'],absent:[],note:id.replaceAll('-',' ')};};
const h=castle('castled-rook-sacrifice-h7',{e8:'k',h8:'r',c8:'q',h7:'p',g7:'p',h1:'R',g5:'N',e4:'N'},['e8g8','a1a2','f8f7','e4f6','g8h8','a2a1','c8g8'],'h1h7');
const g=castle('castled-rook-sacrifice-g7',{e8:'k',h8:'r',h4:'q',f7:'p',g7:'p',h1:'R',h7:'R',f5:'N',d4:'N'},['e8g8','a1b1','f8a8','d4e6','h4d8','b1c1','d8f8'],'h7g7');
const ownCastle=(()=>{const fen=setup({a1:null,h2:null,a7:'p',e1:'K',h1:'R',f6:'N',g5:'N',f7:'r',g8:'q',h7:'p',g7:'p'}).replace(' w - - ',' w K - '),moves=['e1g1','a7a6','g1f2','g8f8','f1h1','f8g8'],c=new Chess(fen);for(const m of moves){if(c.isGameOver())throw Error('Authored own-castle history terminal');c.move(m);}return{id:'own-castle-does-not-prove-enemy-castle',fen:c.fen(),history:{fen,moves},move:'h1h7',mateDepth:2,compareAlternatives:false,combinationTags:true,expected:['mating-sacrifice'],absent:['coordinate-sacrifice'],note:'Only the offering side castled; this does not establish a castled enemy king.'};})();
export const fixtures=[h,g,
 {id:'exchange-sacrifice-c3',fen:setup({a1:'N',h8:null,a7:null,h2:null,e5:'K',c1:'R',d1:'N',c3:'n',d3:'k',b3:'r',d4:'r',c4:'p',d2:'p',e2:'p',e3:'p',e4:'p'}),move:'c1c3',mateDepth:2,compareAlternatives:false,combinationTags:true,expected:['mating-sacrifice','exchange-sacrifice','coordinate-sacrifice'],absent:[],note:'Synthetic c3 exchange offer with all-defense mate, not an opening identification.'},
 {...source('queen-offer'),id:'smothered-mating-combination',decoyTags:true,combinationTags:true,expected:['mating-sacrifice','mating-combination'],absent:[]},
 {...source('clearance-knight'),id:'back-rank-mating-combination',combinationTags:true,expected:['mating-sacrifice','mating-combination'],absent:[]},
 {...h,id:'h7-placement-without-castle-history',history:undefined,expected:['mating-sacrifice'],absent:['coordinate-sacrifice']},
 {...source('equal-queen-trade'),id:'equal-trade-not-offered-combination',combinationTags:true,expected:['forced-mate'],absent:['coordinate-sacrifice','mating-combination']},
 {...source('queen-no-helper'),id:'unproven-combination',combinationTags:true,expected:[],absent:['coordinate-sacrifice','mating-combination']},
 {...h,id:'zero-combination-budget',maxCombinationNodes:0,expected:['mating-sacrifice'],absent:['coordinate-sacrifice','mating-combination']},
 {...h,id:'disabled-combination-tags',combinationTags:false,expected:['mating-sacrifice'],absent:['coordinate-sacrifice','mating-combination']},
 {...source('clearance-bishop'),id:'generic-clearance-mating-combination',combinationTags:true,expected:['mating-sacrifice','mating-combination'],absent:[]},
 {...source('clearance-bishop'),id:'generic-attraction-mating-combination',combinationTags:true,decoyTags:true,expected:['mating-sacrifice','mating-combination'],absent:[]},
 ownCastle,
 {...source('pawn-en-passant-offer'),id:'multiple-defenses-without-named-role',combinationTags:true,expected:['mating-sacrifice'],absent:['mating-combination','coordinate-sacrifice']},
];

import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['french-pawn-chain','scheveningen-structure'],advanced={d4:'P',e4:'P',d5:'p',e6:'p'},base={d4:'P',e2:'P',d5:'p',e4:'p'},schev={c2:'P',d2:'P',e2:'P',f2:'P',b6:'n',d7:'p',e5:'p'};
const f=(id,root,pieces={},move='e4e5',expected=['french-pawn-chain'],opts={})=>({id,fen:setup({...root,...pieces}),move,centerTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),...opts});
function recorded(id,pieces=schev,moves=['c2c4','d7d5','c4d5','b6d5','d2d3','h8g8'],move='e2e3',yes=true,opts={}){const history={fen:setup(pieces,opts.turn||'w'),moves},c=new Chess(history.fen);for(const m of moves)c.move(m);return{...f(id,{}, {},move,yes?['scheveningen-structure']:[],opts),fen:c.fen(),history};}
const cases=[
 f('french-advanced-e-completes',advanced),f('french-advanced-d-double-completes',advanced,{d4:null,d2:'P',e4:null,e5:'P'},'d2d4'),
 f('french-advanced-capture-completes',advanced,{e4:null,e5:'n',f4:'P'},'f4e5'),
 f('french-base-e-completes',base,{},'e2e3'),f('french-base-d-completes',base,{d4:null,d3:'P',e2:null,e3:'P'},'d3d4'),
 f('french-base-capture-completes',base,{e2:null,d2:'P',e3:'b'},'d2e3'),
 f('french-extra-support-captures',advanced,{f4:'P',c6:'p'}),f('french-core-capture-resources',advanced,{c5:'n',f6:'b',c4:'B',f5:'N'}),
 f('french-own-support-pinned',advanced,{a1:null,b4:'K',h4:'r'},'e4e5',[]),
 f('french-enemy-support-pinned',advanced,{h8:null,h6:'k',a6:'R'},'e4e5',[]),
 f('french-base-own-support-pinned',base,{a1:null,a3:'K',h3:'r',d4:null,d3:'P',e2:null,e3:'P'},'d3d4',[]),
 f('french-base-enemy-support-pinned',base,{h8:null,f5:'k',a5:'R'},'e2e3',[]),
 f('french-missing-own-base',advanced,{d4:null},'e4e5',[]),f('french-missing-enemy-base',advanced,{d5:null},'e4e5',[]),
 f('french-missing-enemy-head',advanced,{e6:null},'e4e5',[]),f('french-wrong-enemy-rank',advanced,{e6:null,e7:'p'},'e4e5',[]),
 f('french-wrong-color',advanced,{d4:'p'},'e4e5',[]),f('french-preexisting-unrelated',advanced,{e4:null,e5:'P'},'a1b1',[]),
 f('french-preexisting-flank-pawn',advanced,{e4:null,e5:'P'},'h2h3',[]),
 f('french-promotion-replies',advanced,{h2:'p'}),f('french-terminal-promotion-replies',advanced,{h2:'p',a2:'P',b2:'P'}),
 f('french-en-passant-reply',advanced,{d4:null,d2:'P',e4:null,e5:'P',c4:'p'},'d2d4'),
 f('french-core-pawn-loss',advanced,{c5:'p'}),
 f('french-actual-mate',advanced,{a1:null,g4:'K',h8:'B',f6:'k',g7:'R'},'e4e5',[]),
 f('french-disabled',advanced,{},'e4e5',[],{centerTags:false}),f('french-zero-budget',advanced,{},'e4e5',[],{maxCenterNodes:0}),
 f('french-illegal-push',advanced,{},'e4e6',[],{invalid:true}),
 recorded('scheveningen-recorded-exchange'),
 recorded('scheveningen-hanging-center-warning',{...schev,f2:null}),
 recorded('scheveningen-d-completes',schev,['c2c4','d7d5','c4d5','b6d5','e2e3','h8g8'],'d2d3'),
 recorded('scheveningen-capture-completes',{...schev,e2:null,f2:'P',e3:'b'},undefined,'f2e3'),
 recorded('scheveningen-extra-control-captures',{...schev,b3:'P',f3:'P',g3:'P'}),
 recorded('scheveningen-enemy-d-captures',{...schev,b6:null,b2:'N',d2:null,d3:'P'},['d7d5','c2c4','d5c4','b2c4','h8g8','c4b6','g8h8'],'e2e3',true,{turn:'b'}),
 recorded('scheveningen-original-exchange-ep',{...schev,b6:null,b1:'N'},['d7d5','a1a2','d5d4','c2c4','d4c3','b1c3','h8g8','d2d3','g8h8'],'e2e3',true,{turn:'b'}),
 recorded('scheveningen-check-evasion-pinned',{...schev,a1:null,f2:'K',d2:null,d3:'P',a7:'b'},['c2c4','d7d5','c4d5','b6d5'],'e2e3',false),
 recorded('scheveningen-missing-context',{...schev,e5:null},undefined,'e2e3',false),
 recorded('scheveningen-occupied-target',{...schev,f4:'N'},undefined,'e2e3',false),
 recorded('scheveningen-own-c-file-pawn',{...schev,c3:'P'},['c3c4','d7d5','c4d5','b6d5','d2d3','h8g8'],'e2e3',false),
 recorded('scheveningen-wrong-root-c',{...schev,c2:null,c3:'P'},['c3c4','d7d5','c4d5','b6d5','d2d3','h8g8'],'e2e3',false),
 recorded('scheveningen-wrong-root-d',{...schev,d7:null,d6:'p'},['c2c4','d6d5','c4d5','b6d5','d2d3','h8g8'],'e2e3',false),
 recorded('scheveningen-delayed-recapture',schev,['c2c4','d7d5','c4d5','h8g8','d2d3','b6d5'],'e2e3',false),
 recorded('scheveningen-promotion-replies',{...schev,h2:'p'}),recorded('scheveningen-terminal-promotion-replies',{...schev,h2:'p',a2:'P',b2:'P'}),
 recorded('scheveningen-core-pawn-loss',{...schev,c5:'b'}),
];
const main=cases.find(f=>f.id==='scheveningen-recorded-exchange');cases.push({...main,id:'scheveningen-no-history',history:undefined,expected:[],absent:ids});
const clock=f('french-clock-reset',advanced);clock.fen=clock.fen.replace(' 0 1',' 99 1');cases.push(clock);
const history={fen:setup(advanced,'b'),moves:['h8g8']},c=new Chess(history.fen);c.move('h8g8');cases.push({...f('french-legal-history',advanced),fen:c.fen(),history});
export const fixtures=cases.flatMap(row=>[row,{...mirror(row),expected:[],absent:ids}]);

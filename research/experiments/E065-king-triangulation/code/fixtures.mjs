import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror as historicalMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const id='king-triangulation';
function make(name,options={},positive=true){const start=options.fen||setup(options.extra||{}),moves=options.moves||['a1b1','h8g8','b1b2','g8h8'],history={fen:start,moves},c=new Chess(start);for(const move of moves)c.move(move);return{id:name,fen:c.fen(),history,move:options.move||'b2a1',triangulationTags:true,expected:positive?[id]:[],absent:positive?[]:[id],note:'Locally authored legal king triangle and reversible enemy route',...options.profile,...(options.invalid?{invalid:true}:{})};}
const cases=[make('king-return'),make('reverse-triangle',{moves:['a1b2','h8g8','b2b1','g8h8'],move:'b1a1'}),make('central-triangle',{extra:{a1:null,d4:'K'},moves:['d4e4','h8g8','e4e5','g8h8'],move:'e5d4'}),
 make('rook-return',{extra:{h6:'r'},moves:['a1b1','h6h5','b1b2','h5h6']}),
 make('knight-return',{extra:{g6:'n'},moves:['a1b1','g6f4','b1b2','f4g6']}),
 make('bishop-return',{extra:{f8:'b'},moves:['a1b1','f8e7','b1b2','e7f8']}),
 make('queen-return',{extra:{h6:'q'},moves:['a1b1','h6g6','b1b2','g6h6']}),
 make('mate-reply-check-evasions',{extra:{h8:null,c3:'k',b4:'q'},moves:['a1a2','b4c4','a2b1','c4b4'],move:'b1a1'}),
 make('triangle-incomplete',{move:'b2c2'},false),
 make('own-back-and-forth',{moves:['a1b1','h8g8','b1a1','g8h8'],move:'a1b1'},false),
 make('enemy-does-not-return',{moves:['a1b1','h8g8','b1b2','g8g7']},false),
 make('short-history',{moves:['a1b2','h8g8']},false),
 make('nonking-actual',{move:'h2h3'},false),
 make('own-nonking-middle',{moves:['a1b2','h8g8','h2h3','g8h8']},false),
 make('enemy-pawn-moves',{moves:['a1b1','a7a6','b1b2','a6a5']},false),
 make('enemy-capture',{extra:{h6:'r',g6:'B'},moves:['a1b1','h6g6','b1b2','g6h6']},false),
 make('actual-king-capture',{extra:{b1:'r'},moves:['a1a2','b1c1','a2b2','c1b1'],move:'b2b1'},false),
 make('illegal-actual-step',{move:'b2d2',invalid:true},false),
 make('promotion-actual',{extra:{c7:'P'},move:'c7c8q'},false),
 make('profile-disabled',{profile:{triangulationTags:false}},false),make('zero-new-budget',{profile:{maxTriangulationNodes:0}},false)
];
const defaultRoot=setup({});cases.push(make('terminal-clock',{fen:defaultRoot.replace(' 0 1',' 95 1')},false));cases.push(make('terminal-clock-reply',{fen:defaultRoot.replace(' 0 1',' 94 1')}));
const epRoot=setup({h2:null,e5:'P',d5:'p'}).replace(' w - - 0 1',' w - d6 0 1');cases.push(make('expired-ep-state',{fen:epRoot},false));
const repetitionRoot=setup({}).replace(' w - ',' b - '),prior=['h8g8','a1b1','g8h8','b1a1','h8h7','a1a2','h7g7','a2a1','g7h8','a1b2','h8g8','b2a2','g8h8'];cases.push(make('terminal-repetition',{fen:repetitionRoot,moves:prior,move:'a2a1'},false));
const replyRoot=setup({h8:null,g8:'k'}),replySteps=['a1b1','g8h8','b1a1','h8g8','a1a2','g8h7','a2a1','h7h8','a1b2','h8g8','b2b1','g8h8'];cases.push(make('terminal-repetition-reply',{fen:replyRoot,moves:replySteps,move:'b1a1'}));
const old=make('old-triangle'),oldMoves=[...old.history.moves,old.move,'h8g8','a1b1','g8h8'];cases.push(make('older-triangle-not-current',{moves:oldMoves,move:'b1a1'},false));
cases.push({...make('missing-history'),history:undefined,expected:[],absent:[id]});
function mirror(f){const out=historicalMirror(f);if(f.history){const ep=f.history.fen.split(' ')[3];if(ep!=='-'){const fields=out.history.fen.split(' ');fields[3]=String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.history.fen=fields.join(' ');const c=new Chess(out.history.fen);for(const move of out.history.moves)c.move(move);out.fen=c.fen();}}return out;}
const rights=[];for(const side of ['k','q']){const ownRoot=setup({a1:null,h8:'k',e1:'K',[side==='k'?'h1':'a1']:'R'}).replace(' w - ',` w ${side.toUpperCase()} `);rights.push(make('own-rights-lost-'+side,{fen:ownRoot,moves:['e1f1','h8g8','f1f2','g8h8'],move:'f2e1'},false));const enemyRoot=setup({h8:null,e8:'k',[side==='k'?'h8':'a8']:'r',...(side==='q'?{a7:null,a1:null,h1:'K'}:{})}).replace(' w - ',` w ${side} `),file=side==='k'?'h':'a';rights.push(make('enemy-rights-lost-'+side,{fen:enemyRoot,moves:[side==='k'?'a1b1':'h1g1',file+'8'+file+'7',side==='k'?'b1b2':'g1g2',file+'7'+file+'8'],move:side==='k'?'b2a1':'g2h1'},false));}
export const fixtures=[...cases.flatMap(f=>[f,mirror(f)]),...rights];

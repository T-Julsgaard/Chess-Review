import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const id='pawn-race';
function make(name,options={},positive=true){return{id:name,fen:setup({a7:null,h2:null,[options.own||'b6']:'P',[options.rival||'f3']:'p',...options.extra}),move:options.move||(options.own||'b6')+'b7',pawnRaceTags:true,expected:positive?[id]:[],absent:positive?[]:[id],note:'Locally authored complete legal opposing pawn race',...options.profile,...(options.invalid?{invalid:true}:{})};}
const cases=[make('one-push-first'),make('two-push-first',{own:'b5',rival:'f4',move:'b5b6'}),make('three-push-blocked-rival',{own:'b4',rival:'f2',move:'b4b5',extra:{a1:null,f1:'K'}}),
 make('rival-can-promote-next',{extra:{h8:null,h7:'k'}}),make('promotion-stalemate-leaf',{rival:'f2',extra:{a1:null,f1:'K',h8:null,h2:'k'}}),
 make('king-blockades-faster-rival',{rival:'f2',extra:{a1:null,f1:'K'}}),
 make('same-file-passed',{rival:'b3',extra:{a1:null,h1:'K'}}),make('adjacent-file-passed',{rival:'c3'}),
 make('rival-first-all-underpromotions',{rival:'f2'},false),
 make('three-push-rival-first',{own:'b4',rival:'f4',move:'b4b5'},false),
 make('rival-pawn-check-refutes',{extra:{a1:null,g1:'K'}},false),
 make('enemy-king-captures-pawn',{extra:{h8:null,c6:'k'}},false),
 make('enemy-king-blocks-square',{extra:{h8:null,c8:'k'}},false),
 make('enemy-king-approaches',{own:'b5',rival:'f4',move:'b5b6',extra:{h8:null,d8:'k'}},false),
 make('own-king-blocks-promotion',{extra:{a1:null,b8:'K'}},false),
 make('early-own-pawn',{own:'b3',move:'b3b4'},false),make('early-rival-pawn',{rival:'f5'},false),
 make('unpassed-early-rival',{own:'b4',rival:'c6',move:'b4b5'},false),
 make('extra-own-pawn',{extra:{c2:'P'}},false),make('extra-enemy-piece',{extra:{e8:'r'}},false),
 make('missing-rival',{extra:{f3:null}},false),make('actual-king-move',{move:'a1b1'},false),
 make('actual-pawn-capture',{own:'c6',rival:'d7',move:'c6d7'},false),
 make('actual-promotion',{own:'b7',move:'b7b8q'},false),
 make('illegal-actual-step',{move:'b6b8',invalid:true},false),
 make('short-two-push-profile',{own:'b5',rival:'f4',move:'b5b6',profile:{pawnRaceDepth:2}},false),
 make('short-three-push-profile',{own:'b4',rival:'f2',move:'b4b5',extra:{a1:null,f1:'K'},profile:{pawnRaceDepth:4}},false),
 make('exact-one-push-profile',{profile:{pawnRaceDepth:2}}),
 make('profile-disabled',{profile:{pawnRaceTags:false}},false),make('zero-depth',{profile:{pawnRaceDepth:0}},false),make('zero-budget',{profile:{maxPawnRaceNodes:0}},false),
 make('urgent-mate-extra-material',{own:'e6',move:'e6e7',extra:{a2:'P',b2:'P',h3:'q'}},false)
];
const historic=make('history-pawn-step',{own:'b5',rival:'f5',move:'b5b6'}),start=historic.fen.replace(' w - ',' b - '),history={fen:start,moves:['f5f4']},end=new Chess(start);end.move('f5f4');cases.push({...historic,fen:end.fen(),history});
const king=make('history-king-step'),kingRoot=king.fen.replace(' w - ',' b - '),kingHistory={fen:kingRoot,moves:['h8g8']},kingEnd=new Chess(kingRoot);kingEnd.move('h8g8');cases.push({...king,fen:kingEnd.fen(),history:kingHistory});
const epRoot=setup({a7:null,h2:null,e5:'P',d7:'p'}).replace(' w - ',' b - '),epHistory={fen:epRoot,moves:['d7d5']},epEnd=new Chess(epRoot);epEnd.move('d7d5');cases.push({id:'actual-ep-capture',fen:epEnd.fen(),history:epHistory,move:'e5d6',pawnRaceTags:true,expected:[],absent:[id],note:'Legal history-confirmed EP capture is not a two-pawn race'});
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

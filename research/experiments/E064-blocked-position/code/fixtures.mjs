import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const id='blocked-position';
function make(name,options={},positive=true){const files=options.files||'cdef',high=options.high??4,low=options.low??3,pieces={a7:null,h2:null};for(const file of files){const rank=(file.charCodeAt(0)-97)%2===0?high:low;pieces[file+rank]='P';pieces[file+(rank+1)]='p';}const target=options.target||'e'+high,from=options.from||target[0]+(+target[1]-1);pieces[target]=null;pieces[from]='P';const fen=setup({...pieces,...options.extra});return{id:name,fen,move:options.move||from+target,blockedPositionTags:true,expected:positive?[id]:[],absent:positive?[]:[id],note:'Locally authored matched pawn-wall closure',...options.profile,...(options.invalid?{invalid:true}:{})};}
const cases=[
 make('four-file-wall'),make('six-file-wall',{files:'bcdefg'}),make('eight-file-wall',{files:'abcdefgh'}),
 make('double-step-wall',{high:4,low:5,from:'e2'}),
 make('lower-wall',{high:3,low:2,from:'e2'}),
 make('checking-enemy-reply',{extra:{h8:'r',g8:'k'}}),
 make('two-rams',{files:'de'},false),make('flank-only',{files:'abcd',target:'c4',extra:{a1:null,h1:'K'}},false),
 make('noncontiguous',{files:'cefg'},false),
 make('unmatched-enemy-pawn',{extra:{e5:null,e6:'p'}},false),
 make('extra-mobile-own-pawn',{extra:{a2:'P'}},false),
 make('extra-blocked-own-pawn',{extra:{a2:'P',a3:'N'}},false),
 make('extra-enemy-pawn',{extra:{h7:'p'}},false),
 make('adjacent-pawn-captures',{high:4,low:4},false),
 make('double-step-allows-ep',{from:'e2'},false),
 make('enemy-king-captures-wall',{extra:{h8:null,g3:'k'}},false),
 make('enemy-rook-captures-wall',{extra:{f2:'r'}},false),
 make('enemy-knight-offers-pawn-capture',{extra:{h6:'n'}},false),
 make('enemy-bishop-offers-pawn-capture',{extra:{g6:'b'}},false),
 make('actual-pawn-capture',{move:'e3d4'},false),
 make('actual-king-move',{move:'a1b1'},false),
 make('illegal-pawn-step',{move:'e3e5',invalid:true},false),
 make('own-turn-counterfactual-illegal',{extra:{h8:null,f5:'k'}},false),
 make('actual-mate',{extra:{a1:null,e7:'K',h8:null,f5:'k',g1:'R'}},false),
 make('enemy-terminal-reply',{extra:{a1:null,h1:'K',f2:'q',f1:'b'}},false),
 make('profile-disabled',{profile:{blockedPositionTags:false}},false),
 make('zero-new-budget',{profile:{maxBlockedPositionNodes:0}},false)
];
const historic=make('history-king-reply'),start=historic.fen.replace(' w - ',' b - '),history={fen:start,moves:['h8g8']},end=new Chess(start);end.move('h8g8');cases.push({...historic,history,fen:end.fen()});
const double=make('history-enemy-double-step'),initial=new Chess(double.fen);initial.remove('e5');initial.put({type:'p',color:'b'},'e7');const fields=initial.fen().split(' ');fields[1]='b';const doubleHistory={fen:fields.join(' '),moves:['e7e5']},doubleEnd=new Chess(doubleHistory.fen);doubleEnd.move('e7e5');cases.push({...double,history:doubleHistory,fen:doubleEnd.fen()});
const promotion={id:'actual-promotion',fen:setup({a7:null,h2:null,f7:'P'}),move:'f7f8q',blockedPositionTags:true,expected:[],absent:[id],note:'Promotion cannot complete a pawn wall'};cases.push(promotion);
const epRoot=setup({a7:null,h2:null,e5:'P',d7:'p'}).replace(' w - ',' b - '),epHistory={fen:epRoot,moves:['d7d5']},epEnd=new Chess(epRoot);epEnd.move('d7d5');cases.push({id:'actual-en-passant',fen:epEnd.fen(),history:epHistory,move:'e5d6',blockedPositionTags:true,expected:[],absent:[id],note:'Legal history-confirmed EP capture is not a wall closure'});
for(const side of ['k','q']){const f=make('enemy-castling-'+side,{extra:{a1:side==='k'?'K':null,...(side==='q'?{h1:'K'}:{}),h8:null,e8:'k',[side==='k'?'h8':'a8']:'r'}});f.fen=f.fen.replace(' w - ',` w ${side} `);cases.push(f);}
cases.push(make('pre-existing-other-piece-capture',{extra:{g2:'N',h2:'r'}}));
cases.push(make('higher-priority-trapped-piece',{extra:{f1:'Q',h1:'R',h5:'n'}}));
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

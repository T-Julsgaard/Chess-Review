import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {fixtures as sacrifices} from '../../E030-mating-sacrifices/code/fixtures.mjs';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const make=(id,extra,move,positive=true,options={})=>({id,fen:setup(extra),move,blockadeTags:true,expected:positive?['pawn-blockade']:[],absent:positive?[]:['pawn-blockade'],note:'Authored immediate occupied-square pawn blockade: '+id,...options});
const cases=[
 make('knight-stops-nonpassed-pawn',{c4:'N',e6:'p',d2:'P'},'c4e5'),
 make('king-blockade',{a1:null,e4:'K',e6:'p'},'e4e5'),
 make('rook-blockade',{a5:'R',e6:'p'},'a5e5'),make('bishop-blockade',{g3:'B',e6:'p',g7:'p'},'g3e5'),make('queen-blockade',{e2:'Q',e6:'p'},'e2e5'),
 make('capture-creates-blockade',{c4:'N',e5:'b',e6:'p'},'c4e5'),
 make('starting-pawn-double-push-blocked',{c5:'N',e7:'p'},'c5e6'),
 make('promotion-step-blocked',{a1:null,h1:'K',c1:'R',a2:'p'},'c1a1'),
 make('a-file-knight-blockade',{c4:'N',a4:'p'},'c4a3'),
 make('pawn-can-capture-both-diagonals',{c4:'N',e6:'p',d5:'B',f5:'B'},'c4e5'),
 make('pawn-can-capture-en-passant',{e4:'p',d2:'P',e2:'R'},'d2d4',false),
 make('hanging-blocker-warning',{c4:'N',e6:'p',d6:'b'},'c4e5',true,{expected:['pawn-blockade','hanging-piece']}),
 make('pinned-enemy-pawn-still-occupied-blockade',{c4:'N',e6:'p',e1:'R',h8:null,e8:'k'},'c4e5'),
 make('stationary-blocker-unrelated-move',{e5:'N',e6:'p',b2:'B'},'b2c3',false),
 make('own-pawn-ram',{e4:'P',e6:'p'},'e4e5',false),make('own-pawn-ahead',{c4:'N',e6:'P'},'c4e5',false),
 make('wrong-direction',{c4:'N',e4:'p'},'c4e5',false),make('wrong-file',{c4:'N',d6:'p'},'c4e5',false),make('two-squares-away',{c4:'N',e7:'p'},'c4e5',false),
 make('controls-forward-square-only',{d2:'N',e6:'p'},'d2f3',false),
 make('quiet-clock-draw',{c4:'N',e6:'p'},'c4e5',false,{fen:setup({c4:'N',e6:'p'}).replace(' 0 1',' 99 1')}),
 make('actual-mate-excludes-blockade',{a1:null,f4:'K',h8:null,h5:'k',g1:'Q',g6:'p'},'g1g5',false,{expected:['checkmate']}),
 make('actual-stalemate-excludes-blockade',{a1:null,f7:'K',c6:'Q',g7:'p',a7:null},'c6g6',false,{expected:['stalemate']}),
 make('unsafe-king-landing',{a1:null,e4:'K',e6:'p',d6:'p'},'e4e5',false,{invalid:true}),
 make('profile-disabled',{c4:'N',e6:'p'},'c4e5',false,{blockadeTags:false}),make('zero-new-budget',{c4:'N',e6:'p'},'c4e5',false,{maxBlockadeNodes:0})
];
const root=new Chess(setup({c4:'N',e6:'p',b2:'B',b3:'r'})),fields=root.fen().split(' ');fields[1]='b';
const h={fen:fields.join(' '),moves:['b3b2']},current=new Chess(h.fen);current.move('b3b2');
cases.push({...make('history-new-blockade',{},'c4e5'),fen:current.fen(),history:h});
// The frozen intermediate-sacrifice guard must also refuse a direct recapture
// that is itself a positive-cost mating offer, not only ordinary equal trades.
const offer=sacrifices.find(f=>f.id==='exchange-offer'),r=new Chess(offer.fen);r.remove('g8');r.put({type:'n',color:'w'},'g8');r.put({type:'b',color:'b'},'f7');const rf=r.fen().split(' ');rf[1]='b';
const captureHistory={fen:rf.join(' '),moves:['f7g8']},c=new Chess(captureHistory.fen);c.move('f7g8');
cases.push({...offer,id:'direct-recapture-itself-mating-offer',fen:c.fen(),history:captureHistory,blockadeTags:true,intermediateSacrificeTags:true,expected:['mating-sacrifice'],absent:['pawn-blockade','intermediate-sacrifice'],note:'Authored inherited timing guard: actual recapture is a mating sacrifice'});
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

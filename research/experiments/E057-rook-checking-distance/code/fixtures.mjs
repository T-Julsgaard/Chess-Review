import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['rear-rook-check','side-rook-check','rook-checking-distance'];
const make=(id,extra,move,expected=[],options={})=>({id,fen:setup({h8:null,e3:'k',a7:'R',h2:'r',e2:'p',...extra}),move,rookCheckTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),note:'Authored rook checking direction/distance: '+id,...options});
const rear=['rear-rook-check','rook-checking-distance'],side=['side-rook-check','rook-checking-distance'];
const cases=[make('rear-three-clear-squares',{},'a7e7',rear),make('side-three-clear-squares',{},'a7a3',side),
 make('side-from-right',{a7:null,h2:null,h7:'R',b8:'r',e3:null,d3:'k',e2:null,d2:'p'},'h7h3',side),
 make('rear-short-distance',{a7:null,a6:'R'},'a6e6',['rear-rook-check']),
 make('side-short-distance',{a7:null,c7:'R'},'c7c3',['side-rook-check']),
 make('side-pawn-captures-checker',{b4:'p'},'a7a3',['side-rook-check']),make('side-rook-captures-checker',{h2:null,a8:'r'},'a7a3',['side-rook-check']),
 make('side-rook-can-interpose',{h2:null,b8:'r'},'a7a3',side),
 make('multiple-advanced-passers',{a7:null,a8:'R',e3:'p',e2:null,e4:'p',e5:'k'},'a8e8',['rear-rook-check']),
 make('capture-on-checking-square',{a3:'p'},'a7a3',side),
 make('frontal-file-check',{a7:null,a5:'R',e3:null,e6:'k',e2:null,e4:'p'},'a5e5'),
 make('obstructed-ray',{e5:'p'},'a7e7'),make('nonpassed-pawn',{a7:null,a8:'R',e3:null,e5:'k',e2:null,e4:'p',d2:'P'},'a8e8'),
 make('pawn-not-advanced',{a1:null,e5:'K',a7:null,a8:'R',e3:null,e7:'k',e2:null,e6:'p'},'a8e8'),
 make('king-not-on-passer-file',{e2:null,d2:'p'},'a7a3'),make('no-enemy-pawn',{e2:null},'a7a3'),
 make('extra-own-rook',{b1:'R'},'a7a3'),make('extra-minor-piece',{d1:'B'},'a7a3'),
 make('quiet-clock-draw',{},'a7a3',[],{fen:setup({h8:null,e3:'k',a7:'R',h2:'r',e2:'p'}).replace(' 0 1',' 99 1')}),
 make('profile-disabled',{},'a7e7',[],{rookCheckTags:false}),make('new-budget-zero',{},'a7e7',[],{maxRookCheckNodes:0}),
 make('illegal-rook-diagonal',{},'a7b6',[],{invalid:true}),
 make('promotion-interposes-outside-passer-context',{a1:null,h8:'K',e3:null,e1:'k',a7:null,a3:'R',h2:null,f3:'r',e2:null,b2:'p'},'a3a1')];
const f=cases[0],c=new Chess(f.fen);c.remove('h2');c.put({type:'r',color:'b'},'h3');c.put({type:'b',color:'w'},'h2');const fields=c.fen().split(' ');fields[1]='b';const history={fen:fields.join(' '),moves:['h3h2']},end=new Chess(history.fen);end.move('h3h2');
cases.push({...f,id:'history-rear-check',fen:end.fen(),history});
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

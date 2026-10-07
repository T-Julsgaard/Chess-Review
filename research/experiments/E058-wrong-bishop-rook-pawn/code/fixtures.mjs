import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['wrong-colored-bishop','wrong-rook-pawn-corner'],both=ids;
const make=(id,extra,move,expected=both,options={})=>({id,fen:setup({a1:null,h8:null,h2:null,a7:null,f5:'K',b8:'k',c3:'B',a6:'P',...extra},options.turn||'w'),move,wrongBishopTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),note:'Authored wrong bishop/rook-pawn promotion-square mechanics: '+id,...options});
const cases=[make('bishop-move-corner-access',{},'c3b4'),make('pawn-move-corner-access',{},'a6a7'),make('attacking-king-move',{},'f5e5'),
 make('defending-king-enters-corner',{},'b8a8',both,{turn:'b'}),make('corner-already-occupied',{b8:null,a8:'k'},'c3b4'),
 make('corner-denied-by-attacking-king',{f5:null,b6:'K',b8:null,c8:'k'},'c3b4',['wrong-colored-bishop']),
 make('distant-defender',{b8:null,g8:'k'},'c3b4',['wrong-colored-bishop']),
 make('defender-can-capture-pawn',{b8:null,b6:'k',f5:null,f4:'K'},'c3b4',['wrong-colored-bishop']),
 make('defender-can-capture-bishop',{b8:null,a4:'k',f5:null,f4:'K'},'c3b4',['wrong-colored-bishop']),
 make('capture-enters-pure-ending',{b4:'n'},'c3b4'),
 make('right-colored-bishop',{c3:null,d3:'B'},'d3c4',[]),make('nonrook-pawn',{a6:null,b6:'P'},'c3d4',[]),
 make('extra-own-pawn',{h3:'P'},'c3b4',[]),make('extra-minor',{d1:'N'},'c3b4',[]),make('defender-has-pawn',{h7:'p'},'c3b4',[]),
 make('no-bishop',{c3:null},'f5e5',[]),make('no-pawn',{a6:null,h7:'r'},'f5e5',[]),
 make('promotion-removes-context',{a6:null,a7:'P',b8:null,g8:'k'},'a7a8q',[]),
 make('quiet-clock-draw',{},'c3b4',[],{fen:setup({a1:null,h8:null,h2:null,a7:null,f5:'K',b8:'k',c3:'B',a6:'P'}).replace(' 0 1',' 99 1')}),
 make('capture-pawn-produces-dead-material',{b8:null,b6:'k',f5:null,f4:'K'},'b6a6',[],{turn:'b',expected:['insufficient-material']}),
 make('actual-stalemate',{f5:null,a6:'K',a7:'P',b8:null,a8:'k'},'c3b4',[],{expected:['stalemate']}),
 make('actual-bishop-mate',{f5:null,g6:'K',a6:null,h7:'P',c3:null,h6:'B',b8:null,h8:'k'},'h6g7',[],{expected:['checkmate']}),
 make('unsafe-king-move',{f5:null,b6:'K'},'b8b7',[],{turn:'b',invalid:true}),
 make('profile-disabled',{},'c3b4',[],{wrongBishopTags:false}),make('new-budget-zero',{},'c3b4',[],{maxWrongBishopNodes:0})];
const f=cases[0],root=new Chess(f.fen);root.put({type:'r',color:'b'},'b3');root.put({type:'n',color:'w'},'b4');const fields2=root.fen().split(' ');fields2[1]='b';const h={fen:fields2.join(' '),moves:['b3b4']},end=new Chess(h.fen);end.move('b3b4');
cases.push({...f,id:'capture-history-enters-pure-ending',fen:end.fen(),history:h});
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

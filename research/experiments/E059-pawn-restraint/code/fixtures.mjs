import {Chess} from '../../../../lib/chess.js';import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const ids=['self-blocking-pawn','fixed-pawn-next-turn'];const make=(id,extra,move,expected=['self-blocking-pawn'],options={})=>({id,fen:setup(extra),move,pawnRestraintTags:true,expected,absent:ids.filter(x=>!expected.includes(x)),note:'Authored finite own-pawn restraint: '+id,...options});
const cases=[make('knight-blocks-own-pawn',{c2:'N',e2:'P'},'c2e3'),make('bishop-blocks-own-pawn',{c1:'B',e2:'P'},'c1e3'),make('rook-blocks-own-pawn',{a3:'R',e2:'P'},'a3e3'),make('queen-blocks-own-pawn',{d3:'Q',e2:'P'},'d3e3'),make('king-blocks-own-pawn',{a1:null,e2:'K',e1:null,e3:'P'},'e2e4',[],{invalid:true}),
 make('king-own-pawn-block',{a1:null,e4:'K',e2:'P'},'e4e3'),
 make('pawn-blocks-own-pawn',{e2:'P',e4:'P',d3:'p'},'e2d3',[]),
 make('own-pawn-capture-blocker',{d2:'P',e2:'P',e3:'n'},'d2e3'),
 make('pawn-can-capture-after-block',{c2:'N',e2:'P',d3:'p'},'c2e3'),
 make('blocker-can-be-captured',{c2:'N',e2:'P',f4:'b'},'c2e3'),
 make('stationary-own-blocker',{e3:'N',e2:'P',b1:'B'},'b1c2',[]),make('wrong-direction',{c2:'N',e4:'P'},'c2e3',[]),make('wrong-file',{c2:'N',d2:'P'},'c2e3',[]),
 make('ram-fixed-next-turn',{e3:'P',e5:'p'},'e3e4',['fixed-pawn-next-turn']),
 make('ram-pawn-capture-created',{d3:'P',e4:'n',e5:'p'},'d3e4',['fixed-pawn-next-turn']),
 make('ram-enemy-blocker-can-capture',{e3:'P',e5:'p',d4:'B'},'e3e4',[]),
 make('ram-own-pawn-can-capture',{e3:'P',e5:'p',d5:'p'},'e3e4',[]),
 make('ram-pawn-can-be-taken',{e3:'P',e5:'p',h4:'r'},'e3e4',[]),
 make('terminal-reply-preserved',{c2:'N',e2:'P'},'c2e3',['self-blocking-pawn'],{fen:setup({c2:'N',e2:'P'}).replace(' 0 1',' 98 1')}),
 make('actual-clock-draw',{c2:'N',e2:'P'},'c2e3',[],{fen:setup({c2:'N',e2:'P'}).replace(' 0 1',' 99 1')}),
 make('profile-disabled',{c2:'N',e2:'P'},'c2e3',[],{pawnRestraintTags:false}),make('zero-new-budget',{c2:'N',e2:'P'},'c2e3',[],{maxPawnRestraintNodes:0})];
const f=cases[0],c=new Chess(f.fen);c.put({type:'r',color:'b'},'b4');c.put({type:'b',color:'w'},'b3');const fields=c.fen().split(' ');fields[1]='b';const history={fen:fields.join(' '),moves:['b4b3']},end=new Chess(history.fen);end.move('b4b3');cases.push({...f,id:'history-self-block',fen:end.fen(),history});
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
import {mirror as historyMirror} from '../../E047-history-and-basic-mates/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const id='cross-check',f=(name,pieces,move,positive=true,options={})=>({id:name,fen:setup({a1:null,a7:null,h2:null,h8:null,...pieces}),move,expected:positive?[id]:[],absent:positive?[]:[id],crossCheckTags:true,...options,note:'Authored legal cross-check mechanics: '+name});
const knight={e1:'K',e8:'r',c3:'N',f6:'k'},bishop={e1:'K',e8:'r',c5:'B',h6:'k'},discovered={d1:'K',d8:'r',a2:'B',b3:'N',g8:'k'},double={...discovered,g8:null,e6:'k'};
const cases=[
 f('knight-block',knight,'c3e4'),f('bishop-block',bishop,'c5e3'),f('queen-block',{...bishop,c5:'Q'},'c5e3'),
 f('rook-bishop-ray',{a1:'K',h8:'b',d2:'R',g4:'k'},'d2d4'),
 f('rook-queen-ray',{a1:'K',h8:'q',d2:'R',g4:'k'},'d2d4'),
 f('pawn-block',{h4:'K',a4:'r',e3:'P',f5:'k'},'e3e4'),
 f('discovered-block',discovered,'b3d4'),f('double-block',double,'b3d4'),
 f('mating-double-block',{...double,c7:'R',g5:'R',h5:'B',b4:'B',g8:'N'},'b3d4'),
 f('capture-checking-rook',{a1:'K',a7:'r',b6:'B',b8:'k',h7:'p'},'b6a7'),
 f('king-discovered-escape',{g2:'K',g1:'R',f2:'r',g8:'k'},'g2h3'),
 f('queen-promotion-block',{h8:'K',a8:'r',e7:'P',e6:'k'},'e7e8q'),
 f('rook-promotion-block',{h8:'K',a8:'r',e7:'P',e6:'k'},'e7e8r'),
 f('bishop-promotion-block',{h8:'K',a8:'r',e7:'P',g6:'k'},'e7e8b'),
 f('knight-promotion-block',{h8:'K',a8:'r',e7:'P',f6:'k'},'e7e8n'),
 f('ep-checker-capture',{c4:'K',e5:'P',e1:'R',d5:'p',e8:'k'},'e5d6',true,{fen:setup({a1:null,h8:null,a7:null,h2:null,c4:'K',e5:'P',e1:'R',d5:'p',e8:'k'}).replace(' w - -',' w - d6')}),
 f('no-before-check',{...knight,e8:null,a7:'p'},'c3e4',false),
 f('nonchecking-block',{...knight,f6:null,h8:'k'},'c3e4',false),
 f('nonchecking-king-escape',knight,'e1d1',false),
 f('drawn-checking-block',knight,'c3e4',false,{fen:setup({a1:null,a7:null,h2:null,h8:null,...knight}).replace(' 0 1',' 99 1')}),
 f('disabled-profile',knight,'c3e4',false,{crossCheckTags:false}),
 f('zero-budget',knight,'c3e4',false,{maxCrossCheckNodes:0})
];
const historyRoot=setup({a1:null,h8:null,a7:null,h2:null,e1:'K',c3:'N',f6:'k',a8:'r'},'b');
const mating=cases.find(f=>f.id==='mating-double-block');
cases.push({...mating,id:'mating-block-at-clock-boundary',fen:mating.fen.replace(' 0 1',' 99 1')});
const historyBoard=new Chess(historyRoot);historyBoard.move('a8e8');
cases.push({...f('history-checking-rook',knight,'c3e4'),fen:historyBoard.fen(),history:{fen:historyRoot,moves:['a8e8']}});
cases.push(f('illegal-double-check-block',{e1:'K',e8:'r',b4:'b',c5:'N',f6:'k'},'c5e4',false,{invalid:true}));
function mirror(f){const out=historyMirror(f),fields=out.fen.split(' '),ep=f.fen.split(' ')[3];fields[3]=ep==='-'?'-':String.fromCharCode(201-ep.charCodeAt(0))+ep[1];out.fen=fields.join(' ');return out;}
export const fixtures=cases.flatMap(f=>[f,mirror(f)]);

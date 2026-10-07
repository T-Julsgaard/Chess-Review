import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' ')});
export function horizontal(f){const c=new Chess(f.fen),d=new Chess();d.clear();for(const p of c.board().flat().filter(Boolean))d.put(p,String.fromCharCode(104-(p.square.charCodeAt(0)-97))+p.square[1]);const fields=d.fen().split(' '),old=c.fen().split(' ');fields[1]=old[1];fields[4]=old[4];fields[5]=old[5];const mirror=s=>String.fromCharCode(104-(s.charCodeAt(0)-97))+s[1];return{...f,id:f.id+'-mirror',fen:fields.join(' '),move:mirror(f.move.slice(0,2))+mirror(f.move.slice(2,4))+f.move.slice(4)};}
const cases=[
 f('arabian',{g7:'R',f6:'N'},'g7h7',['arabian-mate','mate-pair-nr','mate-in-one']),
 f('anastasia',{h8:null,h7:'k',g7:'p',e7:'N',g3:'R'},'g3h3',['anastasia-mate','mate-pair-nr']),
 f('anastasia-queen',{h8:null,h7:'k',g7:'p',e7:'N',g3:'Q'},'g3h3',['anastasia-mate','mate-pair-nq']),
 f('boden',{h8:null,c8:'k',d8:'r',d7:'p',b5:'B',f4:'B'},'b5a6',['boden-mate','mate-pair-bb']),
 f('epaulette',{h8:null,e8:'k',d8:'r',f8:'r',b3:'Q'},'b3e6',['epaulette-mate']),
 f('dovetail',{h8:null,e6:'k',d6:'p',e7:'p',h5:'Q',e4:'P'},'h5f5',['dovetail-mate','pawn-supported-mate']),
 f('swallow-tail',{h8:null,e6:'k',d7:'p',f7:'p',h5:'Q',d4:'P'},'h5e5',['swallow-tail-mate','pawn-supported-mate']),
 f('opera',{h8:null,e8:'k',f8:'b',f7:'p',d1:'R',g5:'B'},'d1d8',['opera-mate','mate-pair-br']),
 f('morphy',{c1:'B',g1:'R',h7:'p'},'c1b2',['morphy-mate','mate-pair-br']),
 f('ladder',{h8:null,g8:'k',d1:'R',b7:'R'},'d1d8',['ladder-mate']),
 f('queen-knight',{c7:'Q',e6:'N'},'c7g7',['mate-pair-nq']),
 f('queen-bishop',{c7:'Q',f8:'B'},'c7g7',['mate-pair-bq']),
 f('queen-rook',{c7:'Q',g1:'R'},'c7g7',['mate-pair-qr']),
 f('pawn-supported',{c7:'Q',f6:'P'},'c7g7',['pawn-supported-mate']),
 f('arabian-missing-knight',{g7:'R'},'g7h7',[],['arabian-mate','mate-in-one']),
 f('anastasia-missing-blocker',{h8:null,h7:'k',e7:'N',g3:'R'},'g3h3',[],['anastasia-mate']),
 f('anastasia-missing-knight',{h8:null,h7:'k',g7:'p',g3:'R'},'g3h3',[],['anastasia-mate']),
 f('boden-missing-second-bishop',{h8:null,c8:'k',d8:'r',d7:'p',b5:'B'},'b5a6',[],['boden-mate']),
 f('epaulette-missing-shoulder',{h8:null,e8:'k',d8:'r',b3:'Q'},'b3e6',[],['epaulette-mate']),
 f('epaulette-wrong-distance',{h8:null,e8:'k',d8:'r',f8:'r',b7:'Q',b4:'B'},'b7e7',[],['epaulette-mate']),
 f('dovetail-missing-support',{h8:null,e6:'k',d6:'p',e7:'p',h5:'Q'},'h5f5',[],['dovetail-mate']),
 f('swallow-missing-blocker',{h8:null,e6:'k',d7:'p',h5:'Q',d4:'P'},'h5e5',[],['swallow-tail-mate']),
 f('opera-missing-bishop',{h8:null,e8:'k',f8:'b',f7:'p',d1:'R'},'d1d8',[],['opera-mate']),
 f('morphy-missing-rook',{c1:'B',h7:'p'},'c1b2',[],['morphy-mate']),
 f('ladder-missing-rook',{h8:null,g8:'k',d1:'R'},'d1d8',[],['ladder-mate']),
 f('promotion-queen',{a1:null,g6:'K',f7:'P'},'f7f8q',['promotion-mate'],['underpromotion-mate']),
 f('underpromotion-rook',{a1:null,g6:'K',f7:'P'},'f7f8r',['promotion-mate','underpromotion-mate']),
 f('promotion-not-mate',{a1:null,g6:'K',f7:'P'},'f7f8b',[],['promotion-mate','underpromotion-mate','mate-in-one']),
 f('underpromotion-bishop',{a1:null,f6:'K',h8:null,h7:'k',f7:'N',g1:'R',g7:'P'},'g7g8b',['underpromotion-mate']),
 f('underpromotion-knight',{h8:null,f7:'k',e8:'r',f8:'b',g8:'b',e7:'p',g7:'p',e6:'p',f6:'p',g6:'p',h7:'P'},'h7h8n',['underpromotion-mate','smothered-mate']),
 f('discovered-mate',{h8:null,e8:'k',d1:'R',e1:'R',f1:'R',e2:'N'},'e2c3',['discovered-mate'],['double-check-mate']),
 f('double-check-mate',{h8:null,e8:'k',d1:'R',e1:'R',f1:'R',e2:'B'},'e2b5',['discovered-mate','double-check-mate']),
];
function rotate(f){const c=new Chess(f.fen),d=new Chess(),map=s=>String.fromCharCode(97+(+s[1]-1))+(8-(s.charCodeAt(0)-97));d.clear();for(const p of c.board().flat().filter(Boolean)){if(p.type==='p')throw Error('Only pawn-free authored rotation seeds');d.put(p,map(p.square));}const fields=d.fen().split(' '),old=c.fen().split(' ');fields[1]=old[1];fields[4]=old[4];fields[5]=old[5];return{...f,id:f.id+'-rotated',fen:fields.join(' '),move:map(f.move.slice(0,2))+map(f.move.slice(2,4))+f.move.slice(4)};}
const rotationSeeds=[cases[0],cases[4],cases[9],
 f('anastasia-rook-blocker',{h8:null,h7:'k',g7:'r',e7:'N',g3:'R'},'g3h3',['anastasia-mate']),
 f('boden-knight-blocker',{h8:null,c8:'k',d8:'r',d7:'n',b5:'B',f4:'B'},'b5a6',['boden-mate']),
 f('dovetail-knight-support',{h8:null,e6:'k',d6:'r',e7:'r',h5:'Q',h4:'N'},'h5f5',['dovetail-mate']),
 f('swallow-knight-support',{h8:null,e6:'k',d7:'r',f7:'r',h5:'Q',c4:'N'},'h5e5',['swallow-tail-mate']),
 f('opera-rook-blocker',{h8:null,e8:'k',f8:'b',f7:'r',d1:'R',g5:'B'},'d1d8',['opera-mate']),
 f('morphy-bishop-blocker',{c1:'B',g1:'R',h7:'b'},'c1b2',['morphy-mate']),
];
export const fixtures=[...cases.flatMap(f=>[f,horizontal(f)]),...rotationSeeds.flatMap(f=>{const r=rotate(f);return[r,horizontal(r)];})];

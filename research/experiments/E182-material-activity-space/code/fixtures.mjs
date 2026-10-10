import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const root={a1:'K',a4:'P',b4:'P',e2:'P',h4:'P',h8:'k',a8:'r',e8:'r',c7:'n',g7:'n',a6:'p',b5:'p',e6:'p',h5:'p',d3:'p'};
const fen=boardFen(root),base={id:'space-material-tradeoff',fen,history:{fen,moves:[]},move:'e2e4',materialAlternative:'e2d3',expected:true};
const change=(id,squares,extra={})=>{const c=new Chess(fen);for(const square of squares)c.remove(square);const next=c.fen();return {...base,id,fen:next,history:{fen:next,moves:[]},...extra};};
const white=[base,{...base,id:'no-added-space',move:'e2e3',expected:false},change('no-affected-unit',['c7','g7'],{expected:false}),change('one-affected-unit',['g7']),change('quiet-no-material-gain',['d3'],{materialAlternative:'e2e3',expected:false}),{...base,id:'missing-history',history:undefined,expected:false},{...base,id:'missing-alternative',materialAlternative:undefined,expected:false},{...base,id:'zero-budget',maxMaterialSpaceNodes:0,expected:false}];
const flip=m=>m[0]+(9-Number(m[1]))+m[2]+(9-Number(m[3]))+m.slice(4);
export const spaceFixtures=white.flatMap(f=>[{...f,id:f.id+'-w'},{...reflect(f),id:f.id+'-b',materialAlternative:f.materialAlternative===undefined?undefined:flip(f.materialAlternative)}]);

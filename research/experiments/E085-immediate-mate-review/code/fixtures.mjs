import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',h8:'k',...men}),move,expected});
export const fixtures=[
 {id:'missed-mate',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6h6',expected:['missed-immediate-mate-review']},
 {id:'played-mate',fen:'7k/8/5KQ1/8/8/8/8/8 w - - 0 1',move:'g6g7',expected:[],notExpected:['missed-immediate-mate-review']},
 f('quiet',{e2:'P'},'e2e4',[]),
  f('old-retained-refuted',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',e8:'r',b1:'R',b2:'P'},'b2b3',[]),
 f('retained-threat',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',e8:'r',b3:'R',a2:'P'},'a2a3',['immediate-mate-blunder-check','retained-mate-threat']),
  f('old-prevented-refuted',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',e8:'r',b1:'R',b2:'P'},'b1e1',['immediate-mate-blunder-check']),
 f('prevented-threat',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',e8:'r',b3:'R',a2:'P'},'b3e3',['prevented-immediate-mate']),
 f('capture',{b1:'R',b5:'n',a2:'P'},'b1b5',[]),
 f('underpromotion',{a7:'P',h7:'p',b8:'r'},'a7a8n',[]),
 {id:'ep',fen:'7k/8/8/3pP3/8/8/8/K7 w - d6 0 1',move:'e5d6',expected:[]},
];
export const bothColors=fixtures.filter(f=>f.id!=='ep').flatMap(f=>[f,reflect(f)]);
bothColors.push(fixtures.find(f=>f.id==='ep'));

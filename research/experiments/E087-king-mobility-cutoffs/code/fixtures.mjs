import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const f=(id,men,move,expected=[])=>({id,fen:boardFen({a1:'K',a2:'P',h8:'k',...men}),move,expected});
export const fixtures=[
 f('no-king-evasion',{b1:'K',a2:null,b2:'P',a1:'R',f6:'r',g7:'p',h7:'p'},'a1a8',['no-king-evasion']),
 f('rook-cutoff',{h8:null,e5:'k',b1:'R'},'b1d1',['current-king-cutoff','rook-ending-king-cutoff','causal-king-restriction']),
 f('queen-cutoff',{h8:null,e5:'k',b1:'Q'},'b1d1',['current-king-cutoff']),
 f('knight-restriction',{h8:null,f5:'k',b2:'N'},'b2d3',['causal-king-restriction']),
 {...f('blocked-ray',{h8:null,e5:'k',b1:'R',d3:'P'},'b1d1',['new-legal-king-step']),notExpected:['current-king-cutoff','causal-king-restriction']},
 f('unchanged-line',{h8:null,e5:'k',d1:'R'},'d1d2',[]),
  {id:'castle-already-denied',fen:'r3k2r/7p/8/8/8/8/P7/K4R2 w kq - 0 1',move:'f1f7',expected:[],notExpected:['causal-castling-prevention']},
 {id:'castle-prevented',fen:'r3k2r/7p/8/8/8/8/P7/KR6 w kq - 0 1',move:'b1f1',expected:['causal-castling-prevention']},
 {id:'no-rights',fen:'r3k2r/7p/8/8/8/8/P7/K4R2 w - - 0 1',move:'f1f7',expected:[],notExpected:['causal-castling-prevention']},
 f('escape-step',{a1:null,g1:'K',f2:'P',g2:'P',h2:'P',b1:'R'},'g2g3',['new-legal-king-step']),
 {...f('ordinary',{b1:'R'},'a2a3',['new-legal-king-step']),notExpected:['current-king-cutoff','causal-king-restriction']},
];
export const bothColors=fixtures.filter(f=>!f.id.startsWith('castle')).flatMap(f=>[f,reflect(f)]);
for(const original of fixtures.filter(f=>f.id.startsWith('castle'))){
 bothColors.push(original);const mirrored=reflect({...original,fen:original.fen.replace(' kq ',' - ')});
 mirrored.fen=mirrored.fen.replace(' - - ',' KQ - ');bothColors.push(mirrored);
}

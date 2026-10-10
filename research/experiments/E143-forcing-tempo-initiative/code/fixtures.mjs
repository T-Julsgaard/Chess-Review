import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const pieces={g1:'K',g5:'Q',f7:'B',g4:'N',d4:'P',g2:'P',h2:'P',h8:'k',d2:'q',h7:'r'},fen=boardFen(pieces),f={id:'authored-forcing-check',fen,history:{fen,moves:[]},move:'g5d8',forcingTempoTags:true,forcingTempoPlies:2,scanReplies:false,expected:['forcing-tempo-window','tactical-initiative']};
const noCounter={...pieces};delete noCounter.d2;const other=boardFen(noCounter);
export const fixtures=[f,{...f,id:'quiet-actual',move:'g5h5',expected:[]},{...f,id:'short-bound',forcingTempoPlies:1,expected:[]},{...f,id:'missing-history',history:undefined,expected:[]},{...f,id:'zero-budget',maxForcingTempoNodes:0,expected:[]},{...f,id:'no-counterattack',fen:other,history:{fen:other,moves:[]},expected:[]}].flatMap(x=>[x,reflect(x)]);

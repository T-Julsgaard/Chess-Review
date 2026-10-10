import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const fen=boardFen({h1:'K',a1:'R',f1:'R',h7:'k',a7:'p'}),white={id:'valid-rook-comparison-is-not-minor-quality',fen,history:{fen,moves:[]},move:'a1a4',objectiveTarget:'a7',objectiveUnits:['a1','f1'],pieceObjectiveTags:true,scanReplies:false};
export const controls=[white,{...reflect(white),objectiveTarget:'a2',objectiveUnits:['a8','f8']}];

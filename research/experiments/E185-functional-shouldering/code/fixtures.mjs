import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
const fen=boardFen({c5:'K',e6:'P',b8:'k'}),w={id:'shoulder',input:{fen,move:'c5c6',history:{fen,moves:[]}},options:{enabled:true,alternative:'c5b5',plies:6},expected:['C0622','C0639']};
const mirrored=reflect({id:w.id,...w.input}),alt=reflect({id:'alt',fen,move:w.options.alternative}),c=legalPosition(mirrored.history.fen);for(const code of mirrored.history.moves)c.move(code);
export const roots=[w,{id:mirrored.id,input:{fen:c.fen(),move:mirrored.move,history:mirrored.history},options:{...w.options,alternative:alt.move},expected:w.expected}];

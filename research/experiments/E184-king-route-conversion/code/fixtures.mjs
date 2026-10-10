import {legalPosition} from '../../E020-coach-concepts/code/concepts.mjs';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const shoulderFen=boardFen({c5:'K',e6:'P',a7:'k'}),outStart=boardFen({e6:'K',f6:'P',e8:'k'},'b'),c=legalPosition(outStart);c.move('e8d8');
const white=[{id:'shouldering',input:{fen:shoulderFen,move:'c5c6',history:{fen:shoulderFen,moves:[]}},options:{enabled:true,alternative:'c5b5',plies:6},expected:['C0622','C0639']},{id:'outflanking',input:{fen:c.fen(),move:'e6f7',history:{fen:outStart,moves:['e8d8']}},options:{enabled:true,alternative:'e6e5',plies:6},expected:['C0623','C0638']}];
export const roots=white.flatMap(r=>{
 const f=reflect({id:r.id,...r.input}),h=legalPosition(f.history.fen);for(const m of f.history.moves)h.move(m);
 const alt=reflect({id:'alt',fen:r.input.fen,move:r.options.alternative});
 return[r,{id:f.id,input:{fen:h.fen(),move:f.move,history:f.history},options:{...r.options,alternative:alt.move},expected:r.expected}];
});

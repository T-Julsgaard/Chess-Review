import {Chess} from '../../../../lib/chess.js';
import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
const make=(id,extra={},more={})=>{const fen=boardFen({h8:'K',a1:'R',f1:'B',e1:'N',f6:'P',h1:'k',a7:'r',b5:'n',f7:'p',...extra}),moves=['a1a7','b5a7'],c=new Chess(fen);for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen,moves},move:'f1c4',pieceObjectiveTags:true,objectiveTarget:'f7',objectiveUnits:['f1','e1'],scanReplies:false,expected:['relative-piece-objective-effectiveness'],...more};};
export const fixtures=[make('bishop-objective'),make('independent-defender',{e8:'b'},{expected:[]}),make('both-cover',{g5:'N'},{objectiveUnits:['f1','g5'],expected:[]}),make('missing-objective',{}, {objectiveTarget:undefined,expected:[]}),make('missing-history',{}, {history:undefined,expected:[]}),make('zero-budget',{}, {maxPieceObjectiveNodes:0,expected:[]})].flatMap(f=>[f,reflect({...f,objectiveTarget:undefined,objectiveUnits:undefined})]).map((f,i)=>i%2?{...f,objectiveTarget:fixturesTarget(i),objectiveUnits:fixturesUnits(i)}:f);
function fixturesTarget(i){return i===7?undefined:'f2';}
function fixturesUnits(i){return i===5?['f8','g4']:['f8','e8'];}

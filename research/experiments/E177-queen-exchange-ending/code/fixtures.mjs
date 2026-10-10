import {Chess} from '../../../../lib/chess.js';import {boardFen,reflect,flip} from '../../FRIEND-shared/lib.mjs';
const ids=['prepared-certified-rook-ending','prevented-profitable-capture-counterplay'],pieces={g6:'K',f7:'Q',a1:'R',h8:'k',g8:'q'};
function make(id,extra={},controls={}){const fen=boardFen({...pieces,...extra});return{id,fen,history:{fen,moves:[]},move:'f7g8',endingAlternative:'f7g7',endingPreparationTags:true,scanReplies:false,expected:ids,...controls};}
const base=make('queen-exchange-winning-ending');
const clock=new Chess(base.fen);const fields=clock.fen().split(' ');fields[4]='99';
export const white=[base,make('ending-only-no-profitable-alternative',{}, {endingAlternative:'g6f6',expected:ids.slice(0,1)}),make('rook-capturable-on-mating-rank',{a1:undefined,f1:'R'},{expected:[]}),make('immediate-mate-is-not-ending',{a1:undefined,g7:'R'},{endingAlternative:'f7f6',expected:[]}),{...base,id:'short-bound',endingMatePlies:0,expected:[]},{...base,id:'missing-history',history:undefined,expected:[]},{...base,id:'missing-alternative',endingAlternative:undefined,expected:[]},{...base,id:'zero-budget',maxEndingPreparationNodes:0,expected:[]},make('unsupported-extra-minor',{b8:'n'},{expected:[]}),{...base,id:'quiet-alternative-fifty-claim',fen:fields.join(' '),history:{fen:fields.join(' '),moves:[]},expected:[]}];
const move=m=>flip(m.slice(0,2))+flip(m.slice(2,4))+m.slice(4);
export const fixtures=white.flatMap(f=>{const r={...reflect(f),endingAlternative:f.endingAlternative&&move(f.endingAlternative)};if(r.history){const c=new Chess(r.history.fen);for(const m of r.history.moves)c.move(m);r.fen=c.fen();}return[f,r];});
const prefixStart=boardFen({f6:'K',f7:'Q',a1:'R',h8:'k',b8:'q'}),prefixMoves=['f6g6','b8g8'],prefixBoard=new Chess(prefixStart);for(const m of prefixMoves)prefixBoard.move(m);
export const prefixControl={...base,id:'genuine-two-ply-prefix',fen:prefixBoard.fen(),history:{fen:prefixStart,moves:prefixMoves}};

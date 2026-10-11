import {fixtures} from './fixtures.mjs';
import {fixtures as old} from '../../E120-mating-move-order/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
const f=fixtures[0],parts=f.input.fen.split(' ');parts[4]='98';const fen=parts.join(' '),historical=old[30],c=new Chess(fixtures[1].input.fen);c.put({type:'q',color:'b'},'h7');const q=c.fen();
export const focusFixtures=[{id:'visited-fifty',input:{...f.input,fen,history:{fen,moves:[]}},options:f.options,expected:[],status:'claim-rule-prerequisite'},{id:'genuine-prefix',input:{fen:historical.fen,move:historical.move,followup:historical.orderFollowup,history:historical.history},options:f.options,expected:['C0768','C0776']},{id:'captures-are-refutable',input:{...fixtures[1].input,fen:q,history:{fen:q,moves:[]}},options:f.options,expected:[]}];

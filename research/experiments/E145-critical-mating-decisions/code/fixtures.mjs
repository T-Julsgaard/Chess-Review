import {Chess} from '../../../../lib/chess.js';
import {reflect} from '../../FRIEND-shared/lib.mjs';
import {fixtures as inherited} from '../../E143-forcing-tempo-initiative/code/fixtures.mjs';
const old=inherited[0],base={...old,id:'critical-current-position',move:'g5g8',forcingTempoTags:false,criticalDecisionTags:true,criticalDecisionPlies:1,expected:['critical-mating-position']};
const c=new Chess(base.fen);c.remove('g5');c.put({type:'q',color:'w'},'h5');c.remove('d2');c.put({type:'q',color:'b'},'h4');c.put({type:'p',color:'w'},'f5');const start=c.fen(),moves=['h5g5','h4g3'];for(const m of moves)c.move(m);
const moment={...base,id:'recorded-mating-reversal',fen:c.fen(),history:{fen:start,moves},expected:['critical-mating-position','critical-mating-reversal']};
const n=new Chess(base.fen);n.remove('d2');const neutral={...base,id:'no-enemy-mating-stakes',fen:n.fen(),history:{fen:n.fen(),moves:[]},expected:[]};
export const fixtures=[base,moment,{...base,id:'zero-continuation-bound',criticalDecisionPlies:0,expected:[]},neutral,{...base,id:'missing-history',history:undefined,expected:[]},{...base,id:'zero-budget',maxCriticalDecisionNodes:0,expected:[]}].flatMap(x=>[x,reflect(x)]).map(f=>{if(f.history?.moves.length){const c=new Chess(f.history.fen);for(const m of f.history.moves)c.move(m);return{...f,fen:c.fen()};}return f;});

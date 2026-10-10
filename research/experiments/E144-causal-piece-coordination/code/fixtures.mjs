import {Chess} from '../../../../lib/chess.js';
import {reflect} from '../../FRIEND-shared/lib.mjs';
import {fixtures as inherited} from '../../E143-forcing-tempo-initiative/code/fixtures.mjs';
const old=inherited[0],base={...old,id:'authored-coordination',forcingTempoTags:false,coordinationTags:true,coordinationPlies:2,expected:['cooperating-mating-core','placement-dependent-piece-quality']};
const r=new Chess(base.fen);r.put({type:'r',color:'w'},'a2');const rook={...base,id:'redundant-rook-comparison',fen:r.fen(),history:{fen:r.fen(),moves:[]},expected:['cooperating-mating-core','placement-dependent-piece-quality','nominal-versus-role']};
const n=new Chess(base.fen);n.remove('g4');const without={...base,id:'absent-necessary-knight',fen:n.fen(),history:{fen:n.fen(),moves:[]},expected:[]};
export const fixtures=[base,rook,without,{...base,id:'short-bound',coordinationPlies:0,expected:[]},{...base,id:'missing-history',history:undefined,expected:[]},{...base,id:'zero-budget',maxCoordinationNodes:0,expected:[]}].flatMap(x=>[x,reflect(x)]);

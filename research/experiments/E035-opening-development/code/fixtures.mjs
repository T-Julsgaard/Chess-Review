import {Chess} from '../../../../lib/chess.js';export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,moves,move,expected=[],absent=[])=>{const c=new Chess(),start=c.fen();for(const m of moves)c.move(m);return{id,fen:c.fen(),history:{fen:start,moves},move,expected,absent,note:'Authored synthetic opening sequence: '+id};};
export const fixtures=[
 f('first-knight',[],'g1f3',['minor-development']),
 f('first-bishop',['e2e4','a7a6'],'f1c4',['minor-development']),
 f('bishop-develops-with-check',['e2e4','d7d6'],'f1b5',['minor-development','development-check']),
 f('repeat-knight',['g1f3','a7a6'],'f3g5',['repeated-opening-piece'],['minor-development']),
 f('early-queen',['e2e4','a7a6'],'d1h5',['early-queen-move']),
 f('queen-after-two-minors',['e2e4','a7a6','g1f3','a6a5','f1c4','b7b6'],'d1e2',[],['early-queen-move']),
 f('four-developed',['g1f3','a7a6','b1c3','a6a5','e2e4','b7b6','f1c4','b6b5','d2d3','c7c6'],'c1e3',['minor-development','minor-development-complete']),
 f('pawn-is-not-minor',[],'e2e4',[],['minor-development','early-queen-move']),
 f('return-home',['g1f3','a7a6'],'f3g1',['repeated-opening-piece'],['minor-development']),
 f('queen-second-move',['e2e4','a7a6','d1h5','a6a5'],'h5e2',[],['early-queen-move']),
 f('captured-minor-does-not-count',['e2e4','d7d5','b1c3','d5d4','c3b5','d4d3','f1d3','d8d3'],'d1e2',['early-queen-move']),
 f('past-opening-window',['a2a3','a7a6','a3a4','a6a5','b2b3','b7b6','b3b4','b6b5','c2c3','c7c6','c3c4','c6c5','d2d3','d7d6','d3d4','d6d5','e2e3','e7e6','e3e4','e6e5'],'g1f3',[],['minor-development']),
];
const unknown=f('fen-without-history',[],'g1f3',[],['minor-development']);delete unknown.history;fixtures.push(unknown);
const partial=f('partial-start',['e2e4','a7a6'],'g1f3',[],['minor-development']);partial.history={fen:partial.fen,moves:[]};fixtures.push(partial);

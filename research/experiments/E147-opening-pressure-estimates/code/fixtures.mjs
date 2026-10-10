import {Chess} from '../../../../lib/chess.js';
const f=(id,moves,move,mode)=>{const c=new Chess();for(const code of moves)c.move(code);return{id,fen:c.fen(),history:{fen:new Chess().fen(),moves},move,mode,openingJudgmentTags:true,scanReplies:false};};
export const fixtures=[
 f('white-quiet-mate-pressure',['e2e4','e7e5','f1c4','b8c6'],'d1h5','pressure'),
 f('black-quiet-mate-pressure',['a2a3','e7e5','e2e4','f8c5','b1c3'],'d8h4','pressure'),
 f('black-e5-equalization-hypothesis',['e2e4'],'e7e5','engine'),
 f('italian-Bc5-equalization-hypothesis',['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6','d2d3'],'f8c5','engine'),
 f('white-Damiano-edge-hypothesis',['e2e4','e7e5','g1f3','f7f6'],'f3e5','engine'),
 f('black-queen-capture-edge-hypothesis',['e2e4','e7e5','d1h5','b8c6','h5e5'],'c6e5','engine'),
 f('exposed-initial-control',[],'e2e4','engine'),
 f('exposed-Italian-control',['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6'],'d2d3','engine'),
 {...f('missing-history',[],'e2e4','none'),history:undefined},
 f('missing-observations',[],'e2e4','none'),
 {...f('zero-pressure-budget',['e2e4','e7e5','f1c4','b8c6'],'d1h5','pressure'),maxOpeningPressureNodes:0},
 {...f('zero-engine-budget',['e2e4'],'e7e5','engine'),maxOpeningEngineSearches:0},
];

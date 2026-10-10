import {Chess} from '../../../../lib/chess.js';
const start=new Chess().fen(),make=(id,moves,move)=>{const c=new Chess();for(const m of moves)c.move(m);return {id,fen:c.fen(),move,history:{fen:start,moves},enginePanelTags:true,scanReplies:false};};
export const fixtures=[make('initial-position',[],'e2e4'),make('authored-opening',['e2e4','e7e5','g1f3','b8c6','f1c4','g8f6'],'d2d3')];

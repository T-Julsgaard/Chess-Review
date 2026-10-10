import {boardFen,reflect} from '../../FRIEND-shared/lib.mjs';
function fixture(id,pieces,move,extra={}){const fen=boardFen(pieces);return{id,fen,history:{fen,moves:[]},move,...extra};}
const positive=fixture('quiet-full-two-plies',{b1:'K',a2:'P',h8:'k',h7:'p'},'b1c1');
const clockFen=positive.fen.replace(' 0 1',' 99 1');
export const quietFixtures=[positive,
  fixture('latent-second-ply-check',{b1:'K',a2:'P',b5:'k',h7:'p'},'b1c1'),
  fixture('immediate-capture',{h1:'K',a2:'P',b2:'k',h7:'p'},'h1g1'),
  fixture('later-promotion',{b1:'K',a7:'P',h8:'k',h7:'p'},'b1c1'),
  fixture('after-terminal-draw',{c1:'K',d2:'p',h8:'k'},'c1d2'),
  {...positive,id:'after-fifty-claim',fen:clockFen,history:{fen:clockFen,moves:[]}},
  {...positive,id:'short-horizon',quietPlies:0},
  {...positive,id:'missing-history',history:undefined},
  {...positive,id:'zero-budget',maxQuietNodes:0},
].flatMap(f=>[f,reflect(f)]);
export const treeKey=f=>({fen:f.fen,history:f.history,move:f.move,plies:f.quietPlies??2});

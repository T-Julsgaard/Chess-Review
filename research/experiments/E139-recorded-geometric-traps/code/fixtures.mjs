import {Chess} from '../../../../lib/chess.js';
import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {reflect} from '../../E024-transitions/code/fixtures.mjs';
export {reflect};
const initial=setup({h2:null,h8:null,g8:'k',b5:'N',d5:'N',a8:'q',a7:'p',b7:'p',b8:'b'});
function history(id,start,moves,move,expected=[]){const c=new Chess(start);for(const m of moves)c.move(m);return {id,fen:c.fen(),move,history:{fen:start,moves},recordedTrapTags:true,scanReplies:false,expected};}
const ids=['recorded-trapping-combination','necessary-knight-trap-geometry'];
export const positive=history('recorded-dual-knight-trap',initial,['d5b6','g8h8'],'b5c7',ids);
const mirror=f=>({...reflect(f),id:f.id+'-black'});
export const reflectMove=m=>m[0]+(9-Number(m[1]))+m[2]+(9-Number(m[3]))+(m[4]||'');
export const fixtures=[positive,mirror(positive),{...positive,id:'missing-history',history:undefined,expected:[]},
 history('unrelated-preparation',setup({h2:null,h8:null,g8:'k',b5:'N',b6:'N',d1:'N',a8:'q',a7:'p',b7:'p',b8:'b'}),['d1f2','g8h8'],'b5c7'),
 history('same-knight-moved-twice',setup({h2:null,h8:null,g8:'k',a3:'N',b6:'N',a8:'q',a7:'p',b7:'p',b8:'b'}),['a3b5','g8h8'],'b5c7'),
 history('queen-escape-after-one-attacker-capture',setup({h2:null,h8:null,g8:'k',b5:'N',d5:'N',a8:'q',b8:'r'}),['d5b6','g8h8'],'b5c7'),
 history('countermate-refutes-combination',setup({a1:null,h1:'K',h2:'P',g2:'P',g1:'N',h8:null,g8:'k',b5:'N',d5:'N',a8:'q',a7:'p',b7:'p',b8:'b',h4:'q'}),['d5b6','g8h8'],'b5c7'),
 {...positive,id:'zero-budget',maxRecordedTrapNodes:0,expected:[]},
 {...positive,id:'exact-observed-budget',maxRecordedTrapNodes:455,expected:ids},
 {...positive,id:'one-below-observed-budget',maxRecordedTrapNodes:454,expected:[]},
 {...positive,id:'mismatched-history',history:{...positive.history,moves:['d5b6']},expected:[],inputError:'Invalid history: final FEN does not match input'}];

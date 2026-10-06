import {setup} from '../../E021-structural-concepts/code/fixtures.mjs';
import {Chess} from '../../../../lib/chess.js';
export {reflect} from '../../E024-transitions/code/fixtures.mjs';
const f=(id,extra,move,expected=[],absent=[])=>({id,fen:setup({a7:null,h2:null,...extra}),move,expected,absent,note:id.replaceAll('-',' ')});
export const fixtures=[
 f('relative-knight-pin',{e1:'R',d5:'n',d8:'q'},'e1d1',['relative-pin']),
 f('queen-recapture-zero',{e1:'Q',d5:'n',d8:'q',b8:'r'},'e1d1',[],['relative-pin']),
 f('rook-target-outside-subset',{e1:'R',d5:'n',d8:'r'},'e1d1',[],['relative-pin']),
 f('equal-queen-blocker',{e1:'R',d5:'q',d8:'q'},'e1d1',[],['relative-pin']),
 f('old-pin',{d1:'R',d5:'n',d8:'q'},'d1d2',[],['relative-pin']),
 f('cross-pin',{a1:null,a8:'K',h8:null,e8:'k',e1:'R',c1:'B',e5:'r',g7:'q'},'c1b2',['relative-pin','cross-pin']),
 f('cross-countercheck',{h8:null,e8:'k',e1:'R',c1:'B',e5:'r',g7:'q'},'c1b2',[],['relative-pin','cross-pin']),
 f('royal-defender-removal',{h2:'P',h8:null,e8:'k',f7:'q',f5:'N',d6:'n'},'f5d6',['certified-removal']),
 f('target-can-escape',{c1:'Q',c4:'b',e6:'r'},'c1c4',['removal-defender'],['certified-removal']),
 f('no-supported-target',{b5:'P',c6:'p',e7:'q'},'b5c6',[],['certified-removal']),
 f('no-legal-offline-moves',{h8:null,e6:'k',b3:'B',c1:'R',d5:'n',d8:'q'},'c1d1',[],['relative-pin','cross-pin']),
 f('rook-blocker-countercheck',{e1:'R',d5:'r',d8:'q'},'e1d1',[],['relative-pin']),
 f('removal-draw-counterreply',{h8:null,e8:'k',f7:'q',f5:'N',d6:'n'},'f5d6',[],['certified-removal']),
 f('removal-countermate',{a2:'P',b2:'P',h8:'r',e8:'k',f7:'q',f5:'N',d6:'n'},'f5d6',[],['certified-removal']),
 f('pin-draw-clock',{e1:'R',d5:'n',d8:'q'},'e1d1',[],[]),
];
fixtures.at(-1).fen=fixtures.at(-1).fen.replace(' 0 1',' 99 1');
fixtures.at(-1).absent=['relative-pin'];
const repetitionStart=setup({a7:null,h2:null,d1:'R',d5:'n',d8:'q'},'b'),repetitionMoves=['h8h7','d1e1','h7h8','e1d1','h8h7','d1e1','h7h8'],repetition=new Chess(repetitionStart);for(const code of repetitionMoves)repetition.move(code);
fixtures.push({id:'known-history-repetition',fen:repetition.fen(),move:'e1d1',history:{fen:repetitionStart,moves:repetitionMoves},expected:[],absent:['relative-pin','cross-pin','certified-removal'],note:'Known repetition prevents a new finite claim; inherited FEN-only events are unchanged.'});
